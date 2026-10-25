import { can, type Principal } from '../../../core/access';

/**
 * Deleting an invoice also deletes the payments recorded on it (the data store does both, one record
 * at a time, and the server checks each delete on its own). So the button is offered only when the whole
 * deletion can succeed AND nothing is left behind:
 *  - `invoices.delete` for the invoice itself;
 *  - `payments.delete` for its payments, unless the person can see that there are none
 *    (without `payments.view` they cannot know, and payments left pointing at a deleted invoice are
 *    worse than a button that is not there).
 */
export function canDeleteInvoice(p: Principal | null | undefined, paymentsOnInvoice: number): boolean {
  if (!can(p, 'invoices.delete')) return false;
  if (can(p, 'payments.delete')) return true;
  return can(p, 'payments.view') && paymentsOnInvoice === 0;
}
