import type { Client, ClientStatus } from '../../../../types';
import { parseDecimalInput } from '../../../../core/utils-formatters';
import { roundMoney } from '../../../../core/finance/money';
import { resolveClientStatus } from '../../../../core/finance/clientProject';

/** The project fields of the client forms, as the inputs hold them (everything is text). */
export interface ClientProjectFormFields {
  status: ClientStatus;
  contractValue: string;
  startDate: string;
  expectedEndDate: string;
  notes: string;
}

export const EMPTY_PROJECT_FIELDS: ClientProjectFormFields = {
  status: 'active',
  contractValue: '',
  startDate: '',
  expectedEndDate: '',
  notes: '',
};

/** Form values for a client; a client saved before these fields existed opens as active with the rest empty. */
export function projectFieldsOf(client?: Client | null): ClientProjectFormFields {
  if (!client) return { ...EMPTY_PROJECT_FIELDS };
  return {
    status: resolveClientStatus(client),
    contractValue: client.contractValue != null && client.contractValue > 0 ? String(client.contractValue) : '',
    startDate: client.startDate ?? '',
    expectedEndDate: client.expectedEndDate ?? '',
    notes: client.notes ?? '',
  };
}

/** Whether a client already carries any project detail (the add form keeps the section closed until then). */
export function hasProjectDetails(fields: Partial<ClientProjectFormFields>): boolean {
  return (
    (fields.status ?? 'active') !== 'active' ||
    !!fields.contractValue ||
    !!fields.startDate ||
    !!fields.expectedEndDate ||
    !!fields.notes?.trim()
  );
}

/**
 * The project fields of a client as they are written to the database.
 *
 * Firestore never receives `undefined`:
 *  - `create` leaves out every optional field that is empty (the document simply does not have it);
 *  - `update` writes `clear()` for an empty one, which removes the field if it was there and is a
 *    no-op if it was not. Pass `clearField` from `services/firebaseService`.
 *
 * The status is always written. A contract value of zero means "none", exactly like an empty one, and
 * is rounded to the thousandth; notes are trimmed.
 */
export function buildProjectPatch(
  values: Partial<ClientProjectFormFields>,
  mode: 'create' | 'update',
  clear: () => never,
): Partial<Pick<Client, 'status' | 'contractValue' | 'startDate' | 'expectedEndDate' | 'notes'>> {
  const patch: Partial<Pick<Client, 'status' | 'contractValue' | 'startDate' | 'expectedEndDate' | 'notes'>> = {
    status: values.status ?? 'active',
  };

  const parsed = values.contractValue ? parseDecimalInput(values.contractValue) : undefined;
  const contractValue = parsed != null && parsed > 0 ? roundMoney(parsed) : undefined;
  const notes = (values.notes ?? '').trim();
  const optional = {
    contractValue,
    startDate: values.startDate || undefined,
    expectedEndDate: values.expectedEndDate || undefined,
    notes: notes || undefined,
  };

  for (const key of Object.keys(optional) as (keyof typeof optional)[]) {
    const value = optional[key];
    if (value !== undefined) (patch as Record<string, unknown>)[key] = value;
    else if (mode === 'update') (patch as Record<string, unknown>)[key] = clear();
  }
  return patch;
}

const CLEARED = Symbol('cleared');

/**
 * The client as it looks after saving `values` over it: the same patch as `buildProjectPatch('update')`
 * with the removed fields really gone, for callers that hand the saved client back to the screen.
 */
export function withProjectFields(client: Client, values: Partial<ClientProjectFormFields>): Client {
  const patch = buildProjectPatch(values, 'update', () => CLEARED as never);
  const out: Record<string, unknown> = { ...client };
  for (const [key, value] of Object.entries(patch)) {
    if ((value as unknown) === CLEARED) delete out[key];
    else out[key] = value;
  }
  return out as unknown as Client;
}
