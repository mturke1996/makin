// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountFigures } from './AccountFigures';
import { ClientOverviewSkeleton } from './OverviewSkeleton';
import { ClientPersonalSummary } from '../ClientPersonalSummary';
import { buildOverviewTrend } from '../../../../core/finance/clientAnalytics';
import { computeClientAccount } from '../../../../core/finance/clientProfitTotals';
import type { ClientSummary } from '../types';

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

const account = computeClientAccount({ totalExpenses: 73390, totalDebts: 5000, totalPaid: 85000, profitPercentage: 15 });
const summary = { totalExpenses: 73390, totalDebts: 5000, totalPaid: 85000, totalWorkersDue: 12000, totalWorkersAgreed: 32000, totalWorkersPaid: 20000, ...account } as ClientSummary;
const trend = buildOverviewTrend({
  payments: [{ paymentDate: '2026-09-20', amount: 30000 }, { paymentDate: '2026-10-10', amount: 10000 }] as never,
  expenses: [{ date: '2026-09-05', amount: 14000 }, { date: '2026-10-02', amount: 6000 }] as never,
  today: '2026-10-25',
});
const render = (node: ReturnType<typeof createElement>) => act(async () => root.render(node));

describe('AccountFigures, built like the home page', () => {
  it('has no box around the cards: the board is a titled group of statistic cards', async () => {
    await render(createElement(AccountFigures, { summary, workersDue: 12000, trend }));
    const board = host.querySelector('[aria-label="ملخص حساب العميل"]')!;
    expect(board).not.toBeNull();
    expect(host.querySelector('h2')?.textContent).toBe('اللوحة المالية');
    // card in card is gone: every bordered card is a direct statistic card, none holds another
    const cards = [...board.querySelectorAll<HTMLElement>('.rounded-lg.border')];
    expect(cards).toHaveLength(6);
    expect(cards.every((c) => !c.parentElement!.closest('.rounded-lg.border'))).toBe(true);
  });

  it('puts the month change and curve on collected and spent, as the home page does', async () => {
    await render(createElement(AccountFigures, { summary, trend }));
    expect(host.textContent).toContain('هذا الشهر');
    expect(host.querySelectorAll('[role="img"]')).toHaveLength(2);
    expect(host.querySelector('[aria-label^="المحصّل الشهري"]')).not.toBeNull();
    expect(host.querySelector('[aria-label^="المصروفات الشهرية"]')).not.toBeNull();
  });

  it('carries only the figures when there is no trend, and keeps the exact amounts', async () => {
    await render(createElement(AccountFigures, { summary: { ...summary, totalExpenses: 15000.37 } }));
    expect(host.querySelectorAll('[role="img"]')).toHaveLength(0);
    expect(host.textContent).toContain('15,000.37');
    expect(host.textContent).toContain('المحصّل من العميل');
  });

  it('shows how much of what the account owes is covered, once, on the balance card', async () => {
    await render(createElement(AccountFigures, { summary, trend }));
    const bars = host.querySelectorAll('[role="progressbar"]');
    expect(bars).toHaveLength(1);
    // 85,000 collected against 85,000 + 4,398.5 owed
    expect(bars[0].getAttribute('aria-valuenow')).toBe('95');
    expect(host.textContent).toContain('عجز الحساب');
  });

  it('leaves out the workers card when the viewer has no workers access', async () => {
    await render(createElement(AccountFigures, { summary: { ...summary, totalWorkersDue: 9999 } }));
    expect(host.textContent).not.toContain('متبقي العمال');
    await render(createElement(AccountFigures, { summary, workersDue: 12000 }));
    expect(host.textContent).toContain('متبقي العمال');
  });

  it('opens its sheet from a card and leaves a restricted card as plain text', async () => {
    const onAction = vi.fn();
    await render(createElement(AccountFigures, { summary, workersDue: 1, trend, onAction, unavailable: ['profit'] }));
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('button')];
    expect(buttons.some((b) => b.textContent?.includes('النسبة المتفق عليها'))).toBe(false);
    for (const [label, action] of [['إجمالي المدفوعات', 'payments'], ['إجمالي المصروفات', 'expenses'], ['عجز الحساب', 'statement'], ['الديون المستحقة', 'debts'], ['متبقي العمال', 'workers']]) {
      await act(async () => buttons.find((b) => b.textContent?.includes(label))!.click());
      expect(onAction).toHaveBeenLastCalledWith(action);
    }
  });

  it('shows the net balance as «الصافي المتبقي» when nothing is short', async () => {
    const ok = { ...summary, ...computeClientAccount({ totalExpenses: 1000, totalDebts: 0, totalPaid: 5000, profitPercentage: 10 }), totalPaid: 5000, totalExpenses: 1000 } as ClientSummary;
    await render(createElement(AccountFigures, { summary: ok }));
    expect(host.textContent).toContain('الصافي المتبقي');
    expect(host.textContent).not.toContain('عجز الحساب');
  });
});

describe('the loading board and the limited viewer', () => {
  it('loads as the same silhouette: six cards under a title', async () => {
    await render(createElement(ClientOverviewSkeleton));
    expect(host.querySelectorAll('.min-h-\\[6\\.5rem\\]')).toHaveLength(6);
  });

  it('shows a limited viewer their own figures as statistic cards too', async () => {
    await render(createElement(ClientPersonalSummary, { scope: 'own', expensesTotal: 1234.5, expensesCount: 3, custody: null }));
    expect(host.querySelector('h2')?.textContent).toBe('ملخصي على هذا المشروع');
    expect(host.textContent).toContain('مصروفاتي');
    expect(host.textContent).toContain('1,234.5');
    expect(host.querySelectorAll('.rounded-lg.border')).toHaveLength(1);
    await render(createElement(ClientPersonalSummary, { scope: 'none', expensesTotal: 0, expensesCount: 0, custody: null }));
    expect(host.querySelectorAll('.rounded-lg.border')).toHaveLength(0);
  });
});
