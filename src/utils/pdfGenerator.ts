import type { Invoice, Client, ExpenseInvoice } from '../types';
import { formatCurrency } from './calculations';
import dayjs from 'dayjs';

export const generateInvoicePDF = (invoice: Invoice, client: Client) => {
  // Company information
  const COMPANY_INFO = {
    name: 'المهندس محمد التركي',
    address: 'تاجوراء شارع اولاد التركي',
    phone: '0913041404',
    email: '',
    taxNumber: '',
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
      <meta name="format-detection" content="telephone=no">
      <title>فاتورة ${invoice.invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        @page {
          size: A4;
          margin: 8mm;
        }
        
        @media screen and (max-width: 768px) {
          @page {
            size: A4;
            margin: 5mm;
          }
        }
        
        html {
          font-size: 16px;
        }
        
        body {
          font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          line-height: 1.6;
          color: #1e293b;
          background: #ffffff;
          padding: 0;
          margin: 0;
          width: 100%;
          overflow-x: hidden;
        }
        
        .invoice-container {
          max-width: 100%;
          width: 100%;
          background: #ffffff;
          margin: 0 auto;
          padding: 20px;
        }
        
        @media screen and (max-width: 768px) {
          .invoice-container {
            padding: 12px;
          }
        }
        
        .header {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
          color: #ffffff;
          padding: 32px 24px;
          border-radius: 0;
          margin: -20px -20px 24px -20px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(30, 64, 175, 0.15);
        }
        
        @media screen and (max-width: 768px) {
          .header {
            padding: 24px 16px;
            margin: -12px -12px 20px -12px;
          }
        }
        
        .company-name {
          font-size: 28px;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 16px;
          letter-spacing: 0.3px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        @media screen and (max-width: 768px) {
          .company-name {
            font-size: 22px;
            margin-bottom: 12px;
          }
        }
        
        .company-details {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.95);
          line-height: 2;
          font-weight: 500;
        }
        
        @media screen and (max-width: 768px) {
          .company-details {
            font-size: 13px;
            line-height: 1.8;
          }
        }
        
        .company-details-item {
          display: inline-block;
          margin: 0 12px;
        }
        
        @media screen and (max-width: 768px) {
          .company-details-item {
            display: block;
            margin: 4px 0;
          }
        }
        
        .invoice-title {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          padding: 18px 24px;
          text-align: center;
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 28px;
          border-radius: 0;
          letter-spacing: 1px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }
        
        @media screen and (max-width: 768px) {
          .invoice-title {
            font-size: 20px;
            padding: 14px 16px;
            margin-bottom: 20px;
          }
        }
        
        .invoice-info {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 28px;
        }
        
        @media screen and (max-width: 768px) {
          .invoice-info {
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 20px;
          }
        }
        
        .info-section {
          background: #f8fafc;
          padding: 20px;
          border-radius: 0;
          border: 1px solid #e2e8f0;
          border-right: 4px solid #3b82f6;
        }
        
        @media screen and (max-width: 768px) {
          .info-section {
            padding: 16px;
          }
        }
        
        .info-section h3 {
          font-size: 16px;
          color: #1e40af;
          margin-bottom: 16px;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 10px;
          font-weight: 800;
        }
        
        @media screen and (max-width: 768px) {
          .info-section h3 {
            font-size: 15px;
            margin-bottom: 12px;
            padding-bottom: 8px;
          }
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
          font-size: 13px;
          padding: 6px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        @media screen and (max-width: 768px) {
          .info-row {
            font-size: 12px;
            margin-bottom: 8px;
            padding: 5px 0;
          }
        }
        
        .info-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        
        .info-label {
          font-weight: 700;
          color: #475569;
          min-width: 100px;
        }
        
        @media screen and (max-width: 768px) {
          .info-label {
            min-width: 80px;
            font-size: 11px;
          }
        }
        
        .info-value {
          color: #1e293b;
          font-weight: 600;
          text-align: left;
          flex: 1;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          font-size: 13px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        @media screen and (max-width: 768px) {
          .items-table {
            font-size: 11px;
            margin-bottom: 20px;
          }
        }
        
        .items-table thead {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: #ffffff;
        }
        
        .items-table th {
          padding: 14px 12px;
          text-align: right;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.3px;
        }
        
        @media screen and (max-width: 768px) {
          .items-table th {
            padding: 10px 8px;
            font-size: 11px;
          }
        }
        
        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          text-align: right;
          font-size: 13px;
          color: #334155;
        }
        
        @media screen and (max-width: 768px) {
          .items-table td {
            padding: 10px 8px;
            font-size: 11px;
          }
        }
        
        .items-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        
        .items-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .item-description {
          font-weight: 600;
          color: #1e293b;
        }
        
        .item-number {
          color: #64748b;
          font-weight: 600;
        }
        
        .item-price {
          color: #059669;
          font-weight: 700;
        }
        
        .item-total {
          color: #1e40af;
          font-weight: 800;
          font-size: 14px;
        }
        
        @media screen and (max-width: 768px) {
          .item-total {
            font-size: 12px;
          }
        }
        
        .totals-section {
          width: 100%;
          max-width: 400px;
          margin-right: auto;
          margin-bottom: 24px;
        }
        
        @media screen and (max-width: 768px) {
          .totals-section {
            max-width: 100%;
            margin-bottom: 20px;
          }
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          font-size: 15px;
          background: #f1f5f9;
          border-right: 4px solid #3b82f6;
          margin-bottom: 8px;
        }
        
        @media screen and (max-width: 768px) {
          .total-row {
            padding: 12px 16px;
            font-size: 13px;
          }
        }
        
        .total-row.final {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: #ffffff;
          font-size: 22px;
          font-weight: 900;
          border-radius: 0;
          box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
          letter-spacing: 0.5px;
          border-right: none;
          margin-bottom: 0;
        }
        
        @media screen and (max-width: 768px) {
          .total-row.final {
            font-size: 18px;
            padding: 14px 16px;
          }
        }
        
        .total-label {
          font-weight: 700;
        }
        
        .total-value {
          font-weight: 800;
        }
        
        .notes-section {
          background: #fffbeb;
          padding: 18px 20px;
          border-right: 4px solid #f59e0b;
          border-radius: 0;
          margin-bottom: 24px;
        }
        
        @media screen and (max-width: 768px) {
          .notes-section {
            padding: 14px 16px;
            margin-bottom: 20px;
          }
        }
        
        .notes-section h4 {
          font-size: 15px;
          color: #d97706;
          margin-bottom: 10px;
          font-weight: 800;
        }
        
        @media screen and (max-width: 768px) {
          .notes-section h4 {
            font-size: 14px;
            margin-bottom: 8px;
          }
        }
        
        .notes-section p {
          font-size: 13px;
          color: #78350f;
          line-height: 1.7;
          font-weight: 500;
        }
        
        @media screen and (max-width: 768px) {
          .notes-section p {
            font-size: 12px;
          }
        }
        
        .footer {
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 2px solid #e2e8f0;
          padding-top: 20px;
          margin-top: 32px;
          font-weight: 500;
        }
        
        @media screen and (max-width: 768px) {
          .footer {
            font-size: 11px;
            padding-top: 16px;
            margin-top: 24px;
          }
        }
        
        .footer-main {
          font-size: 14px;
          color: #475569;
          margin-bottom: 6px;
          font-weight: 600;
        }
        
        @media screen and (max-width: 768px) {
          .footer-main {
            font-size: 12px;
          }
        }
        
        @media print {
          body {
            padding: 0;
            background: #ffffff;
          }
          
          .invoice-container {
            box-shadow: none;
            padding: 0;
          }
          
          .header {
            margin: 0 0 24px 0;
            page-break-inside: avoid;
          }
          
          .items-table {
            page-break-inside: avoid;
          }
          
          .totals-section {
            page-break-inside: avoid;
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
            <span class="company-details-item">${COMPANY_INFO.address}</span>
            <span class="company-details-item">${COMPANY_INFO.phone}</span>
          </div>
        </div>
        
        <!-- Invoice Title -->
        <div class="invoice-title">
          فاتورة
        </div>
        
        <!-- Invoice & Client Info -->
        <div class="invoice-info">
          <div class="info-section">
            <h3>معلومات الفاتورة</h3>
            <div class="info-row">
              <span class="info-label">رقم الفاتورة:</span>
              <span class="info-value">${invoice.invoiceNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ الإصدار:</span>
              <span class="info-value">${dayjs(invoice.issueDate).format('DD/MM/YYYY')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ الاستحقاق:</span>
              <span class="info-value">${dayjs(invoice.dueDate).format('DD/MM/YYYY')}</span>
            </div>
          </div>
          
          <div class="info-section">
            <h3>بيانات العميل</h3>
            <div class="info-row">
              <span class="info-label">الاسم:</span>
              <span class="info-value">${client.name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الهاتف:</span>
              <span class="info-value">${client.phone || '-'}</span>
            </div>
            ${client.email ? `
            <div class="info-row">
              <span class="info-label">البريد:</span>
              <span class="info-value">${client.email}</span>
            </div>
            ` : ''}
            ${client.address ? `
            <div class="info-row">
              <span class="info-label">العنوان:</span>
              <span class="info-value">${client.address}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>الوصف</th>
              <th style="width: 80px;">الكمية</th>
              <th style="width: 110px;">السعر</th>
              <th style="width: 120px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (item) => `
              <tr>
                <td class="item-description">${item.description}</td>
                <td class="item-number">${item.quantity}</td>
                <td class="item-price">${formatCurrency(item.unitPrice)}</td>
                <td class="item-total">${formatCurrency(item.total)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row final">
            <span class="total-label">الإجمالي:</span>
            <span class="total-value">${formatCurrency(invoice.subtotal)}</span>
          </div>
        </div>
        
        ${
          invoice.notes
            ? (() => {
                // Remove temp client info from displayed notes
                const displayNotes = invoice.notes.replace(/__TEMP_CLIENT__name:.+?__phone:.+?__/g, '').trim();
                return displayNotes
                  ? `
        <!-- Notes -->
        <div class="notes-section">
          <h4>ملاحظات:</h4>
          <p>${displayNotes.replace(/\n/g, '<br>')}</p>
        </div>
        `
                  : '';
              })()
            : ''
        }
        
        <!-- Footer -->
        <div class="footer">
          <p class="footer-main">شكراً لتعاملكم معنا</p>
          <p>هذه فاتورة رسمية معتمدة</p>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 250);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export const generateExpenseInvoicePDF = (expenseInvoice: ExpenseInvoice, client: Client) => {
  // Company information
  const COMPANY_INFO = {
    name: 'المهندس محمد التركي',
    address: 'تاجوراء شارع اولاد التركي',
    phone: '0913041404',
    email: '',
    taxNumber: '',
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
          <h4>الفترة المغطاة</h4>
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
                ${dayjs(date).format('DD/MM/YYYY')}
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

