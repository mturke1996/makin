import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useDataStore } from '../../../stores/useDataStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useGlobalFundStore } from '../../../stores/useGlobalFundStore';
import { useAccess } from '../../../core/access/useAccess';
import { computeUserFundAllocTotals } from '../../../core/finance/custodyFifo';
import { buildPhaseBudgetRows } from '../../../core/finance/projectBudget';
import { buildPaymentSchedule } from '../../../core/finance/paymentSchedule';
import { buildWorkerLedgers, sumMoney, summarizeWorkerLedgers } from '../../../core/finance/workerLedger';
import { computeClientAccount } from '../../../core/finance/clientProfitTotals';
import type { WorkerEntry } from './workers';
import { buildUserBalancesSummary, custodyIsExact, depletedLines } from './custodySummary';
import type { ClientProfileCaps, ClientSummary, FundStats, UserBalancesSummary } from './types';
import { useUsersDirectory } from './useUsersDirectory';

/**
 * Everything the client profile shows, derived once from the stores.
 *
 * The stores only hold what this person may download, so most people have a partial picture:
 * no payments without `payments.view`, only their own expenses without `expenses.view.all`, and so
 * on. Every group below is built only from the data its permission governs, and `caps` tells the
 * screen which groups are complete, so nothing partial is ever presented as a total.
 */
export function useClientProfileData(clientId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  const access = useAccess();
  const fundTransactions = useGlobalFundStore((s) => s.transactions);
  const {
    clients,
    payments,
    expenses,
    standaloneDebts,
    workers,
    userBalances,
    projectPhases,
    boqItems,
    siteReports,
    paymentMilestones,
    isLoading,
  } = useDataStore();

  const client = clients.find((c) => c.id === clientId);

  const caps = useMemo<ClientProfileCaps>(
    () => ({
      expenseScope: access.expenseScope,
      payments: access.can('payments.view'),
      debts: access.can('debts.view'),
      workers: access.can('workers.view'),
      custody: access.custodyScope !== 'none',
      projects: access.can('projects.view'),
      invoices: access.can('invoices.view'),
      letters: access.can('letters.view'),
      showSummary: access.canAll(['payments.view', 'expenses.view.all', 'debts.view']),
    }),
    [access]
  );

  // Colleagues' names and roles: only people who may read the directory ever subscribe to it.
  const systemUsers = useUsersDirectory(access.canViewDirectory);

  const clientExpenses = useMemo(
    () =>
      access
        .listableExpenses(expenses.filter((e) => e.clientId === clientId))
        .sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt))),
    [access, expenses, clientId]
  );

  // Every expense of the client the store holds, listable or not: worker balances are computed from all
  // the payments made to the worker, while only the listable ones are shown as rows.
  const allClientExpenses = useMemo(() => expenses.filter((e) => e.clientId === clientId), [expenses, clientId]);

  const clientPayments = useMemo(
    () =>
      caps.payments
        ? payments.filter((p) => p.clientId === clientId).sort((a, b) => dayjs(b.paymentDate).diff(dayjs(a.paymentDate)))
        : [],
    [caps.payments, payments, clientId]
  );

  // The agreed instalments are laid against everything the client has paid, so they need the payments too.
  const clientMilestones = useMemo(
    () => (caps.payments ? paymentMilestones.filter((m) => m.clientId === clientId) : []),
    [caps.payments, paymentMilestones, clientId]
  );

  const clientDebts = useMemo(
    () =>
      caps.debts
        ? standaloneDebts.filter((d) => d.clientId === clientId).sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
        : [],
    [caps.debts, standaloneDebts, clientId]
  );

  const workerEntries = useMemo<WorkerEntry[]>(
    () =>
      !caps.workers
        ? []
        : buildWorkerLedgers(workers
            .filter((w) => w.clientId === clientId)
            .sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt))),
            // Balances come from ALL of the client's payments so nobody pays a worker twice because a
            // colleague's or the admin's payment is hidden from them; only the visible rows are listed.
            allClientExpenses, (e) => access.canSeeWorkerPayment(e) || access.canListExpense(e)),
    [caps.workers, workers, allClientExpenses, clientId, access]
  );

  // The fields the PDF reports read: totalAmount = the agreed amount (sum of the agreement items when present).
  const clientWorkers = useMemo(
    () =>
      workerEntries.map(({ worker, ledger }) => ({
        ...worker,
        totalAmount: ledger.agreed,
        paidAmount: ledger.paid,
        remainingAmount: ledger.remaining,
      })),
    [workerEntries]
  );

  const clientUserBalances = useMemo(
    () =>
      caps.custody
        ? userBalances.filter((b) => b.clientId === clientId).sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)))
        : [],
    [caps.custody, userBalances, clientId]
  );

  const clientPhases = useMemo(
    () => (caps.projects ? projectPhases.filter((p) => p.clientId === clientId).sort((a, b) => a.order - b.order) : []),
    [caps.projects, projectPhases, clientId]
  );

  const clientBoqItems = useMemo(
    () =>
      caps.projects
        ? boqItems.filter((i) => i.clientId === clientId).sort((a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt)))
        : [],
    [caps.projects, boqItems, clientId]
  );

  const phaseBudgetRows = useMemo(
    () => (clientId && caps.projects ? buildPhaseBudgetRows(clientPhases, clientExpenses, clientId) : []),
    [caps.projects, clientPhases, clientExpenses, clientId]
  );

  const clientSiteReports = useMemo(
    () =>
      caps.projects
        ? siteReports.filter((r) => r.clientId === clientId).sort((a, b) => dayjs(b.reportDate).diff(dayjs(a.reportDate)))
        : [],
    [caps.projects, siteReports, clientId]
  );

  // Custody per user, with every custody (deposit) and the expenses charged to it, from the same ledger as
  // the fund page. `spent` is only true for users whose expenses the viewer sees in full (see custodySummary).
  const userBalancesSummary = useMemo<UserBalancesSummary>(
    () =>
      buildUserBalancesSummary({
        balances: clientUserBalances,
        expenses: clientExpenses,
        users: systemUsers,
        expenseScope: caps.expenseScope,
        viewerId: user?.id,
        clientId,
      }),
    [clientUserBalances, clientExpenses, systemUsers, caps.expenseScope, user?.id, clientId]
  );

  const currentUserBalanceInfo = user?.id ? (userBalancesSummary[user.id] ?? null) : null;
  const depletedBalances = useMemo(() => depletedLines(userBalancesSummary), [userBalancesSummary]);
  const custodyExact = useMemo(() => custodyIsExact(userBalancesSummary), [userBalancesSummary]);

  // The signed-in user's whole custody pool (all clients), FIFO: what the expense forms warn against.
  // Without any expense of theirs in the store the spent part is unknown, so there is no balance to warn about.
  const globalFundStats = useMemo<FundStats | null>(() => {
    if (!user || caps.expenseScope === 'none') return null;
    const uid = user.id;
    const userName = user.displayName || '';
    const deposits = fundTransactions
      .filter((t) => t.type === 'deposit' && ((uid && t.userId === uid) || (userName && t.userName === userName)))
      .map((t) => ({ createdAt: t.createdAt, amount: t.amount }));
    if (deposits.length === 0) return null;
    // Same ownership rule as the custody ledger: the id decides, the name only for records without one.
    const mine = expenses
      .filter((e) => (uid && e.userId === uid) || (userName && !e.userId && e.createdBy === userName))
      .map((e) => ({ createdAt: e.createdAt, amount: e.amount }));
    return computeUserFundAllocTotals(deposits, mine);
  }, [fundTransactions, expenses, user, caps.expenseScope]);

  const schedule = useMemo(
    () => buildPaymentSchedule(clientMilestones, sumMoney(clientPayments.map((p) => p.amount))),
    [clientMilestones, clientPayments]
  );

  const summary = useMemo<ClientSummary>(() => {
    const totalExpenses = sumMoney(clientExpenses.map((e) => e.amount));
    const totalDebts = sumMoney(clientDebts.map((d) => d.remainingAmount));
    const totalPaid = sumMoney(clientPayments.map((p) => p.amount));
    const workerTotals = summarizeWorkerLedgers(workerEntries.map((e) => e.ledger));
    const account = computeClientAccount({
      totalExpenses,
      totalDebts,
      totalPaid,
      profitPercentage: client?.profitPercentage,
      profitBase: client?.profitBase,
    });
    return {
      totalExpenses,
      totalDebts,
      totalPaid,
      totalWorkersDue: workerTotals.owed,
      totalWorkersOverpaid: workerTotals.overpaid,
      totalWorkersAgreed: workerTotals.agreed,
      totalWorkersPaid: workerTotals.paid,
      ...account,
    };
  }, [clientExpenses, clientDebts, clientPayments, workerEntries, client]);

  return {
    client,
    isLoading,
    caps,
    systemUsers,
    clientExpenses,
    clientPayments,
    clientMilestones,
    schedule,
    clientDebts,
    workerEntries,
    clientWorkers,
    clientUserBalances,
    clientPhases,
    clientBoqItems,
    phaseBudgetRows,
    clientSiteReports,
    userBalancesSummary,
    custodyExact,
    currentUserBalanceInfo,
    depletedBalances,
    globalFundStats,
    summary,
  };
}
