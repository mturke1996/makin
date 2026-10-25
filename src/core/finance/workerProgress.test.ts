import { describe, expect, it } from 'vitest';
import { exceedsEarnedBy, normalizePercent, workerProgressView } from './workerProgress';

describe('normalizePercent', () => {
  it('accepts 0 to 100 with one decimal', () => {
    expect(normalizePercent(40)).toBe(40);
    expect(normalizePercent('62.55')).toBe(62.6);
    expect(normalizePercent(0)).toBe(0);
    expect(normalizePercent(100)).toBe(100);
  });
  it('refuses everything else', () => {
    for (const bad of [-1, 100.1, 'abc', NaN, null, undefined, '']) expect(normalizePercent(bad)).toBeNull();
  });
});

describe('workerProgressView', () => {
  it('says nothing until a percentage is approved', () => {
    const v = workerProgressView({ agreed: 10000, paid: 3000 });
    expect(v.state).toBe('unset');
    expect(v.percent).toBeNull();
    expect(v.payableNow).toBe(0);
    expect(v.aheadBy).toBe(0);
  });

  it('owes the worker what the work earned less everything already paid', () => {
    const v = workerProgressView({ agreed: 10000, paid: 3000, percent: 50 });
    expect(v).toMatchObject({ earned: 5000, payableNow: 2000, aheadBy: 0, state: 'ok' });
  });

  it('flags money paid ahead of the work', () => {
    const v = workerProgressView({ agreed: 10000, paid: 4000, percent: 30 });
    expect(v).toMatchObject({ earned: 3000, payableNow: 0, aheadBy: 1000, state: 'ahead' });
  });

  it('turns urgent from a fifth of the agreement paid ahead', () => {
    expect(workerProgressView({ agreed: 10000, paid: 3999.999, percent: 20 }).state).toBe('ahead');
    expect(workerProgressView({ agreed: 10000, paid: 4000, percent: 20 }).state).toBe('far_ahead');
  });

  it('deducts an advance automatically as the work catches up', () => {
    // 5000 advance, nothing else paid: with no progress the whole advance is ahead of the work.
    expect(workerProgressView({ agreed: 20000, paid: 5000, percent: 0, advances: 5000 })).toMatchObject({ advanceOutstanding: 5000, advanceSettled: 0, aheadBy: 5000 });
    // 40% done earns 8000: the advance is covered and only 3000 is payable now.
    expect(workerProgressView({ agreed: 20000, paid: 5000, percent: 40, advances: 5000 })).toMatchObject({ payableNow: 3000, advanceOutstanding: 0, advanceSettled: 5000, state: 'ok' });
    // 20% earns 4000: 1000 of the advance is still ahead of the work.
    expect(workerProgressView({ agreed: 20000, paid: 5000, percent: 20, advances: 5000 })).toMatchObject({ aheadBy: 1000, advanceOutstanding: 1000, advanceSettled: 4000 });
  });

  it('never counts more outstanding advance than the money actually ahead', () => {
    const v = workerProgressView({ agreed: 10000, paid: 6000, percent: 50, advances: 6000 });
    expect(v.advanceOutstanding).toBe(1000);
  });

  it('works in exact thousandths', () => {
    const v = workerProgressView({ agreed: 100, paid: 33.333, percent: 33.3 });
    expect(v.earned).toBe(33.3);
    expect(v.aheadBy).toBe(0.033);
  });
});

describe('exceedsEarnedBy', () => {
  const view = workerProgressView({ agreed: 10000, paid: 3000, percent: 50 });
  it('is how far a payment would push the paid total past the earned', () => {
    expect(exceedsEarnedBy(view, 2000)).toBe(0);
    expect(exceedsEarnedBy(view, 2500)).toBe(500);
  });
  it('counts only the difference when a payment is edited', () => {
    expect(exceedsEarnedBy(view, 2500, 1000)).toBe(0);
  });
  it('is silent without an approved percentage', () => {
    expect(exceedsEarnedBy(workerProgressView({ agreed: 10000, paid: 3000 }), 99999)).toBe(0);
  });
});
