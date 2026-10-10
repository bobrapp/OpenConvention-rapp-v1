// Usage: node native/prepare.mjs <devin|claude|muse> <built pages site dir>
// Creates native/work/<app>/ with www/ (the web app), src-tauri/ (desktop) and capacitor.config.json (mobile).
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APPS = {
  devin: { maker: 'Devin' },
  claude: { maker: 'Claude' },
  muse: { maker: 'Muse' }
};
const DEFAULT_SHARE_BASE = 'https://bobrapp.github.io/OpenConvention-rapp-v1/';
const BASE_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: mediastream:",
  "connect-src 'self' ipc: http://ipc.localhost https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
];
const [app, siteArg] = process.argv.slice(2);
if (!APPS[app] || !siteArg) {
  console.error('usage: node native/prepare.mjs <devin|claude|muse> <site dir>');
  process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(siteArg);
const src = join(site, app);
if (!existsSync(join(src, 'index.html'))) {
  console.error(`no ${app}/index.html in ${site}`);
  process.exit(1);
}
let versions = [];
try { versions = JSON.parse(readFileSync(join(site, 'versions.json'), 'utf8')); } catch {}
const version = Array.isArray(versions) ? versions.find((entry) => entry?.path === `${app}/`) : null;
if (!version || version.live !== true) {
  console.error(`${app} is not live in versions.json (branch missing?) — refusing to package a placeholder`);
  process.exit(1);
}
const extraConnectOrigins = [];
for (const rawOrigin of (process.env.R4_CONNECT_SRC || '').trim().split(/\s+/).filter(Boolean)) {
  let origin;
  try { origin = new URL(rawOrigin); } catch {}
  if (!origin || origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    console.error(`invalid R4_CONNECT_SRC origin "${rawOrigin}" (expected an https:// origin)`);
    process.exit(1);
  }
  extraConnectOrigins.push(origin.origin, origin.origin.replace(/^https:/, 'wss:'));
}
const { maker } = APPS[app];
const work = join(here, 'work', app);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
cpSync(src, join(work, 'www'), { recursive: true });
cpSync(join(here, 'tauri', 'src-tauri'), join(work, 'src-tauri'), { recursive: true });

const indexPath = join(work, 'www', 'index.html');
let html = readFileSync(indexPath, 'utf8');
const qrcodeCdn = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
if (app === 'claude' && html.includes(qrcodeCdn)) {
  const qrcodeSource = join(here, '..', 'vendor', 'qrcode.js');
  if (!existsSync(qrcodeSource)) {
    console.error('missing bundled QR code library required by Claude');
    process.exit(1);
  }
  const qrcodeTarget = join(work, 'www', 'vendor', 'qrcode.js');
  mkdirSync(dirname(qrcodeTarget), { recursive: true });
  cpSync(qrcodeSource, qrcodeTarget);
  html = html.replaceAll(qrcodeCdn, 'vendor/qrcode.js');
}
const shareRoot = process.env.R4_SHARE_BASE?.trim() || DEFAULT_SHARE_BASE;
const shareBase = `${shareRoot.replace(/\/+$/, '')}/${app}/`;
const escapeAttribute = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const headTag = /<head\b[^>]*>/i.exec(html)?.[0];
if (!headTag) {
  console.error(`no <head> in ${app}/index.html`);
  process.exit(1);
}
html = html.replace(headTag, (tag) => `${tag}\n<meta name="r4-share-base" content="${escapeAttribute(shareBase)}">`);
writeFileSync(indexPath, html);
const scriptHashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  .filter(([, attributes, source]) => !/\bsrc\s*=/i.test(attributes) && source.trim())
  .map(([, , source]) => `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`);
const scriptDirective = `script-src 'self'${scriptHashes.length ? ` ${scriptHashes.join(' ')}` : ''}`;
const configPath = join(work, 'www', 'config.js');
if (existsSync(configPath)) {
  const config = readFileSync(configPath, 'utf8');
  const configuredUrl = /\bsupabaseUrl\s*:\s*(['"])(.*?)\1/.exec(config)?.[2]?.trim();
  if (configuredUrl) {
    let supabaseUrl;
    try { supabaseUrl = new URL(configuredUrl); } catch {}
    if (!supabaseUrl || supabaseUrl.protocol !== 'https:') {
      console.error(`${app} config.js supabaseUrl must use an https:// URL for native CSP`);
      process.exit(1);
    }
    extraConnectOrigins.push(supabaseUrl.origin, supabaseUrl.origin.replace(/^https:/, 'wss:'));
  }
}
const connectSources = [
  "'self'",
  'ipc:',
  'http://ipc.localhost',
  'https://*.supabase.co',
  'wss://*.supabase.co',
  ...extraConnectOrigins
];
const connectDirective = `connect-src ${[...new Set(connectSources)].join(' ')}`;
const csp = BASE_CSP.map((directive) => {
  if (directive === "script-src 'self'") return scriptDirective;
  if (directive.startsWith('connect-src ')) return connectDirective;
  return directive;
}).join('; ');

const name = `r4 ${maker}`;
const id = `org.aigovops.r4.${app}`;
const copyright = '© 2026 AiGovOps Foundation · www.aigovops-foundation.com';
writeFileSync(join(work, 'src-tauri', 'tauri.conf.json'), JSON.stringify({
  $schema: 'https://schema.tauri.app/config/2',
  productName: name,
  mainBinaryName: `r4-${app}`,
  version: '1.0.0',
  identifier: id,
  build: { frontendDist: '../www' },
  app: {
    windows: [{ title: `r4 networking · ${maker}`, width: 430, height: 900, minWidth: 360, minHeight: 600, resizable: true }],
    security: { csp }
  },
  bundle: {
    active: true,
    targets: 'all',
    publisher: 'AiGovOps Foundation',
    copyright,
    category: 'Business',
    shortDescription: `r4 conference networking companion, built by ${maker}`,
    icon: ['icons/32x32.png', 'icons/128x128.png', 'icons/128x128@2x.png', 'icons/icon.icns', 'icons/icon.ico']
  }
}, null, 2));
writeFileSync(join(work, 'capacitor.config.json'), JSON.stringify({ appId: id, appName: name, webDir: 'www' }, null, 2));
writeFileSync(join(work, 'package.json'), JSON.stringify({ name: `r4-${app}-native`, version: '1.0.0', private: true }, null, 2));
console.log(`prepared ${work}`);
