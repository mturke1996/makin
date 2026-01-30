import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { Client, Invoice, Payment, Expense } from '@/types';

export const exportToExcel = {
  // Export Clients
  clients: (clients: Client[]) => {
    const data = clients.map(client => ({
      'ID': client.id,
      'الاسم': client.name,
      'رقم الهاتف': client.phone,
      'العنوان': client.address,
      'البريد الإلكتروني': client.email,
      'تاريخ الإضافة': client.createdAt ? format(new Date(client.createdAt), 'yyyy-MM-dd') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    
    const fileName = `العملاء_مكين_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, fileName);
  },

  // Export Invoices
  invoices: (invoices: Invoice[], clients: Client[]) => {
    const clientsMap = new Map(clients.map(c => [c.id, c.name]));

    const data = invoices.map(inv => ({
      'رقم الفاتورة': inv.invoiceNumber,
      'العميل': clientsMap.get(inv.clientId) || 'غير معروف',
      'المبلغ': inv.total,
      'التاريخ': inv.issueDate ? format(new Date(inv.issueDate), 'yyyy-MM-dd') : '',
      'الحالة': inv.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    
    const fileName = `فواتير_مكين_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, fileName);
  },

  // Full Backup (All Tables)
  fullBackup: async (data: { clients: Client[], invoices: Invoice[], payments: Payment[], expenses: Expense[] }) => {
    const wb = XLSX.utils.book_new();
    const clientsMap = new Map(data.clients.map(c => [c.id, c.name]));

    // Clients Sheet
    const clientsWS = XLSX.utils.json_to_sheet(data.clients.map(c => ({
      'المعرف': c.id,
      'الاسم': c.name,
      'الهاتف': c.phone,
      'العنوان': c.address,
      'البريد': c.email
    })));
    XLSX.utils.book_append_sheet(wb, clientsWS, "العملاء");

    // Invoices Sheet
    const invoicesWS = XLSX.utils.json_to_sheet(data.invoices.map(i => ({
      'رقم الفاتورة': i.invoiceNumber,
      'العميل': clientsMap.get(i.clientId) || i.clientId,
      'المبلغ': i.total,
      'التاريخ': i.issueDate ? format(new Date(i.issueDate), 'yyyy-MM-dd') : '',
      'الحالة': i.status
    })));
    XLSX.utils.book_append_sheet(wb, invoicesWS, "الفواتير");

    // Payments Sheet
    const paymentsWS = XLSX.utils.json_to_sheet(data.payments.map(p => ({
      'المبلغ': p.amount,
      'العميل': clientsMap.get(p.clientId) || p.clientId,
      'التاريخ': p.paymentDate ? format(new Date(p.paymentDate), 'yyyy-MM-dd') : '',
      'الطريقة': p.paymentMethod
    })));
    XLSX.utils.book_append_sheet(wb, paymentsWS, "المدفوعات");

    // Expenses Sheet
    const expensesWS = XLSX.utils.json_to_sheet(data.expenses.map(e => ({
      'الوصف': e.description,
      'المبلغ': e.amount,
      'التاريخ': e.date ? format(new Date(e.date), 'yyyy-MM-dd') : '',
      'التصنيف': e.category
    })));
    XLSX.utils.book_append_sheet(wb, expensesWS, "المصروفات");

    // Save
    const fileName = `نسخة_احتياطية_مكين_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, fileName);
  }
};
