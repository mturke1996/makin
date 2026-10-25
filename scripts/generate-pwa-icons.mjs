/**
 * Generates the PNG icons Android / iOS need for installing the PWA.
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * Renders public/brand/apple-touch-icon.svg (full-bleed mark) with Playwright's
 * Chromium. Requires Playwright (`npm i -D playwright` or a global install).
 * Re-run after changing the brand icon.
 */
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'pwa');
mkdirSync(out, { recursive: true });

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'playwright')));
}

const fullBleed = readFileSync(path.join(root, 'public', 'brand', 'apple-touch-icon.svg'), 'utf8')
  .replace(/<\?xml[^>]*>/, '')
  .replace(/width="\d+"\s+height="\d+"/, 'width="100%" height="100%"');

/** mode: any = rounded tile on transparent; maskable/apple = full-bleed; mono = white glyph. */
function page(size, mode) {
  const inner =
    mode === 'any'
      ? `<div style="width:100%;height:100%;border-radius:22%;overflow:hidden">${fullBleed}</div>`
      : mode === 'maskable'
        ? // Android masks to a circle/squircle: keep the mark inside the 80% safe zone.
          `<div style="width:100%;height:100%;position:relative;background:#1A2B58">
             <div style="position:absolute;inset:0">${fullBleed}</div>
           </div>`
        : fullBleed;
  return `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;background:transparent}
    #c{width:${size}px;height:${size}px;overflow:hidden}
    svg{display:block}
  </style></head><body><div id="c">${inner}</div></body></html>`;
}

const monoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="100%" height="100%">
  <g fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,5)">
    <path d="M46 110 L90 56"/><path d="M90 56 L134 110"/><path d="M62 92 L118 92"/>
  </g><circle cx="90" cy="61" r="11" fill="#fff"/></svg>`;

const jobs = [
  ['icon-192.png', 192, 'any'],
  ['icon-512.png', 512, 'any'],
  ['maskable-192.png', 192, 'maskable'],
  ['maskable-512.png', 512, 'maskable'],
  ['apple-touch-icon-180.png', 180, 'apple'],
  ['shortcut-96.png', 96, 'any'],
  ['favicon-48.png', 48, 'any'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const p = await ctx.newPage();
for (const [name, size, mode] of jobs) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(page(size, mode));
  await p.locator('#c').screenshot({ path: path.join(out, name), omitBackground: true });
  console.log('wrote', name);
}
for (const [name, size] of [['monochrome-192.png', 192], ['badge-96.png', 96]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<!doctype html><html><body style="margin:0;background:transparent"><div id="c" style="width:${size}px;height:${size}px">${monoSvg}</div></body></html>`);
  await p.locator('#c').screenshot({ path: path.join(out, name), omitBackground: true });
  console.log('wrote', name);
}
await browser.close();
