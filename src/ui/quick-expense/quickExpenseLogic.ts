import type { Expense } from '../../types';
import { roundMoney, splitAgainstCustody } from '../../core/finance/custodyFifo';
import { fromMilli, toMilli, parseMoneyText } from '../../core/finance/money';
import { multiplyQuantityPrice } from '../../core/utils-formatters';

/**
 * Pure logic of the quick expense flow (no React, no Firebase): the amount keypad, ranking of recent
 * clients and categories, the custody preview, the people list and the exact shape of the document
 * that is written. Kept apart so every rule here is unit tested.
 */

/* ── Amount keypad ──────────────────────────────────────────────────────── */

/** Three decimals is what the app stores (thousandths of a dinar). */
export const MAX_DECIMALS = 3;
/** Up to 999,999,999: more digits than any field expense and the display stays one line. */
export const MAX_INT_DIGITS = 9;

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'BS' | 'C';

/** The text of the amount after one key press. The amount is kept as typed ("12.", "0.05"). */
export function pressAmountKey(current: string, key: PadKey | string): string {
  if (key === 'C') return '';
  if (key === 'BS') return current.slice(0, -1);
  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }
  if (!/^[0-9]$/.test(key)) return current;

  const dot = current.indexOf('.');
  if (dot >= 0) {
    return current.length - dot - 1 >= MAX_DECIMALS ? current : current + key;
  }
  if (current === '0') return key; // never "05"
  return current.length >= MAX_INT_DIGITS ? current : current + key;
}

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** Maps a physical keyboard key to a pad key (Latin and Arabic-Indic digits, decimal marks, Backspace). */
export function padKeyFromKeyboard(key: string): PadKey | null {
  if (/^[0-9]$/.test(key)) return key as PadKey;
  const indic = ARABIC_INDIC.indexOf(key);
  if (key.length === 1 && indic >= 0) return String(indic) as PadKey;
  if (key === '.' || key === ',' || key === '٫' || key === '،') return '.';
  if (key === 'Backspace') return 'BS';
  return null;
}

/** "1234567.5" becomes "1,234,567.5"; a trailing "." and typed zeros are kept so typing feels natural. */
export function formatAmountInput(raw: string): string {
  if (!raw) return '';
  const [int, dec] = raw.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec === undefined ? grouped : `${grouped}.${dec}`;
}

export function parseAmount(raw: string): number {
  if (!raw) return 0;
  const n = parseMoneyText(raw);
  return n != null && n > 0 && n <= 999999999 ? roundMoney(n) : 0;
}

/** A number from the calculator, as the keypad text (three decimals at most, never scientific notation). */
export function amountToInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const capped = Math.min(value, 10 ** MAX_INT_DIGITS - 1);
  const rounded = fromMilli(toMilli(capped));
  return String(rounded);
}

/* ── Dates ──────────────────────────────────────────────────────────────── */

/** The local calendar day as YYYY-MM-DD (never the UTC day: a late evening in Libya is still today). */
export function localISODate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ── Recent clients and categories ──────────────────────────────────────── */

type ExpenseLike = Pick<Expense, 'clientId' | 'category' | 'userId' | 'createdAt' | 'date'>;

const stamp = (e: Pick<Expense, 'createdAt' | 'date'>): number => {
  const t = Date.parse(e.createdAt || e.date || '');
  return Number.isFinite(t) ? t : 0;
};

/**
 * The clients a person recorded expenses on, most recent first. `valid` limits the result to clients
 * that still exist (and that this person may see).
 */
export function rankRecentClients(
  expenses: readonly ExpenseLike[],
  userId: string | undefined,
  valid: ReadonlySet<string>,
  limit = 6,
): string[] {
  if (!userId) return [];
  const latest = new Map<string, number>();
  for (const e of expenses) {
    if (e.userId !== userId || !e.clientId || !valid.has(e.clientId)) continue;
    const t = stamp(e);
    if (t >= (latest.get(e.clientId) ?? -1)) latest.set(e.clientId, t);
  }
  return [...latest.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
}

/** Joins ranked lists in order without repeats (first list wins), up to `limit`. */
export function mergeRanked(lists: readonly (readonly string[])[], limit: number): string[] {
  const out: string[] = [];
  for (const list of lists) {
    for (const id of list) {
      if (!out.includes(id)) out.push(id);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Categories offered when a person has no history of their own. */
export const COMMON_CATEGORIES = ['materials', 'labor', 'transport', 'equipment', 'fuel', 'tools', 'concrete', 'rebar', 'cement', 'sand', 'plumbing', 'electrical', 'hospitality', 'other'] as const;

export const DEFAULT_CATEGORY = 'materials';

/**
 * Which categories to show first: the last one used, then what this person records most, then the
 * common ones. `allKeys` are the categories the app knows; anything else is dropped.
 */
export function rankCategories(
  expenses: readonly ExpenseLike[],
  userId: string | undefined,
  lastUsed: string | undefined,
  allKeys: readonly string[],
  limit = 12,
): string[] {
  const known = new Set(allKeys);
  const counts = new Map<string, { n: number; at: number }>();
  for (const e of expenses) {
    if (!userId || e.userId !== userId || !known.has(e.category)) continue;
    const cur = counts.get(e.category) ?? { n: 0, at: 0 };
    counts.set(e.category, { n: cur.n + 1, at: Math.max(cur.at, stamp(e)) });
  }
  const used = [...counts.entries()].sort((a, b) => b[1].n - a[1].n || b[1].at - a[1].at).map(([k]) => k);
  const first = lastUsed && known.has(lastUsed) ? [lastUsed] : [];
  return mergeRanked([first, used, COMMON_CATEGORIES.filter((k) => known.has(k)), allKeys], limit);
}

/** What is written as the description when the person leaves it empty. */
export function defaultDescription(categoryLabel: string, clientName?: string): string {
  const label = categoryLabel.trim();
  const client = clientName?.trim();
  return client ? `${label} · ${client}` : label;
}

/* ── Custody preview ────────────────────────────────────────────────────── */

export interface CustodyPreview {
  /** What the custody holds now (negative when it is already in deficit). */
  remaining: number;
  amount: number;
  /** What would be left (negative = deficit). */
  after: number;
  /** The part of the amount the custody covers. */
  fromBalance: number;
  /** The part beyond the custody: it is deducted from the next custody. */
  deficit: number;
  exceeds: boolean;
}

export function previewCustody(remaining: number, amount: number): CustodyPreview {
  const r = roundMoney(remaining);
  const a = roundMoney(amount > 0 ? amount : 0);
  const { fromBalance, deficit } = splitAgainstCustody(r, a);
  return { remaining: r, amount: a, after: roundMoney(r - a), fromBalance, deficit, exceeds: deficit > 0 };
}

export interface CustodyWarning {
  lead: string;
  /** The figure that sits between `lead` and `tail`. */
  amount: number;
  tail: string;
}

/** The warning sentence in parts, so the number can be set as a proper isolated amount. `who` is the owner's name, absent for "me". */
export function custodyWarning(p: CustodyPreview, who?: string): CustodyWarning | null {
  if (!p.exceeds) return null;
  const owner = who ? `عهدة ${who}` : 'عهدتك';
  const next = who ? 'عهدته القادمة' : 'عهدتك القادمة';
  if (p.fromBalance <= 0) {
    return { lead: `${owner} منتهية، وسيُخصم`, amount: p.deficit, tail: `من ${next}` };
  }
  return { lead: `يتجاوز ${owner} بمقدار`, amount: p.deficit, tail: `وسيُخصم من ${next}` };
}

/* ── Search ─────────────────────────────────────────────────────────────── */

/** Arabic-friendly text for matching: no diacritics or tatweel, one form of alef, ya and ta marbuta. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  return fields.some((f) => f && normalizeSearch(f).includes(q));
}

/* ── People (recording on behalf of someone) ────────────────────────────── */

export interface Person {
  id: string;
  name: string;
}

export interface DirectoryUser {
  id: string;
  uid?: string;
  displayName?: string;
}

/**
 * Everyone in the directory except me, those who recorded most recently first, then by name.
 * The Firebase Auth uid (`uid`, else the document id) is the identity expenses are owned by.
 */
export function listOtherPeople(
  directory: readonly DirectoryUser[],
  meId: string,
  expenses: readonly Pick<Expense, 'userId' | 'createdAt' | 'date'>[],
): Person[] {
  const lastSeen = new Map<string, number>();
  for (const e of expenses) {
    if (!e.userId) continue;
    const t = stamp(e);
    if (t > (lastSeen.get(e.userId) ?? 0)) lastSeen.set(e.userId, t);
  }
  const seen = new Set<string>([meId]);
  const people: Person[] = [];
  for (const u of directory) {
    const id = u.uid || u.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    people.push({ id, name: u.displayName?.trim() || 'مستخدم' });
  }
  return people.sort(
    (a, b) => (lastSeen.get(b.id) ?? 0) - (lastSeen.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'ar'),
  );
}

/** How many people are shown without a search box. */
export const PEOPLE_SEARCH_THRESHOLD = 6;

/* ── The document that is written ───────────────────────────────────────── */

export interface QuickExpenseInput {
  id: string;
  now: Date;
  clientId: string;
  amount: number;
  category: string;
  /** What the person typed; empty falls back to `fallbackDescription`. */
  description: string;
  fallbackDescription: string;
  /** Optional reference of the paper invoice; trimmed, omitted when empty. */
  invoiceNumber: string;
  /** The person the expense belongs to (custody and lists follow `userId`). */
  owner: Person;
  date?: string;
  notes?: string;
  phaseId?: string;
  quantity?: number;
  unitPrice?: number;
  unit?: string;
}

/**
 * The expense exactly as the rest of the app writes a new one. No `createdByRole`, no
 * `isHiddenFromEmployees`; a receipt photo is attached after the save is confirmed.
 */
export function buildQuickExpense(input: QuickExpenseInput): Expense {
  const iso = input.now.toISOString();
  const invoiceNumber = input.invoiceNumber.trim();
  return {
    id: input.id,
    clientId: input.clientId,
    description: input.description.trim() || input.fallbackDescription,
    amount: roundMoney(input.amount),
    category: input.category as Expense['category'],
    date: input.date || localISODate(input.now),
    isClosed: false,
    createdAt: iso,
    updatedAt: iso,
    userId: input.owner.id,
    createdBy: input.owner.name || 'غير معروف',
    ...(invoiceNumber ? { invoiceNumber } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    ...(input.phaseId ? { phaseId: input.phaseId } : {}),
    ...(input.quantity != null && input.unitPrice != null ? {
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      ...(input.unit ? { unit: input.unit } : {}),
      amount: multiplyQuantityPrice(input.quantity, input.unitPrice),
    } : {}),
  };
}

export interface QuantityResult { quantity: number; unitPrice: number; amount: number; error?: string }

/** Quantities keep six decimals; prices and the resulting expense use thousandths of a dinar. */
export function calculateQuickQuantity(quantityText: string, priceText: string): QuantityResult {
  const quantity = parseMoneyText(quantityText) ?? 0;
  const unitPrice = parseMoneyText(priceText) ?? 0;
  const amount = multiplyQuantityPrice(quantity, unitPrice);
  let error: string | undefined;
  if (quantity <= 0 || unitPrice <= 0) error = 'أدخل كمية وسعر وحدة أكبر من صفر';
  else if (!Number.isInteger(Number((quantity * 1e6).toPrecision(12)))) error = 'الكمية تقبل 6 خانات عشرية كحد أقصى';
  else if (!Number.isInteger(Number((unitPrice * 1000).toPrecision(12)))) error = 'سعر الوحدة يقبل 3 خانات عشرية كحد أقصى';
  else if (amount <= 0) error = 'الإجمالي أقل من 0.001 د.ل، راجع الكمية والسعر';
  else if (amount > 999999999 || !Number.isFinite(amount)) error = 'الإجمالي كبير جدًا، راجع الكمية والسعر';
  return { quantity, unitPrice, amount, ...(error ? { error } : {}) };
}

/** Compare the immutable request, ignoring server metadata and later review/closing fields. */
export function sameQuickExpenseRequest(a: Expense, b: Expense): boolean {
  const fields: (keyof Expense)[] = ['id', 'clientId', 'userId', 'amount', 'category', 'description', 'date', 'invoiceNumber', 'notes', 'quantity', 'unitPrice', 'unit', 'phaseId', 'createdAt'];
  return fields.every((field) => (a[field] ?? '') === (b[field] ?? ''));
}

/** Only visible entries are considered: this warning never fetches somebody else's expenses. */
export function findPossibleDuplicate(expenses: readonly Expense[], input: Pick<Expense, 'clientId' | 'category' | 'amount' | 'date' | 'userId'>): Expense | undefined {
  if (input.amount <= 0 || !input.clientId) return undefined;
  return expenses.find((expense) => expense.clientId === input.clientId && expense.userId === input.userId && expense.category === input.category && expense.date === input.date && toMilli(expense.amount) === toMilli(input.amount));
}

/* ── Saving ─────────────────────────────────────────────────────────────── */

/** How long a save may stay silent before the sheet reports it (a weak connection holds writes back). */
export const SAVE_TIMEOUT_MS = 15000;

/**
 * Rejects with `message` when `work` has not settled in `ms`. The write itself is not cancelled: a
 * retry reuses the same document id, so a late success and a retry never make two expenses.
 */
export function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
