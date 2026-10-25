import { can, expenseScope, type Principal } from '../../../core/access';

/**
 * A client's account figure (spent, collected, deficit, agreed share) is made of ALL their expenses,
 * ALL their payments and ALL their open debts. The data store only holds what the person may
 * download, so the figure is shown only when they hold every one of those data sets; with a part of
 * it missing the number would look right and be wrong.
 */
export function canShowClientFigures(p: Principal | null | undefined): boolean {
  return can(p, 'payments.view') && can(p, 'debts.view') && expenseScope(p) === 'all';
}

/**
 * Deleting a client also deletes everything that hangs from them (expenses, payments, invoices, debts,
 * workers, custody balances, project follow-up, letters, expense invoices), one record at a time from
 * the browser. Each of those deletes is checked on its own by the server, so offering the button to
 * someone who may delete only some of them would leave a half-deleted client. It is offered only
 * when every part is allowed.
 */
const CLIENT_CASCADE = [
  'clients.delete',
  'invoices.delete',
  'payments.delete',
  'debts.delete',
  'expenses.delete.all',
  'workers.manage',
  'projects.manage',
  'letters.manage',
  'custody.manage',
] as const;

export function canDeleteClient(p: Principal | null | undefined): boolean {
  return CLIENT_CASCADE.every((permission) => can(p, permission));
}
