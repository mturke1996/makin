import type { Invoice, Payment, Debt, FinancialSummary, MonthlyData } from '../types';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';

// تعيين اللغة العربية
dayjs.locale('ar');

export const formatCurrency = (amount: number): string => {
  // تنسيق بسيط - يعرض الخانات العشرية فقط إذا كانت موجودة
  let formatted: string;
  
  if (amount % 1 === 0) {
    // رقم صحيح - بدون خانات عشرية
    formatted = amount.toString();
  } else {
    // رقم عشري - نعرض حتى 3 خانات
    formatted = amount.toFixed(3).replace(/\.?0+$/, '');
  }
  
  return `${formatted} د.ل`;
};

export const calculateInvoiceTotal = (
  items: { quantity: number; unitPrice: number }[],
  taxRate: number = 0
): { subtotal: number; taxAmount: number; total: number } => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return { subtotal, taxAmount, total };
};

export const calculateFinancialSummary = (
  invoices: Invoice[],
  payments: Payment[],
  debts: Debt[]
): FinancialSummary => {
  const totalDebt = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalRemaining = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);

  const overdueDebts = debts.filter(
    (debt) =>
      debt.status !== 'paid' &&
      dayjs(debt.dueDate).isBefore(dayjs(), 'day')
  );
  const overdueAmount = overdueDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0);

  const collectionRate = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;

  // Calculate monthly data
  const monthlyMap = new Map<string, MonthlyData>();

  invoices.forEach((invoice) => {
    const date = dayjs(invoice.issueDate);
    const key = `${date.year()}-${date.month()}`;

    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        month: date.month() + 1,
        year: date.year(),
        totalInvoiced: 0,
        totalCollected: 0,
        totalDebt: 0,
      });
    }

    const monthData = monthlyMap.get(key)!;
    monthData.totalInvoiced += invoice.total;
  });

  payments.forEach((payment) => {
    const date = dayjs(payment.paymentDate);
    const key = `${date.year()}-${date.month()}`;

    if (monthlyMap.has(key)) {
      const monthData = monthlyMap.get(key)!;
      monthData.totalCollected += payment.amount;
    }
  });

  debts.forEach((debt) => {
    const invoice = invoices.find((inv) => inv.id === debt.invoiceId);
    if (invoice) {
      const date = dayjs(invoice.issueDate);
      const key = `${date.year()}-${date.month()}`;

      if (monthlyMap.has(key)) {
        const monthData = monthlyMap.get(key)!;
        monthData.totalDebt += debt.remainingAmount;
      }
    }
  });

  const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  return {
    totalDebt,
    totalPaid,
    totalRemaining,
    overdueAmount,
    collectionRate,
    monthlyData,
  };
};

export const getInvoiceStatus = (invoice: Invoice, dueDate: string): Invoice['status'] => {
  if (invoice.status === 'paid') return 'paid';
  if (dayjs(dueDate).isBefore(dayjs(), 'day')) return 'overdue';
  return invoice.status;
};

export const calculateDebtProgress = (totalAmount: number, paidAmount: number): number => {
  if (totalAmount === 0) return 0;
  return (paidAmount / totalAmount) * 100;
};

