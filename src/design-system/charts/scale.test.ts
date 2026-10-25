import { describe, expect, it } from 'vitest';
import { anchorAt, areaPath, compactNumber, compactParts, niceAxis, niceStep, smoothPath, xAt } from './scale';

describe('compactNumber', () => {
  it('abbreviates thousands and millions the way the dashboard shows them', () => {
    expect(compactNumber(17500)).toBe('17.5 ألف');
    expect(compactNumber(60000)).toBe('60 ألف');
    expect(compactNumber(1_240_000)).toBe('1.2 مليون');
    expect(compactNumber(950)).toBe('950');
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(-2500)).toBe('−2.5 ألف');
  });
});

describe('compactParts', () => {
  it('separates the digits from the unit so each can take its own direction', () => {
    expect(compactParts(17500)).toEqual({ sign: '', number: '17.5', unit: 'ألف' });
    expect(compactParts(-1_200_000)).toEqual({ sign: '−', number: '1.2', unit: 'مليون' });
    expect(compactParts(950)).toEqual({ sign: '', number: '950', unit: '' });
  });
});

describe('anchorAt', () => {
  it('returns the SVG anchor that puts the text on the intended side of its point', () => {
    expect(anchorAt('left', false)).toBe('start');
    expect(anchorAt('right', false)).toBe('end');
    expect(anchorAt('left', true)).toBe('end');
    expect(anchorAt('right', true)).toBe('start');
    expect(anchorAt('middle', true)).toBe('middle');
  });
});

describe('axes', () => {
  it('picks round steps', () => {
    expect(niceStep(97, 3)).toBe(50);
    expect(niceStep(7, 3)).toBe(2.5);
    expect(niceStep(0, 3)).toBe(1);
  });

  it('covers every value, includes zero and ends on a tick', () => {
    const axis = niceAxis([0, 12, 47], 3);
    expect(axis.min).toBe(0);
    expect(axis.max).toBeGreaterThanOrEqual(47);
    expect(axis.ticks[0]).toBe(0);
    expect(axis.ticks[axis.ticks.length - 1]).toBe(axis.max);
  });

  it('handles negatives and an all-zero series', () => {
    const axis = niceAxis([-30, 10], 3);
    expect(axis.min).toBeLessThanOrEqual(-30);
    expect(axis.max).toBeGreaterThanOrEqual(10);
    expect(axis.ticks).toContain(0);
    expect(niceAxis([0, 0])).toEqual({ min: 0, max: 1, ticks: [0, 1] });
  });
});

describe('paths', () => {
  it('draws nothing for no points, a dot for one, a line for two', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([[1, 2]])).toBe('M1,2');
    expect(smoothPath([[0, 0], [10, 5]])).toBe('M0,0L10,5');
  });

  it('does not overshoot: a flat stretch stays flat', () => {
    const d = smoothPath([[0, 10], [10, 10], [20, 10], [30, 0]]);
    const ys = [...d.matchAll(/C[^C]*/g)].slice(0, 2).map((m) => m[0].split(',').map(Number));
    expect(d.startsWith('M0,10')).toBe(true);
    expect(ys.length).toBe(2);
    // control points of the first two segments sit on y = 10
    for (const seg of ys) expect(seg[1]).toBe(10);
  });

  it('closes an area down to the baseline', () => {
    expect(areaPath([[0, 5], [10, 2]], 20)).toBe('M0,5L10,2L10,20L0,20Z');
    expect(areaPath([], 20)).toBe('');
  });

  it('mirrors time for right-to-left pages', () => {
    expect(xAt(0, 5, 100, false)).toBe(0);
    expect(xAt(4, 5, 100, false)).toBe(100);
    expect(xAt(0, 5, 100, true)).toBe(100);
    expect(xAt(4, 5, 100, true)).toBe(0);
    expect(xAt(0, 1, 100, true)).toBe(50);
  });
});
