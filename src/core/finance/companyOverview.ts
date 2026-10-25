import type { Client, ClientStatus, Expense, Payment, PaymentMilestone, ProjectPhase, StandaloneDebt, Worker, Invoice } from '../../types';
import { approvalCounts } from './expenseApproval';
import { budgetState } from './budgetStatus';
import { computeClientAccount } from './clientProfitTotals';
import { resolveClientStatus } from './clientProject';
import { fromMilli, sumMoney, toMilli } from './money';
import { buildReceivables } from './paymentSchedule';
import { recentPriceSpikes } from './priceTracking';
import { buildPhaseBudgetRows } from './projectBudget';
import { buildWorkerLedgers, summarizeWorkerLedgers } from './workerLedger';

/**
 * The company on one page: how every project stands (collected, spent, what is left after costs, debts and the agreed
 * share), the totals, and the few things that need a decision. Everything is computed from records the manager can read
 * in full, with the same rules the project pages use, so a figure here is the figure there.
 */

export interface ProjectRow {
  client: Client;
  status: ClientStatus;
  collected: number;
  spent: number;
  /** Debts still owed on the project. */
  debts: number;
  /** The company's agreed share (percentage of expenses or of collections). */
  agreedProfit: number;
  /** What is left after expenses, debts and the agreed share (negative: the company is out of pocket). */
  remaining: number;
  contractValue?: number;
  /** Share of the contract collected so far, when a contract value is set. */
  collectedShare: number | null;
  /** Late on the agreed schedule or invoices. */
  overdue: number;
  /** Phases past their budget. */
  phasesOver: number;
}

export interface CompanyFollowUps {
  overdueAmount: number;
  overdueClients: number;
  /** Expected in the next 30 days. */
  upcomingAmount: number;
  pendingApprovals: number;
  pendingAmount: number;
  phasesOver: number;
  priceRises: number;
}

export interface CompanyOverview {
  projects: ProjectRow[];
  totals: {
    collected: number;
    spent: number;
    /** Collected less spent. */
    net: number;
    debts: number;
    agreedProfit: number;
    /** What workers are still owed. */
    workersOwed: number;
  };
  followUps: CompanyFollowUps;
}

const STATUS_RANK: Record<ClientStatus, number> = { active: 0, paused: 1, completed: 2 };

export function buildCompanyOverview(input: {
  clients: readonly Client[];
  payments: readonly Payment[];
  expenses: readonly Expense[];
  debts: readonly StandaloneDebt[];
  workers: readonly Worker[];
  phases: readonly ProjectPhase[];
  milestones: readonly PaymentMilestone[];
  invoices: readonly Invoice[];
  now?: Date;
}): CompanyOverview {
  const { clients, payments, expenses, debts, workers, phases, milestones, invoices, now } = input;
  const receivables = buildReceivables({ clients, payments, milestones, invoices, now });
  const overdueOf = new Map(receivables.late.map((r) => [r.client.id, r.overdueTotal]));

  const projects = clients.map((client): ProjectRow => {
    const collected = sumMoney(payments.filter((p) => p.clientId === client.id).map((p) => p.amount));
    const spent = sumMoney(expenses.filter((e) => e.clientId === client.id).map((e) => e.amount));
    const owed = sumMoney(debts.filter((d) => d.clientId === client.id).map((d) => d.remainingAmount));
    const account = computeClientAccount({ totalExpenses: spent, totalDebts: owed, totalPaid: collected, profitPercentage: client.profitPercentage, profitBase: client.profitBase });
    const phaseRows = buildPhaseBudgetRows(phases as ProjectPhase[], expenses as Expense[], client.id);
    return {
      client,
      status: resolveClientStatus(client),
      collected,
      spent,
      debts: owed,
      agreedProfit: account.profit,
      remaining: fromMilli(toMilli(account.remaining)),
      contractValue: client.contractValue && client.contractValue > 0 ? client.contractValue : undefined,
      collectedShare: client.contractValue && client.contractValue > 0 ? (toMilli(collected) / toMilli(client.contractValue)) * 100 : null,
      overdue: overdueOf.get(client.id) ?? 0,
      phasesOver: phaseRows.filter((r) => budgetState(r.budget, r.actual) === 'over').length,
    };
  });

  projects.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.remaining - b.remaining || a.client.name.localeCompare(b.client.name, 'ar'));

  const collected = sumMoney(projects.map((p) => p.collected));
  const spent = sumMoney(projects.map((p) => p.spent));
  const approvals = approvalCounts(expenses);

  return {
    projects,
    totals: {
      collected,
      spent,
      net: fromMilli(toMilli(collected) - toMilli(spent)),
      debts: sumMoney(projects.map((p) => p.debts)),
      agreedProfit: sumMoney(projects.map((p) => p.agreedProfit)),
      workersOwed: summarizeWorkerLedgers(buildWorkerLedgers(workers, expenses).map((e) => e.ledger)).owed,
    },
    followUps: {
      overdueAmount: receivables.overdueTotal,
      overdueClients: receivables.late.length,
      upcomingAmount: receivables.upcomingTotal,
      pendingApprovals: approvals.pending,
      pendingAmount: approvals.pendingAmount,
      phasesOver: projects.reduce((n, p) => n + p.phasesOver, 0),
      priceRises: recentPriceSpikes(expenses, now ?? new Date()).length,
    },
  };
}
