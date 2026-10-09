import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'icons/icon.svg'), 'utf8');
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
const render = async (svg, size, name) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;width:100%;height:100%}svg{display:block;width:100%;height:100%}</style>${svg}`);
  await page.screenshot({ path: path.join(root, 'icons', name) });
};

await render(source, 192, 'icon-192.png');
await render(source, 512, 'icon-512.png');
await render(source.replace('rx="92"', 'rx="0"'), 512, 'maskable-512.png');
await render(source, 180, 'apple-touch-icon.png');
await browser.close();
