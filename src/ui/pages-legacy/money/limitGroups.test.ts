import { describe, expect, it } from 'vitest';
import { limitGroups } from './moneyUtils';

const groups = [
  { key: 'a', items: [1, 2, 3] },
  { key: 'b', items: [4, 5] },
  { key: 'c', items: [6, 7, 8, 9] },
];

describe('limitGroups', () => {
  it('shows everything when the limit is not reached', () => {
    const r = limitGroups(groups, 100);
    expect(r.groups).toEqual(groups);
    expect(r.hidden).toBe(0);
  });

  it('cuts inside a group wherever the limit falls and says how many are waiting', () => {
    const r = limitGroups(groups, 4);
    expect(r.groups).toEqual([{ key: 'a', items: [1, 2, 3] }, { key: 'b', items: [4] }]);
    expect(r.hidden).toBe(5);
  });

  it('drops the groups after the cut instead of leaving empty headings', () => {
    const r = limitGroups(groups, 3);
    expect(r.groups.map((g) => g.key)).toEqual(['a']);
    expect(r.hidden).toBe(6);
  });

  it('keeps the order and does not touch the input', () => {
    const copy = JSON.parse(JSON.stringify(groups));
    limitGroups(groups, 2);
    expect(groups).toEqual(copy);
    expect(limitGroups(groups, 6).groups.flatMap((g) => g.items)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('handles nothing, zero and nonsense limits', () => {
    expect(limitGroups([], 60)).toEqual({ groups: [], hidden: 0 });
    expect(limitGroups(groups, 0)).toEqual({ groups: [], hidden: 9 });
    expect(limitGroups(groups, -5).hidden).toBe(9);
    expect(limitGroups(groups, 2.9).groups[0].items).toEqual([1, 2]);
  });
});
