import { describe, expect, it } from 'vitest';
import { depositPreview } from './depositPreview';

describe('depositPreview', () => {
  it('adds the typed amount to the balance', () => {
    expect(depositPreview(700, 300)).toEqual({ after: 1000, deducted: 0 });
  });

  it('a new custody absorbs a standing deficit and starts smaller', () => {
    expect(depositPreview(-200, 1000)).toEqual({ after: 800, deducted: 200 });
    expect(depositPreview(-1500, 1000)).toEqual({ after: -500, deducted: 1500 });
  });

  it('editing replaces the old amount instead of adding to it, and deducts nothing again', () => {
    expect(depositPreview(1300, 1500, 1000)).toEqual({ after: 1800, deducted: 0 });
  });

  it('stays exact to the thousandth', () => {
    expect(depositPreview(0.1, 0.2)).toEqual({ after: 0.3, deducted: 0 });
    expect(depositPreview(100.125, 33.375)?.after).toBe(133.5);
  });

  it('gives nothing until the amount is a positive number', () => {
    expect(depositPreview(100, undefined)).toBeNull();
    expect(depositPreview(100, 0)).toBeNull();
    expect(depositPreview(100, -5)).toBeNull();
    expect(depositPreview(100, Number.NaN)).toBeNull();
  });
});
