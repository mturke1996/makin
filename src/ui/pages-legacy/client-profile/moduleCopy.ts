/** Arabic count phrases: «لا مصروفات بعد»، «مصروف واحد»، «مصروفان»، «5 مصروفات»، «18 مصروفاً». */
interface Forms {
  none: string;
  one: string;
  two: string;
  few: string;
  many: string;
}

const FORMS = {
  expenses: { none: 'لا مصروفات بعد', one: 'مصروف واحد', two: 'مصروفان', few: 'مصروفات', many: 'مصروفاً' },
  payments: { none: 'لا دفعات بعد', one: 'دفعة واحدة', two: 'دفعتان', few: 'دفعات', many: 'دفعة' },
  debts: { none: 'لا ديون بعد', one: 'دين واحد', two: 'دينان', few: 'ديون', many: 'ديناً' },
  workers: { none: 'لا عمال بعد', one: 'عامل واحد', two: 'عاملان', few: 'عمال', many: 'عاملاً' },
  balances: { none: 'لا حركات بعد', one: 'حركة واحدة', two: 'حركتان', few: 'حركات', many: 'حركة' },
  phases: { none: 'لا مراحل بعد', one: 'مرحلة واحدة', two: 'مرحلتان', few: 'مراحل', many: 'مرحلة' },
  boq: { none: 'لا بنود بعد', one: 'بند واحد', two: 'بندان', few: 'بنود', many: 'بنداً' },
  milestones: { none: 'لا جدول بعد', one: 'دفعة واحدة', two: 'دفعتان', few: 'دفعات', many: 'دفعة' },
  reports: { none: 'لا تقارير بعد', one: 'تقرير واحد', two: 'تقريران', few: 'تقارير', many: 'تقريراً' },
} satisfies Record<string, Forms>;

export type CountKind = keyof typeof FORMS;

export function countPhrase(kind: CountKind, n: number): string {
  const f = FORMS[kind];
  if (n <= 0) return f.none;
  if (n === 1) return f.one;
  if (n === 2) return f.two;
  return `${n} ${n <= 10 ? f.few : f.many}`;
}
