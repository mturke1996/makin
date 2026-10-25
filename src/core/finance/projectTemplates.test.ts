import { describe, expect, it } from 'vitest';
import { buildTemplatePhases, PROJECT_TEMPLATES } from './projectTemplates';

describe('construction stage templates', () => {
  const at = '2026-10-24T12:00:00.000Z';
  it('starts planned stages with no fictional budget or dates', () => {
    const phases = buildTemplatePhases(PROJECT_TEMPLATES[0], 'client', [], 'user', at);
    expect(phases).toHaveLength(12);
    expect(phases.map(p => p.order)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(phases.every(p => p.status === 'planned' && p.budgetAmount === undefined && p.startDate === undefined)).toBe(true);
  });
  it('retains edited stages and deduplicates shared stages across templates', () => {
    const first = buildTemplatePhases(PROJECT_TEMPLATES[1], 'client', [], 'user', at);
    first[0] = { ...first[0], name: 'معاينة مخصصة', status: 'completed', order: 20 };
    expect(buildTemplatePhases(PROJECT_TEMPLATES[1], 'client', first, 'user', at)).toEqual([]);
    const more = buildTemplatePhases(PROJECT_TEMPLATES[0], 'client', first, 'user', at);
    expect(more).toHaveLength(4);
    expect(more[0].order).toBe(21);
  });
  it('deduplicates manually entered Arabic stage names and ignores other clients', () => {
    const existing = buildTemplatePhases(PROJECT_TEMPLATES[0], 'client', [], 'user', at);
    const foundations = { ...existing[2], id: 'manual', name: '  الاساسات  ' };
    const other = existing.map(p => ({ ...p, clientId: 'other' }));
    expect(buildTemplatePhases(PROJECT_TEMPLATES[0], 'client', [foundations, ...other], 'user', at)).toHaveLength(11);
  });
});
