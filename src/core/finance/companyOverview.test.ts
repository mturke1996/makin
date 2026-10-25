import { describe, expect, it } from 'vitest';
import type { Client, Expense, Payment, PaymentMilestone, ProjectPhase, StandaloneDebt, Worker } from '../../types';
import { buildCompanyOverview } from './companyOverview';

const NOW = new Date('2026-10-25T09:00:00');
const client = (id: string, over: Partial<Client> = {}): Client => ({ id, name: `مشروع ${id}`, phone: '', address: '', type: 'individual', createdAt: '', updatedAt: '', ...over });
const pay = (id: string, clientId: string, amount: number): Payment => ({ id, invoiceId: '', clientId, amount, paymentMethod: 'cash', paymentDate: '2026-10-01', createdAt: '', updatedAt: '' });
const exp = (id: string, clientId: string, amount: number, extra: Partial<Expense> = {}): Expense => ({ id, clientId, amount, description: id, category: 'materials', date: '2026-10-05', isClosed: false, createdAt: '2026-10-05T08:00:00Z', updatedAt: '', ...extra }) as Expense;
const debt = (id: string, clientId: string, remainingAmount: number): StandaloneDebt => ({ id, clientId, remainingAmount, amount: remainingAmount, paidAmount: 0 }) as StandaloneDebt;
const base = { debts: [] as StandaloneDebt[], workers: [] as Worker[], phases: [] as ProjectPhase[], milestones: [] as PaymentMilestone[], invoices: [], now: NOW };

describe('buildCompanyOverview', () => {
  const clients = [client('a', { profitPercentage: 10, profitBase: 'expenses', contractValue: 100000 }), client('b'), client('c', { status: 'completed' })];
  const payments = [pay('p1', 'a', 50000), pay('p2', 'b', 1000)];
  const expenses = [exp('e1', 'a', 30000), exp('e2', 'a', 5000), exp('e3', 'b', 4000)];
  const result = buildCompanyOverview({ ...base, clients, payments, expenses, debts: [debt('d1', 'a', 2000)] });

  it('works out each project with the same account rule as the project page', () => {
    const a = result.projects.find((p) => p.client.id === 'a')!;
    // 10% of 35,000 expenses = 3,500; 50,000 collected less 35,000, 2,000 debts and 3,500 share
    expect(a).toMatchObject({ collected: 50000, spent: 35000, debts: 2000, agreedProfit: 3500, remaining: 9500, collectedShare: 50 });
    expect(result.projects.find((p) => p.client.id === 'b')).toMatchObject({ collected: 1000, spent: 4000, remaining: -3000, collectedShare: null });
  });

  it('totals the company', () => {
    expect(result.totals).toMatchObject({ collected: 51000, spent: 39000, net: 12000, debts: 2000, agreedProfit: 3500 });
  });

  it('puts the projects that are in the red first among the active, and the completed last', () => {
    expect(result.projects.map((p) => p.client.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('follow-ups', () => {
  it('counts what is late, waiting for approval and over budget', () => {
    const clients = [client('a')];
    const milestones = [{ id: 'm', clientId: 'a', title: 'x', amount: 10000, dueDate: '2026-09-01', order: 1, createdAt: '', updatedAt: '' }] as PaymentMilestone[];
    const phases = [{ id: 'ph', clientId: 'a', name: 'الهيكل', order: 1, status: 'in_progress', budgetAmount: 1000, createdAt: '', updatedAt: '' }] as ProjectPhase[];
    const expenses = [exp('e1', 'a', 1500, { phaseId: 'ph' }), exp('e2', 'a', 200, { approvalStatus: 'pending' })];
    const r = buildCompanyOverview({ ...base, clients, payments: [pay('p', 'a', 2000)], expenses, milestones, phases });
    expect(r.followUps).toMatchObject({ overdueAmount: 8000, overdueClients: 1, pendingApprovals: 1, pendingAmount: 200, phasesOver: 1, priceRises: 0 });
    expect(r.projects[0].phasesOver).toBe(1);
  });

  it('is calm for a company with nothing late', () => {
    const r = buildCompanyOverview({ ...base, clients: [client('a')], payments: [], expenses: [] });
    expect(r.followUps).toEqual({ overdueAmount: 0, overdueClients: 0, upcomingAmount: 0, pendingApprovals: 0, pendingAmount: 0, phasesOver: 0, priceRises: 0 });
    expect(r.totals.net).toBe(0);
  });
});
