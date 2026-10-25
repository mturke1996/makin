import type { Client, Worker } from '../../types';

const digits = (value: string | undefined) => (value ?? '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');

/** The last nine digits of a phone number: the same person whether it is typed 091…, +21891… or 0021891…. */
const phoneKey = (phone: string | undefined) => {
  const d = digits(phone);
  return d.length >= 7 ? d.slice(-9) : '';
};

/**
 * The other projects a worker has worked on, found by his phone number (a worker is recorded per project, so
 * the number is what ties his records together). Names of projects only, each once, the newest record first.
 */
export function previousProjects(
  worker: Pick<Worker, 'id' | 'clientId' | 'phone'>,
  workers: readonly Pick<Worker, 'id' | 'clientId' | 'phone' | 'createdAt'>[],
  clients: readonly Pick<Client, 'id' | 'name'>[],
): string[] {
  const key = phoneKey(worker.phone);
  if (!key) return [];
  const names = new Map(clients.map((c) => [c.id, c.name]));
  const seen = new Set<string>();
  return [...workers]
    .filter((w) => w.id !== worker.id && w.clientId !== worker.clientId && phoneKey(w.phone) === key)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .map((w) => names.get(w.clientId))
    .filter((name): name is string => !!name && !seen.has(name) && !!seen.add(name));
}
