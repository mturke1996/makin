import { describe, expect, it } from 'vitest';
import { isOverlayPopped } from './useBackDismiss';

describe('isOverlayPopped (overlay stack A < B < C, bottom to top)', () => {
  const order = ['A', 'B', 'C'];

  it('closes only the top overlay when its marker is popped', () => {
    // C popped → current marker is B's
    expect(isOverlayPopped(order, 'C', 'B')).toBe(true);
    expect(isOverlayPopped(order, 'B', 'B')).toBe(false);
    expect(isOverlayPopped(order, 'A', 'B')).toBe(false); // regression: A must stay open
  });

  it('closes B and C when two entries are popped at once', () => {
    expect(isOverlayPopped(order, 'C', 'A')).toBe(true);
    expect(isOverlayPopped(order, 'B', 'A')).toBe(true);
    expect(isOverlayPopped(order, 'A', 'A')).toBe(false);
  });

  it('closes everything when landing on a plain route entry', () => {
    for (const t of order) expect(isOverlayPopped(order, t, undefined)).toBe(true);
  });

  it('keeps all overlays open while the top marker is current', () => {
    for (const t of order) expect(isOverlayPopped(order, t, 'C')).toBe(false);
  });

  it('treats an unowned (stale) marker like a plain entry', () => {
    for (const t of order) expect(isOverlayPopped(order, t, 'stale')).toBe(true);
  });

  it('handles a single overlay', () => {
    expect(isOverlayPopped(['A'], 'A', 'A')).toBe(false);
    expect(isOverlayPopped(['A'], 'A', undefined)).toBe(true);
  });
});
