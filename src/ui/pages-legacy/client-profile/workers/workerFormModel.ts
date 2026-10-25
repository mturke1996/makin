import type { Worker, WorkerAgreementItem } from '../../../../types';
import { agreementLineTotal, fromMilli, toMilli, workerAgreementTotal } from '../../../../core/finance/workerLedger';
import { normalizeDigits, numberToInput, parseNumberInput } from './format';
import type { WorkerFormValues } from './types';

/** نموذج العامل: المسودة (نصوص حقول الإدخال)، التحقق، والتحويل إلى قيم جاهزة للحفظ. */

export type AgreementMode = 'lump' | 'items';

export interface LineDraft {
  id: string;
  title: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  /** ملاحظة البند تُحفظ كما هي ولا يعرضها النموذج. */
  note: string;
}

export interface WorkerDraft {
  name: string;
  jobType: string;
  phone: string;
  nationalId: string;
  startDate: string;
  notes: string;
  mode: AgreementMode;
  lump: string;
  lines: LineDraft[];
}

export interface LineErrors {
  title?: string;
  quantity?: string;
  unitPrice?: string;
}

export interface WorkerDraftErrors {
  name?: string;
  phone?: string;
  lump?: string;
  /** خطأ عام في البنود (لا بنود، أو الإجمالي صفر). */
  lines?: string;
  line: Record<string, LineErrors>;
}

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function emptyLine(partial: Partial<LineDraft> = {}): LineDraft {
  return { id: uid(), title: '', quantity: '1', unit: '', unitPrice: '', note: '', ...partial };
}

export function draftFromWorker(worker?: Worker | null, opts?: { itemize?: boolean }): WorkerDraft {
  const items = worker?.agreementItems ?? [];
  const itemized = items.length > 0 && workerAgreementTotal(items) > 0;
  const base = {
    name: worker?.name ?? '',
    jobType: worker?.jobType ?? '',
    phone: worker?.phone ?? '',
    nationalId: worker?.nationalId ?? '',
    startDate: worker?.startDate ?? '',
    notes: worker?.notes ?? '',
  };
  if (itemized) {
    return {
      ...base,
      mode: 'items',
      lump: numberToInput(workerAgreementTotal(items)),
      lines: items.map((it) =>
        emptyLine({
          id: it.id,
          title: it.title,
          quantity: numberToInput(it.quantity),
          unit: it.unit ?? '',
          unitPrice: numberToInput(it.unitPrice),
          note: it.note ?? '',
        })
      ),
    };
  }
  const lump = worker ? numberToInput(worker.totalAmount) : '';
  const draft: WorkerDraft = { ...base, mode: 'lump', lump: lump === '0' ? '' : lump, lines: [emptyLine()] };
  return opts?.itemize ? switchMode(draft, 'items') : draft;
}

/** إجمالي المسودة الحالي بالدقة الكاملة (يتجاهل ما لم يكتمل بعد). */
export function draftTotal(draft: WorkerDraft): number {
  if (draft.mode === 'lump') {
    const v = parseNumberInput(draft.lump);
    return v != null && v > 0 ? fromMilli(toMilli(v)) : 0;
  }
  let total = 0;
  for (const l of draft.lines) total += toMilli(lineDraftTotal(l));
  return fromMilli(total);
}

export function lineDraftTotal(line: LineDraft): number {
  const q = parseNumberInput(line.quantity);
  const p = parseNumberInput(line.unitPrice);
  if (q == null || p == null) return 0;
  return agreementLineTotal({ quantity: q, unitPrice: p });
}

/** تبديل طريقة الاتفاق دون ضياع المبلغ المدخل. */
export function switchMode(draft: WorkerDraft, mode: AgreementMode): WorkerDraft {
  if (mode === draft.mode) return draft;
  if (mode === 'lump') {
    const total = draftTotal(draft);
    return { ...draft, mode, lump: total > 0 ? numberToInput(total) : draft.lump };
  }
  const lump = parseNumberInput(draft.lump);
  const blank = draft.lines.every((l) => !l.title.trim() && !l.unitPrice.trim());
  if (blank && lump != null && lump > 0) {
    return { ...draft, mode, lines: [emptyLine({ quantity: '1', unitPrice: numberToInput(lump) })] };
  }
  return { ...draft, mode, lines: draft.lines.length ? draft.lines : [emptyLine()] };
}

export function validateDraft(draft: WorkerDraft): { errors: WorkerDraftErrors; values: WorkerFormValues | null } {
  const errors: WorkerDraftErrors = { line: {} };
  const name = draft.name.trim();
  if (!name) errors.name = 'أدخل اسم العامل أو المقاول';

  const phone = draft.phone.trim();
  if (phone && normalizeDigits(phone).replace(/\D/g, '').length < 6) errors.phone = 'رقم الهاتف غير صحيح';

  let totalAmount = 0;
  let agreementItems: WorkerAgreementItem[] = [];

  if (draft.mode === 'lump') {
    const v = parseNumberInput(draft.lump);
    if (v == null || v <= 0) errors.lump = 'أدخل المبلغ المتفق عليه (أكبر من صفر)';
    else totalAmount = fromMilli(toMilli(v));
  } else {
    if (draft.lines.length === 0) errors.lines = 'أضف بنداً واحداً على الأقل';
    for (const l of draft.lines) {
      const le: LineErrors = {};
      if (!l.title.trim()) le.title = 'أدخل وصف البند';
      const q = parseNumberInput(l.quantity);
      if (q == null || q <= 0) le.quantity = 'أدخل كمية أكبر من صفر';
      const p = parseNumberInput(l.unitPrice);
      if (p == null || p < 0) le.unitPrice = 'أدخل سعر الوحدة';
      if (le.title || le.quantity || le.unitPrice) errors.line[l.id] = le;
    }
    if (!errors.lines && Object.keys(errors.line).length === 0) {
      agreementItems = draft.lines.map((l) => {
        const item: WorkerAgreementItem = {
          id: l.id,
          title: l.title.trim(),
          quantity: fromMilli(toMilli(parseNumberInput(l.quantity) ?? 0)),
          unitPrice: fromMilli(toMilli(parseNumberInput(l.unitPrice) ?? 0)),
        };
        if (l.unit.trim()) item.unit = l.unit.trim();
        if (l.note.trim()) item.note = l.note.trim();
        return item;
      });
      totalAmount = workerAgreementTotal(agreementItems);
      if (totalAmount <= 0) errors.lines = 'إجمالي الاتفاق يجب أن يكون أكبر من صفر';
    }
  }

  const hasErrors = Boolean(errors.name || errors.phone || errors.lump || errors.lines || Object.keys(errors.line).length);
  if (hasErrors) return { errors, values: null };
  return {
    errors,
    values: {
      name,
      jobType: draft.jobType.trim(),
      phone,
      nationalId: draft.nationalId.trim(),
      startDate: draft.startDate,
      notes: draft.notes.trim(),
      totalAmount,
      agreementItems,
    },
  };
}
