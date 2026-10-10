// Usage: node native/prepare.mjs <devin|claude|muse> <built pages site dir>
// Creates native/work/<app>/ with www/ (the web app), src-tauri/ (desktop) and capacitor.config.json (mobile).
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APPS = {
  devin: { maker: 'Devin' },
  claude: { maker: 'Claude' },
  muse: { maker: 'Muse' }
};
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
const { maker } = APPS[app];
const work = join(here, 'work', app);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
cpSync(src, join(work, 'www'), { recursive: true });
cpSync(join(here, 'tauri', 'src-tauri'), join(work, 'src-tauri'), { recursive: true });

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
    security: { csp: null }
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
