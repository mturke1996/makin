import { describe, expect, it } from 'vitest';
import { previousProjects } from './workerCard';

const clients = [{ id: 'c1', name: 'فيلا خالد' }, { id: 'c2', name: 'شركة النور' }, { id: 'c3', name: 'مجمع الشروق' }];
const w = (id: string, clientId: string, phone: string, createdAt = '2026-01-01') => ({ id, clientId, phone, createdAt });

describe('previousProjects', () => {
  const me = w('w1', 'c1', '0912345678');

  it('finds the same person on other projects, however the number is written', () => {
    const others = [w('w2', 'c2', '+218 91 234 5678', '2026-03-01'), w('w3', 'c3', '00218912345678', '2026-05-01'), w('w4', 'c2', '0921112233')];
    expect(previousProjects(me, [me, ...others], clients)).toEqual(['مجمع الشروق', 'شركة النور']);
  });

  it('lists each project once and never the current one', () => {
    const others = [w('w2', 'c2', '0912345678'), w('w5', 'c2', '0912345678'), w('w6', 'c1', '0912345678')];
    expect(previousProjects(me, [me, ...others], clients)).toEqual(['شركة النور']);
  });

  it('knows nothing without a usable number', () => {
    expect(previousProjects(w('x', 'c1', ''), [w('y', 'c2', '')], clients)).toEqual([]);
    expect(previousProjects(w('x', 'c1', '123'), [w('y', 'c2', '123')], clients)).toEqual([]);
  });
});
