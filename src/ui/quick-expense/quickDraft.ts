import type { Expense } from '../../types';

export interface QuickDraft {
  clientId: string;
  category: string;
  mode: 'amount' | 'quantity';
  amount: string;
  quantity: string;
  unitPrice: string;
  unit: string;
  description: string;
  invoiceNumber: string;
  notes: string;
  date: string;
  phaseId: string;
  personId: string;
  /** Once sent, this snapshot is immutable until acknowledged or explicitly rejected by Firebase. */
  operation?: Expense;
}

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const keyFor = (projectId: string, userId: string) => `quick-expense:draft:v1:${encodeURIComponent(projectId)}:${encodeURIComponent(userId)}`;
const getStorage = (): DraftStorage | undefined => { try { return typeof window === 'undefined' ? undefined : window.localStorage; } catch { return undefined; } };
const FIELDS = ['clientId', 'category', 'amount', 'quantity', 'unitPrice', 'unit', 'description', 'invoiceNumber', 'notes', 'date', 'phaseId', 'personId'] as const;

export function readQuickDraft(projectId: string, userId: string, storage = getStorage()): QuickDraft | null {
  if (!projectId || !userId || !storage) return null;
  try {
    const raw = storage.getItem(keyFor(projectId, userId));
    if (!raw || raw.length > 40000) return null;
    const value = JSON.parse(raw);
    if (!value || !FIELDS.every((field) => typeof value[field] === 'string') || !['amount', 'quantity'].includes(value.mode)) return null;
    if (value.operation && !validOperation(value.operation)) return null;
    return value as QuickDraft;
  } catch { return null; }
}

function validOperation(value: unknown): value is Expense {
  if (!value || typeof value !== 'object') return false;
  const expense = value as Expense;
  return ['id', 'clientId', 'category', 'description', 'date', 'userId', 'createdAt', 'updatedAt'].every((field) => typeof expense[field as keyof Expense] === 'string') && Number.isFinite(expense.amount) && expense.amount > 0 && expense.amount <= 999999999 && expense.isClosed === false;
}

export function writeQuickDraft(projectId: string, userId: string, draft: QuickDraft, storage = getStorage()): boolean {
  if (!projectId || !userId || !storage) return false;
  try { storage.setItem(keyFor(projectId, userId), JSON.stringify(draft)); return true; } catch { return false; }
}

/** A late completion may clear its own draft only, never a newer operation's input. */
export function clearQuickDraft(projectId: string, userId: string, operationId?: string, storage = getStorage()): void {
  if (!storage || !projectId || !userId) return;
  try {
    if (operationId && readQuickDraft(projectId, userId, storage)?.operation?.id !== operationId) return;
    storage.removeItem(keyFor(projectId, userId));
  } catch { /* Local drafts are best effort when browser storage is blocked. */ }
}
