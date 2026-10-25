// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StatCard } from './StatCard';
import { Amount } from './CurrencyAmount';
import { InsightsList } from '../../ui/pages-legacy/client-profile/overview/InsightsList';
import type { ClientInsight } from '../../core/finance/clientInsights';
import { ClientModules, type ClientModuleStats } from '../../ui/pages-legacy/client-profile/ClientModules';
import { computeClientAccount } from '../../core/finance/clientProfitTotals';
import type { ClientProfileCaps, ClientSummary } from '../../ui/pages-legacy/client-profile/types';
import { ClientProfileHero } from './ClientProfileHero';
import { AccountFigures } from '../../ui/pages-legacy/client-profile/overview/AccountFigures';
import { ClientOverview } from '../../ui/pages-legacy/client-profile/overview/ClientOverview';

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('fits a large exact financial value after resizing without clipping or rounding the data', async () => {
  let width = 140;
  let resize = () => {};
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback; }
    observe() {} disconnect() {}
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('stat-card-value') ? width : 0; });
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('stat-card-value') ? width : 0; });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const parent = this.closest<HTMLElement>('.stat-card-value');
    const digitWidth = (this.textContent?.length ?? 0) * Number.parseFloat(parent?.style.fontSize || '24') * 0.6;
    return { width: digitWidth } as DOMRect;
  });
  await act(async () => root.render(createElement(StatCard, { label: 'الرصيد', value: createElement(Amount, { amount: -999999999.375 }) })));
  const value = host.querySelector<HTMLElement>('.stat-card-value')!;
  expect(value.textContent).toContain('−999,999,999.375');
  expect(Number.parseFloat(value.style.fontSize)).toBeGreaterThanOrEqual(14);
  expect(Number.parseFloat(value.style.fontSize)).toBeLessThan(24);
  width = 60; resize();
  expect(value.dataset.wrapNumber).toBe('true');
  width = 400; resize();
  expect(value.style.fontSize).toBe('24px');
  expect(value.dataset.wrapNumber).toBe('false');
  expect(value.textContent).toContain('−999,999,999.375');
});

const insights: ClientInsight[] = [
  { id: 'one', severity: 'danger', title: 'التحصيل ضعيف', reason: 'المحصّل أقل من المصروف.', action: 'payments' },
  { id: 'two', severity: 'warning', title: 'مستحقات عامل', reason: 'دفعات تحتاج متابعة.', action: 'workers' },
  { id: 'three', severity: 'info', title: 'مراجعة مرحلة', reason: 'أعمال مرحلة جديدة.', action: 'phases' },
];
it('shows priorities and explicit destinations while keeping unavailable observations readable', async () => {
  const action = vi.fn();
  await act(async () => root.render(createElement(InsightsList, { insights, onAction: action, unavailable: ['workers'], limit: 2 })));
  expect(host.textContent).toContain('عاجل'); expect(host.textContent).toContain('مستحقات عامل');
  const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('button')];
  expect(buttons().some((button) => button.textContent?.includes('مستحقات عامل'))).toBe(false);
  await act(async () => buttons().find((button) => button.textContent?.includes('مراجعة التحصيل'))!.click());
  expect(action).toHaveBeenCalledExactlyOnceWith('payments');
  await act(async () => buttons().find((button) => button.getAttribute('aria-expanded') === 'false')!.click());
  expect(host.textContent).toContain('مراجعة مرحلة');
  await act(async () => buttons().find((button) => button.textContent?.includes('متابعة المراحل'))!.click());
  expect(action).toHaveBeenLastCalledWith('phases');
});
it('renders a calm empty state with no dead action', async () => {
  await act(async () => root.render(createElement(InsightsList, { insights: [], onAction: vi.fn() })));
  expect(host.textContent).toContain('لا توجد ملاحظات');
  expect(host.querySelectorAll('button')).toHaveLength(0);
});

const stats: ClientModuleStats = { expenses: 0, payments: 0, debts: 0, workers: 0, balances: 0, phases: 0, boq: 0, reports: 0, custodyRemaining: 0, custodyGiven: 0, custodyExact: true, phasesBudget: 0, boqTotal: 0, latestProgress: undefined, invoices: 0, invoicesRemaining: 0, invoicesOverdue: 0, letters: 0 };
const summary: ClientSummary = { ...computeClientAccount({ totalExpenses: 0, totalDebts: 0, totalPaid: 0 }), totalExpenses: 0, totalDebts: 0, totalPaid: 0, totalWorkersDue: 0, totalWorkersAgreed: 0, totalWorkersPaid: 0 };
const caps: ClientProfileCaps = { expenseScope: 'all', payments: true, debts: true, workers: true, custody: true, projects: true, invoices: true, letters: true, showSummary: true };
it('keeps all four primary client record sections visible and usable even with no transactions', async () => {
  const open = vi.fn();
  await act(async () => root.render(createElement(ClientModules, { section: 'records', stats, summary, caps, canEditProfit: true, onOpenSheet: open, onOpenProfit: vi.fn() })));
  for (const [label, route] of [['المصروفات', 'expenses'], ['المدفوعات', 'payments'], ['العمال', 'workers'], ['الديون', 'debts']]) {
    const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find((item) => item.getAttribute('aria-label') === `فتح ${label}`);
    expect(button, label).toBeDefined();
    expect(button!.disabled).toBe(false);
    expect(button!.querySelector('svg')).not.toBeNull();
    await act(async () => button!.click());
    expect(open).toHaveBeenLastCalledWith(route);
  }
  expect(host.textContent).not.toContain('متابعة المشروع');
  expect(host.querySelector('.stat-card-value')).toBeNull();
});
it('keeps personal expenses available without exposing client financial modules outside the permission scope', async () => {
  await act(async () => root.render(createElement(ClientModules, { section: 'records', stats, summary, caps: { ...caps, expenseScope: 'own', payments: false, debts: false, workers: false, custody: false, showSummary: false }, canEditProfit: false, onOpenSheet: vi.fn(), onOpenProfit: vi.fn() })));
  expect(host.querySelector('[aria-label="فتح مصروفاتي"]')).not.toBeNull();
  expect(host.querySelectorAll('button')).toHaveLength(1);
});
it('preserves the client identity, saved status, callable phone and header actions', async () => {
  const edit = vi.fn(); const add = vi.fn();
  const name = 'مشروع عمارة الأندلس للأعمال الإنشائية والتشطيبات';
  await act(async () => root.render(createElement(ClientProfileHero, {
    initial: 'م', isCompany: true, clientName: name, phone: '091 123 4567', address: 'طرابلس، الموقع الرئيسي', statusLabel: 'مكتمل',
    onSettings: edit, actions: createElement('button', { onClick: add }, 'إضافة مصروف'),
    showProfitBadge: true, profitPercentage: 10, profitBaseLabel: 'من المصروفات',
  })));
  expect(host.querySelector('h1')?.textContent).toBe(name);
  expect(host.textContent).toContain('مكتمل'); expect(host.textContent).toContain('10%');
  expect(host.querySelector('a')?.getAttribute('href')).toBe('tel:0911234567');
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="إعدادات العميل"]')!.click());
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'إضافة مصروف')!.click());
  expect(edit).toHaveBeenCalledOnce(); expect(add).toHaveBeenCalledOnce();
});

it('keeps record entry points in the continuous Rkeaz layout when the account is empty or loading', async () => {
  const open = vi.fn();
  for (const loading of [false, true]) {
    await act(async () => root.render(createElement(ClientOverview, {
      summary, expenses: [], payments: [], debts: [], custody: {}, phaseBudgetRows: [], onAction: vi.fn(), loading,
      afterInsights: createElement(ClientModules, { section: 'records', stats, summary, caps, canEditProfit: true, onOpenSheet: open, onOpenProfit: vi.fn() }),
    })));
    expect(host.querySelector('[role="tablist"]')).toBeNull();
    const records = host.querySelector('nav[aria-label="الأقسام"]')!;
    expect(records).not.toBeNull();
    const workers = records.querySelector<HTMLButtonElement>('[aria-label="فتح العمال"]')!;
    await act(async () => workers.click());
    expect(open).toHaveBeenLastCalledWith('workers');
    if (!loading) {
      const board = host.querySelector('[aria-label="ملخص حساب العميل"]')!;
      expect(board.compareDocumentPosition(records) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  }
});

it('shows the actual account balance after debts and the agreed percentage, with full dinar precision', async () => {
  const account = { ...summary, totalPaid: 20000, totalExpenses: 15000.37, totalDebts: 1000, ...computeClientAccount({ totalPaid: 20000, totalExpenses: 15000.37, totalDebts: 1000, profitPercentage: 10, profitBase: 'expenses' }) };
  await act(async () => root.render(createElement(AccountFigures, { summary: account })));
  expect(host.textContent).toContain('الصافي المتبقي');
  expect(host.textContent).toContain('2,499.593');
  expect(host.textContent).not.toContain('4,999.63');
  expect(host.textContent).toContain('1,500.037');
  await act(async () => root.render(createElement(AccountFigures, { summary })));
  expect(host.textContent).toContain('غير محددة');
});

it('opens financial records while withholding a restricted percentage action and unavailable worker figures', async () => {
  const action = vi.fn();
  await act(async () => root.render(createElement(AccountFigures, { summary: { ...summary, totalWorkersDue: 9999 }, onAction: action, unavailable: ['profit'] })));
  expect(host.textContent).not.toContain('9,999');
  expect(host.textContent).not.toContain('متبقي العمال');
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('button')];
  expect(buttons.some((button) => button.textContent?.includes('النسبة المتفق عليها'))).toBe(false);
  await act(async () => buttons.find((button) => button.textContent?.includes('إجمالي المدفوعات'))!.click());
  expect(action).toHaveBeenCalledWith('payments');
  await act(async () => buttons.find((button) => button.textContent?.includes('الديون المستحقة'))!.click());
  expect(action).toHaveBeenCalledWith('debts');
});

it('keeps worker dues actionable before the first expense or payment is recorded', async () => {
  const action = vi.fn();
  await act(async () => root.render(createElement(ClientOverview, {
    summary: { ...summary, totalWorkersDue: 11000 }, expenses: [], payments: [], debts: [], custody: {}, phaseBudgetRows: [], workerSummary: { remaining: 11000 }, onAction: action,
  })));
  expect(host.querySelector('[aria-label="ملخص حساب العميل"]')).not.toBeNull();
  const worker = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('مراجعة مستحقات العمال'))!;
  expect(worker).toBeDefined();
  await act(async () => worker.click());
  expect(action).toHaveBeenCalledWith('workers');
});
