import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox']
});

try {
  for (const app of ['devin', 'claude', 'muse']) {
    const work = join(repo, 'native', 'work', app);
    const root = join(work, 'www');
    const config = JSON.parse(readFileSync(join(work, 'src-tauri', 'tauri.conf.json'), 'utf8'));
    const nativeCsp = config.app.security.csp;
    const csp = nativeCsp.replace(' ipc: http://ipc.localhost', '');
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const expectedScriptHashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
      .filter(([, attributes, source]) => !/\bsrc\s*=/i.test(attributes) && source.trim())
      .map(([, , source]) => `'sha256-${createHash('sha256').update(source.replace(/\r\n?/g, '\n'), 'utf8').digest('base64')}'`);
    const scriptDirective = nativeCsp.split(';').map((directive) => directive.trim()).find((directive) => directive.startsWith('script-src '));
    assert.equal(scriptDirective, `script-src 'self'${expectedScriptHashes.length ? ` ${expectedScriptHashes.join(' ')}` : ''}`, `${app} script hashes must match the packaged HTML`);
    assert.ok(!scriptDirective.includes('unsafe-inline'), `${app} must not use unsafe-inline`);
    console.log(`${app} script-src: ${scriptDirective}`);
    const connectDirective = nativeCsp.split(';').map((directive) => directive.trim()).find((directive) => directive.startsWith('connect-src '));
    const connectSources = new Set(connectDirective.slice('connect-src '.length).split(/\s+/));
    const expectedConnectSources = [];
    const addOriginPair = (value) => {
      const origin = new URL(value);
      assert.equal(origin.protocol, 'https:', `${app} extra connect source must use https://`);
      expectedConnectSources.push(origin.origin, origin.origin.replace(/^https:/, 'wss:'));
    };
    const configPath = join(root, 'config.js');
    if (existsSync(configPath)) {
      const configSource = readFileSync(configPath, 'utf8');
      const configuredUrl = /\bsupabaseUrl\s*:\s*(['"])(.*?)\1/.exec(configSource)?.[2]?.trim();
      if (configuredUrl) addOriginPair(configuredUrl);
    }
    for (const value of (process.env.R4_CONNECT_SRC || '').trim().split(/\s+/).filter(Boolean)) addOriginPair(value);
    for (const source of expectedConnectSources) {
      assert.ok(connectSources.has(source), `${app} connect-src is missing ${source}`);
    }
    const server = createServer((request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        let filePath = resolve(root, `.${pathname}`);
        if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
          response.writeHead(403);
          response.end();
          return;
        }
        if (pathname === '/favicon.ico') {
          response.writeHead(204, { 'Content-Security-Policy': csp });
          response.end();
          return;
        }
        if (statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html');
        response.writeHead(200, {
          'Content-Security-Policy': csp,
          'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream'
        });
        response.end(readFileSync(filePath));
      } catch {
        response.writeHead(404, { 'Content-Security-Policy': csp });
        response.end();
      }
    });
    await new Promise((resolveListen, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolveListen);
    });
    const port = server.address().port;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    try {
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const failedResponses = [];
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('response', (resource) => {
        if (resource.status() >= 400) failedResponses.push(`${resource.status()} ${resource.url()}`);
      });
      await page.addInitScript(() => {
        window.__nativeCspViolations = [];
        document.addEventListener('securitypolicyviolation', (event) => {
          window.__nativeCspViolations.push({
            blockedURI: event.blockedURI,
            violatedDirective: event.violatedDirective
          });
        });
      });
      const response = await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
      assert.equal(response?.status(), 200, `${app} index should load`);
      if (app === 'devin') {
        await page.waitForSelector('#sheet-root .sheet');
        await page.locator('input[name="give"]').fill('facilitation');
        await page.locator('input[name="ask"]').fill('AI adoption');
        await page.locator('[data-form="charter"] button[type="submit"], [data-form="charter"] button').click();
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('r4-networking-v2') || '{}').backstage?.onboarded);
      }
      await page.locator('.tab[data-tab]').first().waitFor();
      const tabs = await page.locator('.tab[data-tab]').evaluateAll((buttons) => [...new Set(buttons.map((button) => button.dataset.tab).filter(Boolean))]);
      assert.ok(tabs.length, `${app} should render main tabs`);
      const dismissAlert = async () => {
        const alert = page.locator('.alert-pop[data-action="alert-close-bg"]');
        const close = alert.locator('[data-action="alert-close"]');
        if (await close.count()) await close.click();
        else if (await alert.count()) await alert.evaluate((element) => element.click());
        if (await alert.count()) await alert.waitFor({ state: 'detached', timeout: 1000 });
      };
      for (const tab of tabs) {
        await dismissAlert();
        const tabButton = page.locator(`.tab[data-tab="${tab}"]`).first();
        try {
          await tabButton.click({ timeout: 1000 });
        } catch (error) {
          if (!await page.locator('.alert-pop').count()) throw error;
          await dismissAlert();
          await tabButton.click();
        }
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(250);
      const violations = await page.evaluate(() => window.__nativeCspViolations);
      console.log(`${app} CSP ok at 390px: ${tabs.join(', ')}`);
      assert.deepEqual(violations, [], `${app} CSP violations: ${JSON.stringify(violations)}`);
      assert.deepEqual(consoleErrors, [], `${app} console errors: ${JSON.stringify(consoleErrors)}`);
      assert.deepEqual(pageErrors, [], `${app} page errors: ${JSON.stringify(pageErrors)}`);
      assert.deepEqual(failedResponses, [], `${app} failed responses: ${JSON.stringify(failedResponses)}`);
    } finally {
      await context.close();
      await new Promise((resolveClose) => server.close(resolveClose));
    }
  }
} finally {
  await browser.close();
}
