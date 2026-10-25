import { describe, expect, it } from 'vitest';
import type { Client, Expense, ProjectPhase, Worker } from '../../types';
import { buildWorkforce, filterWorkforce } from './workforce';
import { filterWorkerPayments } from './workerPaymentSearch';
import { buildWorkerLedger } from './workerLedger';
import { repeatExpenseDraft, quickPhaseBudget } from '../../ui/quick-expense/repeatExpense';
const at='2026-10-24T10:00:00Z';
const worker: Worker={id:'w',clientId:'c',name:'أحمد علي',jobType:'سباكة',totalAmount:1000,paidAmount:0,remainingAmount:1000,status:'active',createdAt:at,updatedAt:at};
const expense: Expense={id:'expense-1',clientId:'c',workerId:'w',amount:100,category:'labor',description:'دفعة',notes:'أعمال اللياسة',createdBy:'عمر',date:'2026-10-24',isClosed:false,createdAt:at,updatedAt:at};
const phase: ProjectPhase={id:'ph',clientId:'c',name:'تشطيب',order:1,status:'planned',budgetAmount:0.3,createdAt:at,updatedAt:at};
describe('new workforce and expense shortcuts',()=>{
 it('searches across projects and retains archived positive obligations',()=>{
  const entries=buildWorkforce([{...worker,archivedAt:at},{...worker,id:'w2',name:'سالم',totalAmount:10}], [expense,{...expense,id:'expense-2',workerId:'w2',amount:20}], [{id:'c',name:'فيلا النخيل'} as Client]);
  expect(filterWorkforce(entries,'owed','','احمد النخيل').map(e=>e.worker.id)).toEqual(['w']);
  expect(filterWorkforce(entries,'current','','').map(e=>e.worker.id)).toEqual(['w2']);
  expect(filterWorkforce(entries,'overpaid','','')[0].ledger.overpaidBy).toBe(10);
  expect(filterWorkforce(entries,'all','different','')).toEqual([]);
 });
 it('filters payment notes, references and period without changing the ledger balances',()=>{
  const ledger=buildWorkerLedger(worker,[expense,{...expense,id:'old',date:'2026-09-01',amount:50}]);
  expect(filterWorkerPayments(ledger.payments,'لياسه','2026-10-01','2026-10-31').map(p=>p.id)).toEqual(['expense-1']);
  expect(filterWorkerPayments(ledger.payments,'old','','')).toHaveLength(1);
  expect(ledger.paid).toBe(150); expect(ledger.remaining).toBe(850);
 });
 it('copies only editable inputs and clears old invoice, owner and operation references',()=>{
  const result=repeatExpenseDraft({...expense,workerId:undefined,invoiceNumber:'old-paper',phaseId:'ph',quantity:2,unitPrice:50,unit:'m2'},[phase],true,new Date('2026-10-25T12:00:00'));
  expect(result).toMatchObject({date:'2026-10-25',mode:'quantity',quantity:'2',unitPrice:'50',invoiceNumber:'',personId:'',phaseId:'ph'});
  expect(result).not.toHaveProperty('id');expect(result).not.toHaveProperty('operation');expect(result).not.toHaveProperty('workerId');
  expect(repeatExpenseDraft({...expense,phaseId:'ph'},[{...phase,clientId:'other'}],true).phaseId).toBe('');
  expect(repeatExpenseDraft({...expense,phaseId:'ph'},[phase],false).phaseId).toBe('');
 });
 it('projects stage budget to thousandths and excludes other clients and phases',()=>{
  const value=quickPhaseBudget(phase,[{...expense,workerId:undefined,amount:0.1,phaseId:'ph'},{...expense,amount:500,clientId:'other',phaseId:'ph'},{...expense,amount:500,phaseId:'other'}],'c',0.25);
  expect(value).toMatchObject({spent:0.1,after:0.35,remaining:-0.05,over:0.05});
  expect(quickPhaseBudget({...phase,clientId:'other'},[expense],'c',10)).toBeNull();
 });
});
