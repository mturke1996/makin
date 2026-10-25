import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('what the installed app promises every device', () => {
  const manifest = JSON.parse(read('public/manifest.json'));

  it('is not locked to portrait: an iPad or Android tablet may be held either way', () => {
    expect(manifest.orientation).not.toBe('portrait');
    expect(['any', 'natural', undefined]).toContain(manifest.orientation);
  });

  it('is installable as a standalone right-to-left app with real icons', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.dir).toBe('rtl');
    expect(manifest.icons.some((i: { sizes: string; purpose: string }) => i.sizes === '512x512')).toBe(true);
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
  });

  it('lets people zoom and fills the screen to its edges (notch and rounded corners handled in CSS)', () => {
    const html = read('index.html');
    const viewport = /<meta name="viewport" content="([^"]+)"/.exec(html)![1];
    expect(viewport).toContain('viewport-fit=cover');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/);
  });

  it('applies hover styles only where a pointer can hover (no sticky hover after a tap)', () => {
    expect(read('tailwind.config.js')).toMatch(/hoverOnlyWhenSupported:\s*true/);
  });

  it('keeps clear of notches and rounded corners, and honours less-transparency', () => {
    const css = read('src/index.css');
    expect(css).toMatch(/\.app-shell-root\s*{[^}]*safe-area-inset-left[^}]*safe-area-inset-right/s);
    expect(css).toContain('prefers-reduced-transparency');
  });

  it('switches the shell to the side rail at tablet width, and every phone-only bar goes with it', () => {
    const css = read('src/index.css');
    expect(css).toMatch(/@media \(min-width: 768px\)\s*{\s*\.app-shell-root\s*{\s*flex-direction: row/);
    expect(read('src/ui/nav/TopBar.tsx')).toContain('md:hidden');
    expect(read('src/ui/nav/MobileBottomNav.tsx')).toContain('md:hidden');
    expect(read('src/ui/nav/MobileDrawer.tsx')).toContain('md:hidden');
    const sidebar = read('src/ui/nav/Sidebar.tsx');
    expect(sidebar).toContain('md:flex');
    expect(sidebar).toContain('xl:w-[272px]');
  });

  it('opens forms as a centred panel from tablet width, not as a full-screen page 800px wide', () => {
    const sheet = read('src/design-system/primitives/Sheet.tsx');
    expect(sheet).toContain('md:items-center');
    expect(sheet).toContain('window.innerWidth >= 768');
    expect(sheet).not.toMatch(/\blg:[a-z[]/);
  });

  it('keeps the side rail usable on a landscape phone, where the screen is short', () => {
    const sidebar = read('src/ui/nav/Sidebar.tsx');
    expect(sidebar).toContain('[@media(max-height:600px)]:grid-cols-2');
    expect(sidebar).toContain('[@media(max-height:600px)]:hidden');
  });
});
