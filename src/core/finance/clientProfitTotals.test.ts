import { describe, expect, it } from 'vitest';
import type { Client } from '../../types';
import {
  computeClientAccount, computeClientsProfitSummary, computeProfitAmount, resolveProfitBase,
} from './clientProfitTotals';

describe('resolveProfitBase', () => {
  it('defaults to expenses', () => {
    expect(resolveProfitBase(undefined)).toBe('expenses');
    expect(resolveProfitBase({})).toBe('expenses');
    expect(resolveProfitBase({ profitBase: 'payments' })).toBe('payments');
    expect(resolveProfitBase({ profitBase: 'junk' as never })).toBe('expenses');
  });
});

describe('computeProfitAmount', () => {
  it('takes the percentage of the chosen base', () => {
    expect(computeProfitAmount('expenses', 10, { totalExpenses: 20000, totalPaid: 0 })).toBe(2000);
    expect(computeProfitAmount('payments', 10, { totalExpenses: 20000, totalPaid: 0 })).toBe(0);
    expect(computeProfitAmount('payments', 12.5, { totalExpenses: 0, totalPaid: 8000 })).toBe(1000);
  });
  it('is zero without a positive percentage', () => {
    expect(computeProfitAmount('expenses', 0, { totalExpenses: 100, totalPaid: 100 })).toBe(0);
    expect(computeProfitAmount('expenses', -5, { totalExpenses: 100, totalPaid: 100 })).toBe(0);
  });
});

describe('computeClientAccount: percentage from expenses (default)', () => {
  it('keeps the commission visible when nothing was paid yet', () => {
    const a = computeClientAccount({ totalExpenses: 20000, totalDebts: 0, totalPaid: 0, profitPercentage: 10 });
    expect(a).toMatchObject({
      profit: 2000, totalObligations: 22000, remaining: -22000,
      clientDeficit: 20000, agreedPercentageDeficit: 2000, requiredCollection: 22000, profitBase: 'expenses',
    });
  });
  it('consumes surplus on base costs before the commission', () => {
    const a = computeClientAccount({ totalExpenses: 10000, totalDebts: 0, totalPaid: 10500, profitPercentage: 10 });
    expect(a).toMatchObject({ profit: 1000, clientDeficit: 0, agreedPercentageDeficit: 500, requiredCollection: 500, remaining: -500 });
  });
  it('has no deficit when payments cover costs and commission', () => {
    const a = computeClientAccount({ totalExpenses: 10000, totalDebts: 0, totalPaid: 12000, profitPercentage: 10 });
    expect(a).toMatchObject({ remaining: 1000, clientDeficit: 0, agreedPercentageDeficit: 0, requiredCollection: 0 });
  });
  it('counts debts as base obligations', () => {
    const a = computeClientAccount({ totalExpenses: 1000, totalDebts: 500, totalPaid: 0, profitPercentage: 10 });
    expect(a).toMatchObject({ profit: 100, clientDeficit: 1500, requiredCollection: 1600 });
  });
  it('splits the total deficit exactly (general + percentage = -remaining) for many combinations', () => {
    for (const expenses of [0, 1, 999.5, 10000]) for (const debts of [0, 250]) for (const paid of [0, 500, 1250.25, 20000]) for (const pct of [0, 5, 12.5, 100]) {
      const a = computeClientAccount({ totalExpenses: expenses, totalDebts: debts, totalPaid: paid, profitPercentage: pct });
      expect(a.clientDeficit + a.agreedPercentageDeficit).toBeCloseTo(Math.max(0, -a.remaining), 9);
      expect(a.requiredCollection).toBeCloseTo(Math.max(0, -a.remaining), 9);
    }
  });
});

describe('computeClientAccount: percentage from payments', () => {
  it('deducts the commission from what was collected', () => {
    const a = computeClientAccount({ totalExpenses: 10000, totalDebts: 0, totalPaid: 12000, profitPercentage: 10, profitBase: 'payments' });
    expect(a).toMatchObject({ profit: 1200, totalObligations: 10000, remaining: 800, clientDeficit: 0, profitBase: 'payments' });
  });
  it('grosses up the deficit because each new payment is also commissioned', () => {
    const a = computeClientAccount({ totalExpenses: 10000, totalDebts: 0, totalPaid: 5000, profitPercentage: 10, profitBase: 'payments' });
    expect(a.profit).toBe(500);
    expect(a.clientDeficit).toBe(5500);
    expect(a.agreedPercentageDeficit).toBeCloseTo((5500 * 0.1) / 0.9, 9);
    expect(a.requiredCollection).toBeCloseTo(5500 / 0.9, 9);
  });
  it('does not divide by zero at 100%', () => {
    const a = computeClientAccount({ totalExpenses: 10, totalDebts: 0, totalPaid: 0, profitPercentage: 100, profitBase: 'payments' });
    expect(Number.isFinite(a.requiredCollection)).toBe(true);
  });
});

describe('the percentage as an amount', () => {
  it('is kept to the thousandth, never a float tail', () => {
    expect(computeProfitAmount('expenses', 33.3, { totalExpenses: 73390, totalPaid: 0 })).toBe(24438.87);
    expect(computeProfitAmount('expenses', 15, { totalExpenses: 73390, totalPaid: 0 })).toBe(11008.5);
    expect(computeProfitAmount('payments', 7.77, { totalExpenses: 0, totalPaid: 1234.567 })).toBe(95.926);
  });
  it('is zero for no money, no percentage and bad numbers', () => {
    expect(computeProfitAmount('expenses', 10, { totalExpenses: 0, totalPaid: 5 })).toBe(0);
    expect(computeProfitAmount('payments', 10, { totalExpenses: 5, totalPaid: -20 })).toBe(0);
    expect(computeProfitAmount('expenses', NaN, { totalExpenses: 100, totalPaid: 0 })).toBe(0);
  });
  it('follows the base the client was saved with, and falls back to expenses', () => {
    const base = { totalExpenses: 1000, totalDebts: 0, totalPaid: 4000, profitPercentage: 10 };
    expect(computeClientAccount({ ...base, profitBase: 'payments' }).profit).toBe(400);
    expect(computeClientAccount({ ...base, profitBase: 'expenses' }).profit).toBe(100);
    expect(computeClientAccount({ ...base }).profit).toBe(100);
    expect(computeClientAccount({ ...base, profitBase: 'junk' as never }).profit).toBe(100);
  });
  it('is nothing at all when no percentage is set', () => {
    for (const profitPercentage of [undefined, 0]) {
      const a = computeClientAccount({ totalExpenses: 500, totalDebts: 100, totalPaid: 200, profitPercentage });
      expect(a).toMatchObject({ profit: 0, agreedPercentageDeficit: 0, clientDeficit: 400, requiredCollection: 400, remaining: -400 });
    }
  });
  it('collecting what is required closes the account, from either base', () => {
    for (const profitBase of ['expenses', 'payments'] as const) for (const pct of [5, 12.5, 33.3]) for (const paid of [0, 3000, 9000]) {
      const first = computeClientAccount({ totalExpenses: 10000, totalDebts: 500, totalPaid: paid, profitPercentage: pct, profitBase });
      const after = computeClientAccount({ totalExpenses: 10000, totalDebts: 500, totalPaid: paid + first.requiredCollection, profitPercentage: pct, profitBase });
      expect(after.remaining, `${profitBase} ${pct}% paid ${paid}`).toBeGreaterThanOrEqual(-0.002);
      expect(after.requiredCollection).toBeLessThanOrEqual(0.002);
    }
  });
});

describe('computeClientsProfitSummary', () => {
  const client = (id: string, pct: number, base?: 'expenses' | 'payments'): Client => ({
    id, name: id, phone: '', address: '', type: 'company', profitPercentage: pct, profitBase: base, createdAt: '', updatedAt: '',
  });
  it('sums each client by its own base', () => {
    const r = computeClientsProfitSummary(
      [client('a', 10), client('b', 10, 'payments'), client('c', 0)],
      [{ clientId: 'a', amount: 999 }, { clientId: 'b', amount: 5000 }] as never,
      [{ clientId: 'a', amount: 2000 }, { clientId: 'b', amount: 999 }, { clientId: 'c', amount: 100 }],
    );
    expect(r).toEqual({ totalGrossProfit: 200 + 500, clientsWithProfitRule: 2 });
  });
});
