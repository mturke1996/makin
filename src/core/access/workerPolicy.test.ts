import { expect, it } from 'vitest';
import { buildPrincipal } from './principal';
import { canEditExpense, canDeleteExpense } from './policy';

it('worker payments require worker management as well as expense ownership or edit/delete rights', () => {
  const owner = buildPrincipal({ id: 'u1', role: 'employee', permissions: ['expenses.create'] });
  const manager = buildPrincipal({ id: 'u1', role: 'employee', permissions: ['expenses.create', 'workers.manage'] });
  const payment = { userId: 'u1', workerId: 'w1', isClosed: false };
  expect(canEditExpense(owner, payment)).toBe(false);
  expect(canDeleteExpense(owner, payment)).toBe(false);
  expect(canEditExpense(manager, payment)).toBe(true);
  expect(canDeleteExpense(manager, payment)).toBe(true);
  expect(canEditExpense(owner, { ...payment, workerId: undefined })).toBe(true);
});
