import { describe, expect, it } from 'vitest';
import { topOverlay } from './useEscapeDismiss';

describe('topOverlay', () => {
  it('returns the most recently opened overlay', () => {
    expect(topOverlay(['sheet', 'form', 'confirm'])).toBe('confirm');
  });

  it('returns undefined when nothing is open', () => {
    expect(topOverlay([])).toBeUndefined();
  });
});
