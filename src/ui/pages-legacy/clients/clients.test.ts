import { describe, expect, it } from 'vitest';
import { buildPrincipal } from '../../../core/access';
import type { Client, Expense, Payment, StandaloneDebt } from '../../../types';
import { canDeleteClient, canShowClientFigures } from './clientAccess';
import { buildClientFigures, hasDeficit } from './clientFigures';

const admin = buildPrincipal({ id: 'a', role: 'admin' });
const employee = (permissions?: string[]) => buildPrincipal({ id: 'e', role: 'employee', permissions });

describe('canShowClientFigures', () => {
  it('needs payments, debts AND everyone\'s expenses', () => {
    expect(canShowClientFigures(admin)).toBe(true);
    expect(canShowClientFigures(employee())).toBe(false);
    expect(canShowClientFigures(employee(['clients.view', 'payments.view', 'debts.view', 'expenses.view.all']))).toBe(true);
    expect(canShowClientFigures(employee(['clients.view', 'payments.view', 'debts.view', 'expenses.create']))).toBe(false);
    expect(canShowClientFigures(employee(['clients.view', 'payments.view', 'expenses.view.all']))).toBe(false);
    expect(canShowClientFigures(employee(['clients.view', 'debts.view', 'expenses.view.all']))).toBe(false);
    expect(canShowClientFigures(null)).toBe(false);
  });
});

describe('canDeleteClient', () => {
  it('is offered only when the whole cascade of deletes is allowed', () => {
    expect(canDeleteClient(admin)).toBe(true);
    // granting the right to delete clients pulls in the right to delete everything that hangs from them
    expect(canDeleteClient(employee(['clients.delete']))).toBe(true);
    // a hand-edited profile that lacks one part of the cascade is still refused
    const full = employee(['clients.delete']);
    const partial = { ...full, permissions: new Set([...full.permissions].filter((p) => p !== 'payments.delete')) };
    expect(canDeleteClient(partial)).toBe(false);
    expect(canDeleteClient(employee())).toBe(false);
    expect(
      canDeleteClient(
        employee([
          'clients.delete', 'invoices.delete', 'payments.delete', 'debts.delete', 'expenses.delete.all',
          'workers.manage', 'projects.manage', 'letters.manage', 'custody.manage',
        ]),
      ),
    ).toBe(true);
  });
});

describe('buildClientFigures', () => {
  const clients = [
    { id: 'c1', name: 'أ', profitPercentage: 10, profitBase: 'expenses' },
    { id: 'c2', name: 'ب' },
    { id: 'c3', name: 'ج' },
  ] as Client[];
  const expenses = [{ id: 'e1', clientId: 'c1', amount: 1000 }, { id: 'e2', clientId: 'c2', amount: 200 }] as Expense[];
  const payments = [{ id: 'p1', clientId: 'c1', amount: 500 }, { id: 'p2', clientId: 'c2', amount: 300 }] as Payment[];
  const debts = [{ id: 'd1', clientId: 'c1', remainingAmount: 100 }] as StandaloneDebt[];

  it('one figure per client with deficit, surplus and activity', () => {
    const f = buildClientFigures({ clients, expenses, payments, debts });
    // c1: obligations 1000 + 100 + 10% of expenses (100) = 1200, paid 500
    expect(f.get('c1')!.required).toBe(700);
    expect(hasDeficit(f.get('c1')!)).toBe(true);
    // c2 paid more than it cost
    expect(f.get('c2')!.remaining).toBe(100);
    expect(hasDeficit(f.get('c2')!)).toBe(false);
    expect(f.get('c3')!.active).toBe(false);
  });
});
