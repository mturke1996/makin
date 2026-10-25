/**
 * The company's own copy of its data: every collection the signed-in manager can read, as one file. Pure functions
 * (no Firebase, no browser), so the file's shape and the reminder rule are unit-tested.
 */

export const BACKUP_FORMAT = 'makin-backup';
export const BACKUP_VERSION = 1;
/** A manager who has not taken a copy for this many days is reminded. */
export const BACKUP_DUE_DAYS = 7;

/** The collections in the file, in reading order, with the name a person knows them by. */
export const BACKUP_SETS = [
  { key: 'clients', label: 'العملاء والمشاريع' },
  { key: 'invoices', label: 'الفواتير' },
  { key: 'payments', label: 'المدفوعات' },
  { key: 'paymentMilestones', label: 'جدول الدفعات' },
  { key: 'expenses', label: 'المصروفات' },
  { key: 'expenseInvoices', label: 'فواتير المصروفات' },
  { key: 'standaloneDebts', label: 'الديون' },
  { key: 'debtParties', label: 'أطراف الديون' },
  { key: 'workers', label: 'العمال' },
  { key: 'workerAttendance', label: 'الحضور اليومي' },
  { key: 'userBalances', label: 'العهد' },
  { key: 'projectPhases', label: 'مراحل المشاريع' },
  { key: 'boqItems', label: 'جدول الكميات' },
  { key: 'siteReports', label: 'تقارير الموقع' },
  { key: 'letters', label: 'الرسائل والخطابات' },
] as const;

export type BackupKey = (typeof BACKUP_SETS)[number]['key'];
export type BackupInput = Partial<Record<BackupKey, readonly object[]>>;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  createdBy: string;
  /** Records per collection, to check a file against what the screen said when it was taken. */
  counts: Record<BackupKey, number>;
  data: Record<BackupKey, object[]>;
}

/** Fields the app adds for its own bookkeeping; they are not part of the record. */
const INTERNAL = new Set(['_docId']);

const clean = (record: object): object => Object.fromEntries(Object.entries(record).filter(([k]) => !INTERNAL.has(k)));

export function buildBackup(input: BackupInput, meta: { at: Date; by: string }): BackupFile {
  const data = {} as Record<BackupKey, object[]>;
  const counts = {} as Record<BackupKey, number>;
  for (const { key } of BACKUP_SETS) {
    const rows = (input[key] ?? []).map(clean);
    data[key] = rows;
    counts[key] = rows.length;
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: meta.at.toISOString(), createdBy: meta.by, counts, data };
}

export const totalRecords = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

const two = (n: number) => String(n).padStart(2, '0');

/** `makin-backup-2026-10-25-1430.json` (local date and time, so two copies in a day do not overwrite each other). */
export function backupFileName(at: Date, extension: 'json' | 'xlsx' = 'json'): string {
  return `makin-backup-${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}-${two(at.getHours())}${two(at.getMinutes())}.${extension}`;
}

/** Whole days since the last copy; null when there never was one (or the stored time is unreadable). */
export function backupAgeDays(lastIso: string | null | undefined, now: Date): number | null {
  if (!lastIso) return null;
  const t = Date.parse(lastIso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

/** Remind when there is data worth keeping and no copy in the last `BACKUP_DUE_DAYS` days. */
export function backupDue(lastIso: string | null | undefined, now: Date, recordCount: number): boolean {
  if (recordCount <= 0) return false;
  const age = backupAgeDays(lastIso, now);
  return age === null || age >= BACKUP_DUE_DAYS;
}

/** Is this text a backup this version of the app wrote? (for a future restore or a quick check of a file) */
export function isBackupFile(value: unknown): value is BackupFile {
  const v = value as Partial<BackupFile> | null;
  return !!v && typeof v === 'object' && v.format === BACKUP_FORMAT && typeof v.version === 'number' && !!v.data && !!v.counts;
}
