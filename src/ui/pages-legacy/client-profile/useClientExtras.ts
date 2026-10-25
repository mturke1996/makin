import { useMemo } from 'react';
import { useDataStore } from '../../../stores/useDataStore';
import { selectClientInvoices } from './invoices/clientInvoices';
import { selectClientLetters } from './letters/clientLetters';
import type { ClientProfileCaps } from './types';

/**
 * The client's invoices and letters, read from the stores. Each list is filled only when the
 * permission that governs it is held (`caps.invoices`, `caps.letters`): without it the store holds none
 * of them anyway, and an empty list must never be mistaken for "this client has none".
 * Invoices come newest first; the invoices sheet re-sorts them by what needs chasing.
 */
export function useClientExtras(clientId: string | undefined, caps: Pick<ClientProfileCaps, 'invoices' | 'letters'>) {
  const invoices = useDataStore((s) => s.invoices);
  const letters = useDataStore((s) => s.letters);

  const clientInvoices = useMemo(
    () => (caps.invoices ? selectClientInvoices(invoices, clientId) : []),
    [caps.invoices, invoices, clientId],
  );
  const clientLetters = useMemo(
    () => (caps.letters ? selectClientLetters(letters, clientId) : []),
    [caps.letters, letters, clientId],
  );

  return { clientInvoices, clientLetters };
}
