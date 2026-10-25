export interface WorkerPaymentDraft {
  operationId: string;
  createdAt: string;
  amountText: string;
  date: string;
  note: string;
  attempted: boolean;
  advance?: boolean;
}

const memory = new Map<string, WorkerPaymentDraft>();
const keyFor = (scope: string, workerId: string) => `saas-build.worker-payment.v1:${encodeURIComponent(scope)}:${encodeURIComponent(workerId)}`;

export function readWorkerPaymentDraft(scope: string, workerId: string): WorkerPaymentDraft | null {
  const key = keyFor(scope, workerId);
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as WorkerPaymentDraft | null;
    if (value && typeof value.operationId === 'string' && typeof value.createdAt === 'string' && typeof value.amountText === 'string' && typeof value.date === 'string' && typeof value.note === 'string' && typeof value.attempted === 'boolean') return value;
  } catch { /* unavailable local storage retains the same-session in-memory copy */ }
  return memory.get(key) ?? null;
}

export function saveWorkerPaymentDraft(scope: string, workerId: string, value: WorkerPaymentDraft): void {
  const key = keyFor(scope, workerId);
  memory.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* same-session fallback */ }
}

export function clearWorkerPaymentDraft(scope: string, workerId: string): void {
  const key = keyFor(scope, workerId);
  memory.delete(key);
  try { localStorage.removeItem(key); } catch { /* unavailable storage */ }
}
