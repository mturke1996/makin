import type { Invoice, Client, ExpenseInvoice } from '../types';
import { formatCurrency } from './calculations';
import dayjs from 'dayjs';

export const generateInvoicePDF = (invoice: Invoice, client: Client) => {
  // Company information - يمكن تخصيصها
  const COMPANY_INFO = {
    name: 'شركة البناء والتشييد',
    address: 'الرياض، المملكة العربية السعودية',
    phone: '+966 50 123 4567',
    email: 'info@construction.com',
    taxNumber: '123456789',
  };

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة لطباعة الفاتورة');
    return;
  }

  // Generate HTML for the invoice
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>فاتورة ${invoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: A5;
          margin: 10mm;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
          padding: 20px;
        }
        
        .invoice-container {
          max-width: 100%;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #1976d2;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #1976d2;
          margin-bottom: 5px;
        }
        
        .company-details {
          font-size: 11px;
          color: #666;
        }
        
        .invoice-title {
          background: #1976d2;
          color: white;
          padding: 10px;
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          border-radius: 5px;
        }
        
        .invoice-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 20px;
        }
        
        .info-section {
          flex: 1;
          background: #f5f5f5;
          padding: 12px;
          border-radius: 5px;
        }
        
        .info-section h3 {
          font-size: 14px;
          color: #1976d2;
          margin-bottom: 8px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 12px;
        }
        
        .info-label {
          font-weight: 600;
          color: #555;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }
        
        .items-table thead {
          background: #1976d2;
          color: white;
        }
        
        .items-table th {
          padding: 10px;
          text-align: right;
          font-weight: 600;
        }
        
        .items-table td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
          text-align: right;
        }
        
        .items-table tbody tr:hover {
          background: #f5f5f5;
        }
        
        .totals-section {
          width: 100%;
          max-width: 300px;
          margin-right: auto;
          margin-bottom: 20px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 15px;
          font-size: 13px;
        }
        
        .total-row.subtotal {
          background: #f5f5f5;
        }
        
        .total-row.tax {
          background: #e3f2fd;
        }
        
        .total-row.final {
          background: #1976d2;
          color: white;
          font-size: 16px;
          font-weight: bold;
          border-radius: 5px;
        }
        
        .notes-section {
          background: #fff9e6;
          padding: 15px;
          border-right: 4px solid #ffc107;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        
        .notes-section h4 {
          font-size: 14px;
          color: #f57c00;
          margin-bottom: 8px;
        }
        
        .notes-section p {
          font-size: 12px;
          color: #666;
        }
        
        .footer {
          text-align: center;
          font-size: 11px;
          color: #999;
          border-top: 2px solid #ddd;
          padding-top: 15px;
          margin-top: 30px;
        }
        
        @media print {
          body {
            padding: 0;
          }
          
          .invoice-container {
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <div class="company-name">${COMPANY_INFO.name}</div>
          <div class="company-details">
            ${COMPANY_INFO.address} • ${COMPANY_INFO.phone} • ${COMPANY_INFO.email}<br>
            الرقم الضريبي: ${COMPANY_INFO.taxNumber}
          </div>
        </div>
        
        <!-- Invoice Title -->
        <div class="invoice-title">
          فاتورة ضريبية
        </div>
        
        <!-- Invoice & Client Info -->
        <div class="invoice-info">
          <div class="info-section">
            <h3>معلومات الفاتورة</h3>
            <div class="info-row">
              <span class="info-label">رقم الفاتورة:</span>
              <span>${invoice.invoiceNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ الإصدار:</span>
              <span>${dayjs(invoice.issueDate).format('DD/MM/YYYY')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ الاستحقاق:</span>
              <span>${dayjs(invoice.dueDate).format('DD/MM/YYYY')}</span>
            </div>
          </div>
          
          <div class="info-section">
            <h3>بيانات العميل</h3>
            <div class="info-row">
              <span class="info-label">الاسم:</span>
              <span>${client.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الهاتف:</span>
              <span>${client.phone}</span>
            </div>
            <div class="info-row">
              <span class="info-label">البريد:</span>
              <span>${client.email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">العنوان:</span>
              <span>${client.address}</span>
            </div>
          </div>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>الوصف</th>
              <th style="width: 80px;">الكمية</th>
              <th style="width: 100px;">السعر</th>
              <th style="width: 100px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (item) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td>${formatCurrency(item.total)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row subtotal">
            <span>المجموع الفرعي:</span>
            <span>${formatCurrency(invoice.subtotal)}</span>
          </div>
          <div class="total-row tax">
            <span>ضريبة القيمة المضافة (${invoice.taxRate}%):</span>
            <span>${formatCurrency(invoice.taxAmount)}</span>
          </div>
          <div class="total-row final">
            <span>الإجمالي:</span>
            <span>${formatCurrency(invoice.total)}</span>
          </div>
        </div>
        
        ${
          invoice.notes
            ? `
        <!-- Notes -->
        <div class="notes-section">
          <h4>ملاحظات:</h4>
          <p>${invoice.notes}</p>
        </div>
        `
            : ''
        }
        
        <!-- Footer -->
        <div class="footer">
          <p>شكراً لتعاملكم معنا</p>
          <p>هذه فاتورة رسمية معتمدة</p>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export const generateExpenseInvoicePDF = (expenseInvoice: ExpenseInvoice, client: Client) => {
  // Company information - يمكن تخصيصها
  const COMPANY_INFO = {
    name: 'شركة البناء والتشييد',
    address: 'الرياض، المملكة العربية السعودية',
    phone: '+966 50 123 4567',
    email: 'info@construction.com',
    taxNumber: '123456789',
  };

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة لطباعة الفاتورة');
    return;
  }

  // Group expenses by date
  const expensesByDate = expenseInvoice.expenses.reduce((acc, exp) => {
    const dateKey = dayjs(exp.date).format('YYYY-MM-DD');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(exp);
    return acc;
  }, {} as Record<string, typeof expenseInvoice.expenses>);

  // Generate HTML for the expense invoice
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>فاتورة مصروفات ${expenseInvoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: A5;
          margin: 10mm;
        }
        
        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
          padding: 20px;
        }
        
        .invoice-container {
          max-width: 100%;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #10b981;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #10b981;
          margin-bottom: 5px;
        }
        
        .company-details {
          font-size: 11px;
          color: #666;
        }
        
        .invoice-title {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 12px;
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          border-radius: 5px;
        }
        
        .invoice-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        .info-section {
          flex: 1;
          min-width: 200px;
          background: #f5f5f5;
          padding: 12px;
          border-radius: 5px;
        }
        
        .info-section h3 {
          font-size: 14px;
          color: #10b981;
          margin-bottom: 8px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 12px;
        }
        
        .info-label {
          font-weight: 600;
          color: #555;
        }
        
        .period-section {
          background: #ecfdf5;
          padding: 12px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-right: 4px solid #10b981;
        }
        
        .period-section h4 {
          font-size: 14px;
          color: #059669;
          margin-bottom: 8px;
        }
        
        .expenses-by-date {
          margin-bottom: 20px;
        }
        
        .date-group {
          margin-bottom: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .date-header {
          background: #10b981;
          color: white;
          padding: 10px 15px;
          font-weight: bold;
          font-size: 14px;
        }
        
        .expenses-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        
        .expenses-table thead {
          background: #f3f4f6;
        }
        
        .expenses-table th {
          padding: 10px;
          text-align: right;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .expenses-table td {
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
          text-align: right;
        }
        
        .expenses-table tbody tr:hover {
          background: #f9fafb;
        }
        
        .category-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .totals-section {
          width: 100%;
          max-width: 300px;
          margin-right: auto;
          margin-bottom: 20px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 15px;
          font-size: 13px;
        }
        
        .total-row.count {
          background: #f3f4f6;
        }
        
        .total-row.final {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          font-size: 16px;
          font-weight: bold;
          border-radius: 5px;
        }
        
        .notes-section {
          background: #fff9e6;
          padding: 15px;
          border-right: 4px solid #ffc107;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        
        .notes-section h4 {
          font-size: 14px;
          color: #f57c00;
          margin-bottom: 8px;
        }
        
        .notes-section p {
          font-size: 12px;
          color: #666;
        }
        
        .footer {
          text-align: center;
          font-size: 11px;
          color: #999;
          border-top: 2px solid #ddd;
          padding-top: 15px;
          margin-top: 30px;
        }
        
        @media print {
          body {
            padding: 0;
          }
          
          .invoice-container {
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <div class="company-name">${COMPANY_INFO.name}</div>
          <div class="company-details">
            ${COMPANY_INFO.address} • ${COMPANY_INFO.phone} • ${COMPANY_INFO.email}<br>
            الرقم الضريبي: ${COMPANY_INFO.taxNumber}
          </div>
        </div>
        
        <!-- Invoice Title -->
        <div class="invoice-title">
          فاتورة مصروفات
        </div>
        
        <!-- Invoice & Client Info -->
        <div class="invoice-info">
          <div class="info-section">
            <h3>معلومات الفاتورة</h3>
            <div class="info-row">
              <span class="info-label">رقم الفاتورة:</span>
              <span>${expenseInvoice.invoiceNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ الإصدار:</span>
              <span>${dayjs(expenseInvoice.issueDate).format('DD/MM/YYYY')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الحالة:</span>
              <span>${
                expenseInvoice.status === 'paid'
                  ? 'مدفوعة'
                  : expenseInvoice.status === 'sent'
                  ? 'مرسلة'
                  : 'مسودة'
              }</span>
            </div>
          </div>
          
          <div class="info-section">
            <h3>بيانات العميل</h3>
            <div class="info-row">
              <span class="info-label">الاسم:</span>
              <span>${client.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الهاتف:</span>
              <span>${client.phone}</span>
            </div>
            <div class="info-row">
              <span class="info-label">البريد:</span>
              <span>${client.email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">العنوان:</span>
              <span>${client.address}</span>
            </div>
          </div>
        </div>
        
        <!-- Period Section -->
        <div class="period-section">
          <h4>📅 الفترة المغطاة</h4>
          <div class="info-row">
            <span class="info-label">من:</span>
            <span>${dayjs(expenseInvoice.startDate).format('DD/MM/YYYY')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">إلى:</span>
            <span>${dayjs(expenseInvoice.endDate).format('DD/MM/YYYY')}</span>
          </div>
        </div>
        
        <!-- Expenses by Date -->
        <div class="expenses-by-date">
          ${Object.entries(expensesByDate)
            .sort(([a], [b]) => dayjs(b).diff(dayjs(a)))
            .map(
              ([date, expenses]) => `
            <div class="date-group">
              <div class="date-header">
                📆 ${dayjs(date).format('DD/MM/YYYY')} - ${dayjs(date).format('dddd')}
              </div>
              <table class="expenses-table">
                <thead>
                  <tr>
                    <th>الوصف</th>
                    <th style="width: 100px;">الفئة</th>
                    <th style="width: 120px;">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  ${expenses
                    .map(
                      (exp) => `
                    <tr>
                      <td>${exp.description}${exp.notes ? `<br><small style="color: #666;">${exp.notes}</small>` : ''}</td>
                      <td><span class="category-badge">${exp.category}</span></td>
                      <td style="font-weight: bold; color: #059669;">${formatCurrency(exp.amount)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                  <tr style="background: #f9fafb; font-weight: bold;">
                    <td colspan="2" style="text-align: left;">إجمالي اليوم:</td>
                    <td style="color: #059669;">${formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `
            )
            .join('')}
        </div>
        
        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row count">
            <span>عدد المصروفات:</span>
            <span>${expenseInvoice.expenses.length}</span>
          </div>
          <div class="total-row final">
            <span>الإجمالي:</span>
            <span>${formatCurrency(expenseInvoice.totalAmount)}</span>
          </div>
        </div>
        
        ${
          expenseInvoice.notes
            ? `
        <!-- Notes -->
        <div class="notes-section">
          <h4>ملاحظات:</h4>
          <p>${expenseInvoice.notes}</p>
        </div>
        `
            : ''
        }
        
        <!-- Footer -->
        <div class="footer">
          <p>شكراً لتعاملكم معنا</p>
          <p>هذه فاتورة مصروفات رسمية معتمدة</p>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

