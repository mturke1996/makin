import { parseDecimalInput } from '../../../../core/utils-formatters';
import type { WorkerLedgerStatus } from '../../../../core/finance/workerLedger';

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/** YYYY-MM-DD → DD/MM/YYYY (أرقام لاتينية دائماً). */
export function formatDay(day: string | null | undefined): string {
  if (!day) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : day;
}

export function monthLabel(year: number, month: number): string {
  if (!month) return 'بدون تاريخ';
  return `${MONTHS[month - 1]} ${year}`;
}

/** اليوم المحلي بصيغة YYYY-MM-DD. */
export function todayDay(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const AR_DIGITS = /[٠-٩]/g;
const FA_DIGITS = /[۰-۹]/g;

/** يحوّل الأرقام العربية/الفارسية والفاصلة العربية إلى لاتينية أثناء الكتابة. */
export function normalizeDigits(raw: string): string {
  return raw
    .replace(AR_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(FA_DIGITS, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/٬/g, '');
}

/** رقم من نص حقل إدخال (يقبل 12,5 و 12.5 والأرقام العربية). undefined عند الفراغ أو الخطأ. */
export function parseNumberInput(raw: string): number | undefined {
  return parseDecimalInput(normalizeDigits(raw));
}

/** رقم → نص لحقل إدخال دون كسور زائدة. */
export function numberToInput(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '';
  return String(Number(n.toFixed(3)));
}

export const LEDGER_STATUS_META: Record<WorkerLedgerStatus, { label: string; tone: 'neutral' | 'info' | 'success' | 'danger' }> = {
  not_started: { label: 'لم تبدأ الدفعات', tone: 'neutral' },
  in_progress: { label: 'قيد الصرف', tone: 'info' },
  settled: { label: 'مسدد بالكامل', tone: 'success' },
  overpaid: { label: 'دُفع أكثر من المتفق', tone: 'danger' },
};

/** رابط اتصال: يُبقي الأرقام وعلامة + فقط. */
export function telHref(phone: string): string {
  return `tel:${normalizeDigits(phone).replace(/[^\d+]/g, '')}`;
}
