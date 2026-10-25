/** Arabic count phrases for the client's invoices and letters: «فاتورة واحدة»، «فاتورتان»، «5 فواتير»، «12 فاتورة». */
const FORMS = {
  invoices: { none: 'لا فواتير بعد', one: 'فاتورة واحدة', two: 'فاتورتان', few: 'فواتير', many: 'فاتورة' },
  letters: { none: 'لا رسائل بعد', one: 'رسالة واحدة', two: 'رسالتان', few: 'رسائل', many: 'رسالة' },
} as const;

export type ExtrasCountKind = keyof typeof FORMS;

export function extrasCountPhrase(kind: ExtrasCountKind, n: number): string {
  const f = FORMS[kind];
  if (n <= 0) return f.none;
  if (n === 1) return f.one;
  if (n === 2) return f.two;
  return `${n} ${n <= 10 ? f.few : f.many}`;
}
