import type { Worker, WorkerAgreementItem } from '../../../../types';
import type { WorkerLedger } from '../../../../core/finance/workerLedger';

/** عامل مع دفتره المحسوب من المصروفات المرئية للمستخدم. */
export interface WorkerEntry {
  worker: Worker;
  ledger: WorkerLedger;
}

/** ما يخرج من نموذج العامل جاهزاً للحفظ (totalAmount = مجموع البنود بالضبط عند وجودها). */
export interface WorkerFormValues {
  name: string;
  jobType: string;
  phone: string;
  nationalId: string;
  startDate: string;
  notes: string;
  totalAmount: number;
  agreementItems: WorkerAgreementItem[];
  agreementReason?: string;
}

/** ما يخرج من نموذج الدفعة. */
export interface WorkerPaymentValues {
  amount: number;
  date: string;
  note: string;
  operationId: string;
  createdAt: string;
  /** سلفة: تُدفع قبل إنجاز العمل وتُخصم تلقائياً مما يستحقه بالإنجاز. */
  advance: boolean;
}
