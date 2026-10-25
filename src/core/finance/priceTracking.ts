import type { Expense } from '../../types';
import { expenseHasQuantityLine } from '../utils-formatters';
import { fromMilli, toMilli } from './money';

/**
 * سجل أسعار المواد. المادة = وصف المصروف (بعد توحيد كتابته) + التصنيف + وحدة القياس، فشراء «أسمنت» بالكيس لا
 * يُقارَن بشراء «أسمنت» بالطن. لا يدخل إلا مصروف له سطر كمية × سعر. التنبيه عند ارتفاع السعر عن المعتاد
 * (وسيط آخر مشتريات سابقة لنفس المادة)، ولا يصدر قبل أن تتوفر مشتريتان سابقتان على الأقل.
 */

/** ارتفاع السعر عن المعتاد بهذه النسبة أو أكثر يُنبَّه إليه. */
export const PRICE_RISE_ALERT = 0.15;
/** عدد المشتريات السابقة الأقل التي تلزم لمقارنة معقولة. */
export const MIN_PRIOR_PURCHASES = 2;
/** المشتريات السابقة التي يُحسب منها المعتاد (الأحدث). */
export const BASELINE_PURCHASES = 5;
/** أيام النظر إلى الوراء في «ارتفاعات الأسعار الأخيرة». */
export const RECENT_DAYS = 14;

/** توحيد كتابة الوصف: بلا تشكيل ولا تطويل، وهمزات الألف والتاء المربوطة والياء، ومسافات مفردة. */
export function normalizeMaterial(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function materialKey(e: Pick<Expense, 'description' | 'category' | 'unit'>): string {
  return [e.category ?? '', normalizeMaterial(e.description ?? ''), normalizeMaterial(e.unit ?? '')].join('|');
}

export interface PricePoint {
  expenseId: string;
  /** YYYY-MM-DD */
  date: string;
  unitPrice: number;
  quantity: number;
  supplierId?: string;
  supplierName?: string;
  clientId: string;
}

export interface MaterialPrices {
  key: string;
  /** كتابة الوصف في أحدث شراء. */
  name: string;
  unit: string;
  category: string;
  /** الأقدم أولاً. */
  points: PricePoint[];
}

const dayOf = (value: string | undefined) => (value ?? '').slice(0, 10);

const isTracked = (e: Expense) => expenseHasQuantityLine(e) && (e.unitPrice ?? 0) > 0 && !!normalizeMaterial(e.description ?? '');

export function buildPriceBook(expenses: readonly Expense[]): MaterialPrices[] {
  const book = new Map<string, MaterialPrices>();
  const ordered = expenses.filter(isTracked).sort((a, b) => dayOf(a.date).localeCompare(dayOf(b.date)) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id));
  for (const e of ordered) {
    const key = materialKey(e);
    const entry = book.get(key) ?? { key, name: e.description.trim(), unit: (e.unit ?? '').trim(), category: e.category, points: [] };
    entry.name = e.description.trim();
    entry.points.push({ expenseId: e.id, date: dayOf(e.date), unitPrice: e.unitPrice!, quantity: e.quantity!, supplierId: e.supplierId, supplierName: e.supplierName, clientId: e.clientId });
    book.set(key, entry);
  }
  return [...book.values()];
}

/** وسيط أسعار (بالآلاف): لا يتأثر بشراء شاذ واحد كما يتأثر المتوسط. */
export function medianPrice(prices: readonly number[]): number {
  if (prices.length === 0) return 0;
  const sorted = prices.map(toMilli).sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return fromMilli(sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2));
}

export interface PriceAssessment {
  /** كم مشتريات سابقة قورن بها. */
  priorCount: number;
  /** المعتاد: وسيط آخر مشتريات سابقة. */
  usual: number | null;
  /** تغيّر السعر عن المعتاد (0.2 = ارتفع 20%)، أو null إن لم تتوفر مقارنة. */
  change: number | null;
  /** مرتفع بما يستحق التنبيه. */
  high: boolean;
}

/** هل سعر `unitPrice` في هذا التاريخ مرتفع عن معتاد المادة؟ المشتريات السابقة وحدها (`before`) هي مرجع المقارنة. */
export function assessPrice(entry: MaterialPrices | undefined, unitPrice: number, opts: { before?: string; excludeId?: string } = {}): PriceAssessment {
  const prior = (entry?.points ?? []).filter((p) => p.expenseId !== opts.excludeId && (!opts.before || p.date < opts.before));
  const recent = prior.slice(-BASELINE_PURCHASES);
  if (recent.length < MIN_PRIOR_PURCHASES || !(unitPrice > 0)) return { priorCount: prior.length, usual: recent.length ? medianPrice(recent.map((p) => p.unitPrice)) : null, change: null, high: false };
  const usual = medianPrice(recent.map((p) => p.unitPrice));
  if (!(usual > 0)) return { priorCount: prior.length, usual: null, change: null, high: false };
  const change = (toMilli(unitPrice) - toMilli(usual)) / toMilli(usual);
  return { priorCount: prior.length, usual, change, high: change >= PRICE_RISE_ALERT };
}

export interface PriceSpike {
  expense: Expense;
  material: string;
  unit: string;
  unitPrice: number;
  usual: number;
  change: number;
}

/** مشتريات الأيام الأخيرة التي ارتفع سعرها عن معتاد المادة، الأشد ارتفاعاً أولاً. */
export function recentPriceSpikes(expenses: readonly Expense[], now: Date, days = RECENT_DAYS): PriceSpike[] {
  const book = new Map(buildPriceBook(expenses).map((m) => [m.key, m]));
  const since = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const spikes: PriceSpike[] = [];
  for (const e of expenses) {
    if (!isTracked(e) || dayOf(e.date) < since) continue;
    const entry = book.get(materialKey(e));
    const a = assessPrice(entry, e.unitPrice!, { before: dayOf(e.date), excludeId: e.id });
    if (a.high && a.usual !== null && a.change !== null) spikes.push({ expense: e, material: e.description.trim(), unit: (e.unit ?? '').trim(), unitPrice: e.unitPrice!, usual: a.usual, change: a.change });
  }
  return spikes.sort((x, y) => y.change - x.change);
}

export interface MaterialSummary {
  material: MaterialPrices;
  latest: PricePoint;
  usual: number | null;
  /** تغيّر آخر سعر عن المعتاد قبله. */
  change: number | null;
  high: boolean;
  min: number;
  max: number;
  /** أرخص مورّد بآخر سعر عنده، إن كان في المشتريات أكثر من مورّد. */
  cheapest: { name: string; unitPrice: number } | null;
  suppliers: number;
}

export function summarizeMaterial(material: MaterialPrices): MaterialSummary {
  const latest = material.points[material.points.length - 1];
  const a = assessPrice(material, latest.unitPrice, { before: latest.date, excludeId: latest.expenseId });
  const prices = material.points.map((p) => toMilli(p.unitPrice));
  // آخر سعر عند كل مورّد (الأحدث يغلب).
  const bySupplier = new Map<string, PricePoint>();
  for (const p of material.points) if (p.supplierName) bySupplier.set(p.supplierId || p.supplierName, p);
  const cheapestPoint = [...bySupplier.values()].sort((x, y) => toMilli(x.unitPrice) - toMilli(y.unitPrice))[0];
  return {
    material,
    latest,
    usual: a.usual,
    change: a.change,
    high: a.high,
    min: fromMilli(Math.min(...prices)),
    max: fromMilli(Math.max(...prices)),
    cheapest: bySupplier.size > 1 && cheapestPoint ? { name: cheapestPoint.supplierName!, unitPrice: cheapestPoint.unitPrice } : null,
    suppliers: bySupplier.size,
  };
}
