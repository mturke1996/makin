/**
 * Renders MAKIN's PWA/icon PNGs and the letterhead PNG from the brand SVGs.
 * Run: node scripts/generate-brand-assets.cjs  (needs playwright + chromium)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const MARK = read('public/brand/logo.svg');

const INK = '#1F2633';
const IVORY = '#F4EFE6';
const GOLD = '#C9972B';

const markInner = (stroke, accent) => `
  <path d="M32 88 V40 L64 68 L96 40 V88" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="square" stroke-linejoin="miter"/>
  <rect x="28" y="97" width="72" height="6" rx="1" fill="${accent}"/>`;

const svg = (body, size, bg = 'none') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">${bg}${body}</svg>`;

// "any" icon: rounded tile. Maskable: full-bleed ink with the mark inside the 80% safe zone.
const any = (s) => svg(MARK.replace(/<\?xml[^>]*>|<\/?svg[^>]*>/g, ''), s);
const maskable = (s) =>
  svg(`<g transform="translate(12.8 12.8) scale(0.8)">${markInner(IVORY, GOLD)}</g>`, s, `<rect width="128" height="128" fill="${INK}"/>`);
const mono = (s) =>
  svg(`<g transform="translate(12.8 12.8) scale(0.8)">${markInner('#000', '#000')}</g>`, s);
const apple = (s) =>
  svg(`<g transform="translate(10 10) scale(0.84)">${markInner(IVORY, GOLD)}</g>`, s, `<rect width="128" height="128" fill="${INK}"/>`);

const jobs = [
  ['public/pwa/icon-192.png', any(192), 192],
  ['public/pwa/icon-512.png', any(512), 512],
  ['public/pwa/maskable-192.png', maskable(192), 192],
  ['public/pwa/maskable-512.png', maskable(512), 512],
  ['public/pwa/monochrome-192.png', mono(192), 192],
  ['public/pwa/apple-touch-icon-180.png', apple(180), 180],
  ['public/pwa/favicon-48.png', any(48), 48],
  ['public/pwa/badge-96.png', mono(96), 96],
  ['public/pwa/shortcut-96.png', any(96), 96],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [out, markup, size] of jobs) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0;background:transparent">${markup}</body>`);
    await page.screenshot({ path: path.join(ROOT, out), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('wrote', out);
  }
  await browser.close();
})();
