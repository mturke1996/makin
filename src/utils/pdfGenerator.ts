import type {
  Invoice,
  Client,
  ExpenseInvoice,
  Payment,
  Expense,
} from "../types";
import { formatCurrency } from "./calculations";
import dayjs from "dayjs";
import QRCode from "qrcode";

export const generateInvoicePDF = (invoice: Invoice, client: Client) => {
  // Company information
  const COMPANY_INFO = {
    name: "شركة ماكن للمقاولات العامة",
    address: "طرابلس - تاجوراء",
    phone: "0912118388",
    email: "info@makin.ly",
    taxNumber: "",
  };

  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("يرجى السماح بفتح النوافذ المنبثقة لطباعة الفاتورة");
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
              <span class="info-value">${dayjs(invoice.issueDate).format(
                "DD/MM/YYYY"
              )}</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ الاستحقاق:</span>
              <span class="info-value">${dayjs(invoice.dueDate).format(
                "DD/MM/YYYY"
              )}</span>
            </div>
          </div>
          
          <div class="info-section">
            <h3>بيانات العميل</h3>
            <div class="info-row">
              <span class="info-label">الاسم:</span>
              <span class="info-value">${client.name || "-"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الهاتف:</span>
              <span class="info-value">${client.phone || "-"}</span>
            </div>
            ${
              client.email
                ? `
            <div class="info-row">
              <span class="info-label">البريد:</span>
              <span class="info-value">${client.email}</span>
            </div>
            `
                : ""
            }
            ${
              client.address
                ? `
            <div class="info-row">
              <span class="info-label">العنوان:</span>
              <span class="info-value">${client.address}</span>
            </div>
            `
                : ""
            }
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
              .join("")}
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
                const displayNotes = invoice.notes
                  .replace(/__TEMP_CLIENT__name:.+?__phone:.+?__/g, "")
                  .trim();
                return displayNotes
                  ? `
        <!-- Notes -->
        <div class="notes-section">
          <h4>ملاحظات:</h4>
          <p>${displayNotes.replace(/\n/g, "<br>")}</p>
        </div>
        `
                  : "";
              })()
            : ""
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

export const generateExpenseInvoicePDF = (
  expenseInvoice: ExpenseInvoice,
  client: Client
) => {
  // Company information
  const COMPANY_INFO = {
    name: "شركة ماكن للمقاولات العامة",
    address: "طرابلس - تاجوراء",
    phone: "0912118388",
    email: "info@makin.ly",
    taxNumber: "",
  };

  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("يرجى السماح بفتح النوافذ المنبثقة لطباعة الفاتورة");
    return;
  }

  // Group expenses by date
  const expensesByDate = expenseInvoice.expenses.reduce((acc, exp) => {
    const dateKey = dayjs(exp.date).format("YYYY-MM-DD");
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
      <meta name="format-detection" content="telephone=no">
      <title>فاتورة مصروفات ${expenseInvoice.invoiceNumber}</title>
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
          line-height: 1.7;
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
          background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
          color: #ffffff;
          padding: 32px 24px;
          border-radius: 0;
          margin: -20px -20px 24px -20px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.2);
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
          border-right: 4px solid #10b981;
        }
        
        @media screen and (max-width: 768px) {
          .info-section {
            padding: 16px;
          }
        }
        
        .info-section h3 {
          font-size: 16px;
          color: #059669;
          margin-bottom: 16px;
          border-bottom: 2px solid #10b981;
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
        
        .period-section {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          padding: 18px 20px;
          border-radius: 0;
          margin-bottom: 24px;
          border-right: 4px solid #10b981;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
        }
        
        @media screen and (max-width: 768px) {
          .period-section {
            padding: 14px 16px;
            margin-bottom: 20px;
          }
        }
        
        .period-section h4 {
          font-size: 16px;
          color: #059669;
          margin-bottom: 12px;
          font-weight: 800;
        }
        
        @media screen and (max-width: 768px) {
          .period-section h4 {
            font-size: 15px;
            margin-bottom: 10px;
          }
        }
        
        .expenses-by-date {
          margin-bottom: 24px;
        }
        
        .date-group {
          margin-bottom: 24px;
          border: 1px solid #e5e7eb;
          border-radius: 0;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .date-header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 14px 20px;
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.5px;
        }
        
        @media screen and (max-width: 768px) {
          .date-header {
            padding: 12px 16px;
            font-size: 14px;
          }
        }
        
        .expenses-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          background: #ffffff;
        }
        
        @media screen and (max-width: 768px) {
          .expenses-table {
            font-size: 11px;
          }
        }
        
        .expenses-table thead {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }
        
        .expenses-table th {
          padding: 14px 12px;
          text-align: right;
          font-weight: 700;
          color: #374151;
          border-bottom: 2px solid #d1d5db;
          font-size: 13px;
        }
        
        @media screen and (max-width: 768px) {
          .expenses-table th {
            padding: 10px 8px;
            font-size: 11px;
          }
        }
        
        .expenses-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          text-align: right;
          font-size: 13px;
          color: #334155;
        }
        
        @media screen and (max-width: 768px) {
          .expenses-table td {
            padding: 10px 8px;
            font-size: 11px;
          }
        }
        
        .expenses-table tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        
        .expenses-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .expense-notes {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
          margin-top: 4px;
          padding-right: 8px;
          border-right: 2px solid #cbd5e1;
        }
        
        @media screen and (max-width: 768px) {
          .expense-notes {
            font-size: 10px;
          }
        }
        
        .category-badge {
          display: inline-block;
          padding: 6px 12px;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
          border-radius: 0;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 1px 3px rgba(30, 64, 175, 0.2);
        }
        
        @media screen and (max-width: 768px) {
          .category-badge {
            padding: 4px 8px;
            font-size: 10px;
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
          border-right: 4px solid #10b981;
          margin-bottom: 8px;
        }
        
        @media screen and (max-width: 768px) {
          .total-row {
            padding: 12px 16px;
            font-size: 13px;
          }
        }
        
        .total-row.final {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          font-size: 22px;
          font-weight: 900;
          border-radius: 0;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
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
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          padding: 20px 24px;
          border-right: 4px solid #f59e0b;
          border-radius: 0;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
        }
        
        @media screen and (max-width: 768px) {
          .notes-section {
            padding: 16px 18px;
            margin-bottom: 20px;
          }
        }
        
        .notes-section h4 {
          font-size: 16px;
          color: #d97706;
          margin-bottom: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        @media screen and (max-width: 768px) {
          .notes-section h4 {
            font-size: 15px;
            margin-bottom: 10px;
          }
        }
        
        .notes-section h4::before {
          content: "📝";
          font-size: 18px;
        }
        
        .notes-section p {
          font-size: 14px;
          color: #78350f;
          line-height: 1.8;
          font-weight: 500;
          white-space: pre-wrap;
        }
        
        @media screen and (max-width: 768px) {
          .notes-section p {
            font-size: 13px;
            line-height: 1.7;
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
          
          .expenses-table {
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
          فاتورة مصروفات
        </div>
        
        <!-- Invoice & Client Info -->
        <div class="invoice-info">
          <div class="info-section">
            <h3>معلومات الفاتورة</h3>
            <div class="info-row">
              <span class="info-label">رقم الفاتورة:</span>
              <span class="info-value">${expenseInvoice.invoiceNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ الإصدار:</span>
              <span class="info-value">${dayjs(expenseInvoice.issueDate).format(
                "DD/MM/YYYY"
              )}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الحالة:</span>
              <span class="info-value">${
                expenseInvoice.status === "paid"
                  ? "مدفوعة"
                  : expenseInvoice.status === "sent"
                  ? "مرسلة"
                  : "مسودة"
              }</span>
            </div>
          </div>
          
          <div class="info-section">
            <h3>بيانات العميل</h3>
            <div class="info-row">
              <span class="info-label">الاسم:</span>
              <span class="info-value">${client.name || "-"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الهاتف:</span>
              <span class="info-value">${client.phone || "-"}</span>
            </div>
            ${
              client.email
                ? `
            <div class="info-row">
              <span class="info-label">البريد:</span>
              <span class="info-value">${client.email}</span>
            </div>
            `
                : ""
            }
            ${
              client.address
                ? `
            <div class="info-row">
              <span class="info-label">العنوان:</span>
              <span class="info-value">${client.address}</span>
            </div>
            `
                : ""
            }
          </div>
        </div>
        
        <!-- Period Section -->
        <div class="period-section">
          <h4>📅 الفترة المغطاة</h4>
          <div class="info-row">
            <span class="info-label">من:</span>
            <span class="info-value">${dayjs(expenseInvoice.startDate).format(
              "DD/MM/YYYY"
            )}</span>
          </div>
          <div class="info-row">
            <span class="info-label">إلى:</span>
            <span class="info-value">${dayjs(expenseInvoice.endDate).format(
              "DD/MM/YYYY"
            )}</span>
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
                📆 ${dayjs(date).format("DD/MM/YYYY")}
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
                      <td>
                        <strong>${exp.description}</strong>
                        ${
                          exp.notes
                            ? `<div class="expense-notes">💬 ${exp.notes}</div>`
                            : ""
                        }
                      </td>
                      <td><span class="category-badge">${
                        exp.category
                      }</span></td>
                      <td style="font-weight: bold; color: #059669; font-size: 14px;">${formatCurrency(
                        exp.amount
                      )}</td>
                    </tr>
                  `
                    )
                    .join("")}
                  <tr style="background: #f1f5f9; font-weight: bold;">
                    <td colspan="2" style="text-align: left; padding-right: 20px;">💰 إجمالي اليوم:</td>
                    <td style="color: #059669; font-size: 15px;">${formatCurrency(
                      expenses.reduce((sum, e) => sum + e.amount, 0)
                    )}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `
            )
            .join("")}
        </div>
        
        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row">
            <span class="total-label">عدد المصروفات:</span>
            <span class="total-value">${expenseInvoice.expenses.length}</span>
          </div>
          <div class="total-row final">
            <span class="total-label">الإجمالي:</span>
            <span class="total-value">${formatCurrency(
              expenseInvoice.totalAmount
            )}</span>
          </div>
        </div>
        
        ${
          expenseInvoice.notes
            ? `
        <!-- Notes -->
        <div class="notes-section">
          <h4>ملاحظات</h4>
          <p>${expenseInvoice.notes.replace(/\n/g, "<br>")}</p>
        </div>
        `
            : ""
        }
        
        <!-- Footer -->
        <div class="footer">
          <p class="footer-main">شكراً لتعاملكم معنا</p>
          <p>هذه فاتورة مصروفات رسمية معتمدة</p>
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

export const generatePaymentsSummaryPDF = (
  payments: Payment[],
  clients: Client[],
  invoices: Invoice[]
) => {
  // Company information
  const COMPANY_INFO = {
    name: "شركة ماكن للمقاولات العامة",
    address: "طرابلس - تاجوراء",
    phone: "0912118388",
    email: "info@makin.ly",
    taxNumber: "",
  };

  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("يرجى السماح بفتح النوافذ المنبثقة لطباعة التقرير");
    return;
  }

  // Group payments by date
  const paymentsByDate = payments.reduce((acc, payment) => {
    const dateKey = dayjs(payment.paymentDate).format("YYYY-MM-DD");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(payment);
    return acc;
  }, {} as Record<string, Payment[]>);

  // Calculate totals
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  const getPaymentMethodLabel = (method: Payment["paymentMethod"]) => {
    switch (method) {
      case "cash":
        return "💵 نقدي";
      case "bank_transfer":
        return "🏦 تحويل بنكي";
      case "check":
        return "📝 شيك";
      case "credit_card":
        return "💳 بطاقة ائتمان";
      default:
        return method;
    }
  };

  // Generate HTML for the payments summary
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
      <meta name="format-detection" content="telephone=no">
      <title>تقرير المدفوعات</title>
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
          line-height: 1.7;
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
          background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
          color: #ffffff;
          padding: 32px 24px;
          border-radius: 0;
          margin: -20px -20px 24px -20px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.2);
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
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        
        @media screen and (max-width: 768px) {
          .summary-cards {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 20px;
          }
        }
        
        .summary-card {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 20px;
          border-radius: 0;
          border-right: 4px solid #10b981;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        @media screen and (max-width: 768px) {
          .summary-card {
            padding: 16px;
          }
        }
        
        .summary-card-label {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        @media screen and (max-width: 768px) {
          .summary-card-label {
            font-size: 12px;
            margin-bottom: 6px;
          }
        }
        
        .summary-card-value {
          font-size: 20px;
          color: #059669;
          font-weight: 800;
        }
        
        @media screen and (max-width: 768px) {
          .summary-card-value {
            font-size: 18px;
          }
        }
        
        .payments-by-date {
          margin-bottom: 24px;
        }
        
        .date-group {
          margin-bottom: 24px;
          border: 1px solid #e5e7eb;
          border-radius: 0;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .date-header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 14px 20px;
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.5px;
        }
        
        @media screen and (max-width: 768px) {
          .date-header {
            padding: 12px 16px;
            font-size: 14px;
          }
        }
        
        .payments-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          background: #ffffff;
        }
        
        @media screen and (max-width: 768px) {
          .payments-table {
            font-size: 11px;
          }
        }
        
        .payments-table thead {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }
        
        .payments-table th {
          padding: 14px 12px;
          text-align: right;
          font-weight: 700;
          color: #374151;
          border-bottom: 2px solid #d1d5db;
          font-size: 13px;
        }
        
        @media screen and (max-width: 768px) {
          .payments-table th {
            padding: 10px 8px;
            font-size: 11px;
          }
        }
        
        .payments-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          text-align: right;
          font-size: 13px;
          color: #334155;
        }
        
        @media screen and (max-width: 768px) {
          .payments-table td {
            padding: 10px 8px;
            font-size: 11px;
          }
        }
        
        .payments-table tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        
        .payments-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .payment-notes {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
          margin-top: 4px;
          padding-right: 8px;
          border-right: 2px solid #cbd5e1;
          line-height: 1.5;
          word-wrap: break-word;
          max-width: 200px;
        }
        
        @media screen and (max-width: 768px) {
          .payment-notes {
            font-size: 10px;
            max-width: 150px;
          }
        }
        
        .payments-table td:last-child {
          min-width: 150px;
          max-width: 250px;
        }
        
        .method-badge {
          display: inline-block;
          padding: 6px 12px;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
          border-radius: 0;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 1px 3px rgba(30, 64, 175, 0.2);
        }
        
        @media screen and (max-width: 768px) {
          .method-badge {
            padding: 4px 8px;
            font-size: 10px;
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
          border-right: 4px solid #10b981;
          margin-bottom: 8px;
        }
        
        @media screen and (max-width: 768px) {
          .total-row {
            padding: 12px 16px;
            font-size: 13px;
          }
        }
        
        .total-row.final {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          font-size: 22px;
          font-weight: 900;
          border-radius: 0;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
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
          
          .payments-table {
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
        
        <!-- Title -->
        <div class="invoice-title">
          تقرير المدفوعات
        </div>
        
        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-card-label">إجمالي المدفوعات</div>
            <div class="summary-card-value">${formatCurrency(totalAmount)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-label">عدد المدفوعات</div>
            <div class="summary-card-value">${payments.length}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-label">تاريخ التقرير</div>
            <div class="summary-card-value">${dayjs().format(
              "DD/MM/YYYY"
            )}</div>
          </div>
        </div>
        
        <!-- Payments by Date -->
        <div class="payments-by-date">
          ${Object.entries(paymentsByDate)
            .sort(([a], [b]) => dayjs(b).diff(dayjs(a)))
            .map(([date, datePayments]) => {
              const dateTotal = datePayments.reduce(
                (sum, p) => sum + p.amount,
                0
              );
              return `
            <div class="date-group">
              <div class="date-header">
                📆 ${dayjs(date).format("DD/MM/YYYY")}
              </div>
              <table class="payments-table">
                <thead>
                  <tr>
                    <th>العميل</th>
                    <th>الفاتورة</th>
                    <th>طريقة الدفع</th>
                    <th>المبلغ</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  ${datePayments
                    .map((payment) => {
                      const client = clients.find(
                        (c) => c.id === payment.clientId
                      );
                      const invoice = payment.invoiceId
                        ? invoices.find((i) => i.id === payment.invoiceId)
                        : null;
                      return `
                    <tr>
                      <td>
                        <strong>${client?.name || "غير معروف"}</strong>
                      </td>
                      <td>${invoice ? invoice.invoiceNumber : "-"}</td>
                      <td><span class="method-badge">${getPaymentMethodLabel(
                        payment.paymentMethod
                      )}</span></td>
                      <td style="font-weight: bold; color: #059669; font-size: 14px;">${formatCurrency(
                        payment.amount
                      )}</td>
                      <td>
                        ${
                          payment.notes
                            ? `<div class="payment-notes">💬 ${payment.notes}</div>`
                            : "<span style='color: #94a3b8;'>-</span>"
                        }
                      </td>
                    </tr>
                  `;
                    })
                    .join("")}
                  <tr style="background: #f1f5f9; font-weight: bold;">
                    <td colspan="4" style="text-align: left; padding-right: 20px;">💰 إجمالي اليوم:</td>
                    <td style="color: #059669; font-size: 15px;">${formatCurrency(
                      dateTotal
                    )}</td>
                    <td style="color: #94a3b8;">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
            })
            .join("")}
        </div>
        
        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row final">
            <span class="total-label">الإجمالي الكلي:</span>
            <span class="total-value">${formatCurrency(totalAmount)}</span>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p class="footer-main">شكراً لتعاملكم معنا</p>
          <p>هذا تقرير مدفوعات رسمي معتمد</p>
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

export const generateExpenseInvoicesSummaryPDF = (
  expenseInvoices: ExpenseInvoice[],
  clients: Client[]
) => {
  // Company information
  const COMPANY_INFO = {
    name: "شركة ماكن للمقاولات العامة",
    address: "طرابلس - تاجوراء",
    phone: "0912118388",
    email: "info@makin.ly",
    taxNumber: "",
  };

  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("يرجى السماح بفتح النوافذ المنبثقة لطباعة التقرير");
    return;
  }

  // Calculate totals
  const totalAmount = expenseInvoices.reduce(
    (sum, inv) => sum + inv.totalAmount,
    0
  );
  const totalExpenses = expenseInvoices.reduce(
    (sum, inv) => sum + inv.expenses.length,
    0
  );

  // Generate HTML for the expense invoices summary
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
      <meta name="format-detection" content="telephone=no">
      <title>تقرير فواتير المصروفات</title>
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
          line-height: 1.7;
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
          background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
          color: #ffffff;
          padding: 32px 24px;
          border-radius: 0;
          margin: -20px -20px 24px -20px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.2);
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
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        
        @media screen and (max-width: 768px) {
          .summary-cards {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 20px;
          }
        }
        
        .summary-card {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 20px;
          border-radius: 0;
          border-right: 4px solid #10b981;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        @media screen and (max-width: 768px) {
          .summary-card {
            padding: 16px;
          }
        }
        
        .summary-card-label {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        @media screen and (max-width: 768px) {
          .summary-card-label {
            font-size: 12px;
            margin-bottom: 6px;
          }
        }
        
        .summary-card-value {
          font-size: 20px;
          color: #059669;
          font-weight: 800;
        }
        
        @media screen and (max-width: 768px) {
          .summary-card-value {
            font-size: 18px;
          }
        }
        
        .invoices-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          background: #ffffff;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        @media screen and (max-width: 768px) {
          .invoices-table {
            font-size: 11px;
            margin-bottom: 20px;
          }
        }
        
        .invoices-table thead {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
        }
        
        .invoices-table th {
          padding: 14px 12px;
          text-align: right;
          font-weight: 700;
          color: #ffffff;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
          font-size: 13px;
        }
        
        @media screen and (max-width: 768px) {
          .invoices-table th {
            padding: 10px 8px;
            font-size: 11px;
          }
        }
        
        .invoices-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          text-align: right;
          font-size: 13px;
          color: #334155;
        }
        
        @media screen and (max-width: 768px) {
          .invoices-table td {
            padding: 10px 8px;
            font-size: 11px;
          }
        }
        
        .invoices-table tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        
        .invoices-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
          border-radius: 0;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 1px 3px rgba(30, 64, 175, 0.2);
        }
        
        @media screen and (max-width: 768px) {
          .status-badge {
            padding: 4px 8px;
            font-size: 10px;
          }
        }
        
        .status-badge.paid {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
        }
        
        .status-badge.sent {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
        }
        
        .status-badge.overdue {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
        }
        
        .payment-notes {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
          margin-top: 4px;
          padding-right: 8px;
          border-right: 2px solid #cbd5e1;
          line-height: 1.5;
          word-wrap: break-word;
          max-width: 200px;
        }
        
        @media screen and (max-width: 768px) {
          .payment-notes {
            font-size: 10px;
            max-width: 150px;
          }
        }
        
        .payments-table td:last-child,
        .invoices-table td:last-child {
          min-width: 150px;
          max-width: 250px;
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
          border-right: 4px solid #10b981;
          margin-bottom: 8px;
        }
        
        @media screen and (max-width: 768px) {
          .total-row {
            padding: 12px 16px;
            font-size: 13px;
          }
        }
        
        .total-row.final {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          font-size: 22px;
          font-weight: 900;
          border-radius: 0;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
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
          
          .invoices-table {
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
        
        <!-- Title -->
        <div class="invoice-title">
          تقرير فواتير المصروفات
        </div>
        
        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-card-label">إجمالي الفواتير</div>
            <div class="summary-card-value">${formatCurrency(totalAmount)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-label">عدد الفواتير</div>
            <div class="summary-card-value">${expenseInvoices.length}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-label">إجمالي المصروفات</div>
            <div class="summary-card-value">${totalExpenses}</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-label">تاريخ التقرير</div>
            <div class="summary-card-value">${dayjs().format(
              "DD/MM/YYYY"
            )}</div>
          </div>
        </div>
        
        <!-- Invoices Table -->
        <table class="invoices-table">
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>العميل</th>
              <th>الفترة</th>
              <th>عدد المصروفات</th>
              <th>المبلغ</th>
              <th>الحالة</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${expenseInvoices
              .sort((a, b) => dayjs(b.issueDate).diff(dayjs(a.issueDate)))
              .map((invoice) => {
                const client = clients.find((c) => c.id === invoice.clientId);
                const statusLabel =
                  invoice.status === "paid"
                    ? "مدفوعة"
                    : invoice.status === "sent"
                    ? "مرسلة"
                    : invoice.status === "overdue"
                    ? "متأخرة"
                    : "مسودة";
                const statusClass =
                  invoice.status === "paid"
                    ? "paid"
                    : invoice.status === "sent"
                    ? "sent"
                    : invoice.status === "overdue"
                    ? "overdue"
                    : "";
                return `
              <tr>
                <td>
                  <strong>${invoice.invoiceNumber}</strong>
                </td>
                <td>${client?.name || "غير معروف"}</td>
                <td>${dayjs(invoice.startDate).format("DD/MM/YYYY")} - ${dayjs(
                  invoice.endDate
                ).format("DD/MM/YYYY")}</td>
                <td>${invoice.expenses.length}</td>
                <td style="font-weight: bold; color: #059669; font-size: 14px;">${formatCurrency(
                  invoice.totalAmount
                )}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                  ${
                    invoice.notes
                      ? `<div class="payment-notes">📝 ${invoice.notes}</div>`
                      : "<span style='color: #94a3b8;'>-</span>"
                  }
                </td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>
        
        <!-- Expenses Details with Notes -->
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 18px; color: #059669; margin-bottom: 16px; font-weight: 800; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
            📋 تفاصيل المصروفات مع الملاحظات
          </h3>
          ${expenseInvoices
            .sort((a, b) => dayjs(b.issueDate).diff(dayjs(a.issueDate)))
            .map((invoice) => {
              const client = clients.find((c) => c.id === invoice.clientId);
              const expensesWithNotes = invoice.expenses.filter(
                (exp) => exp.notes && exp.notes.trim()
              );

              if (expensesWithNotes.length === 0) {
                return "";
              }

              return `
            <div style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 16px; font-weight: 800; font-size: 14px;">
                📄 ${invoice.invoiceNumber} - ${client?.name || "غير معروف"}
              </div>
              <div style="padding: 16px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                  <thead>
                    <tr style="background: #f3f4f6;">
                      <th style="padding: 10px; text-align: right; font-weight: 700; color: #374151; border-bottom: 2px solid #d1d5db;">التاريخ</th>
                      <th style="padding: 10px; text-align: right; font-weight: 700; color: #374151; border-bottom: 2px solid #d1d5db;">الوصف</th>
                      <th style="padding: 10px; text-align: right; font-weight: 700; color: #374151; border-bottom: 2px solid #d1d5db;">المبلغ</th>
                      <th style="padding: 10px; text-align: right; font-weight: 700; color: #374151; border-bottom: 2px solid #d1d5db;">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${expensesWithNotes
                      .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                      .map(
                        (expense) => `
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 10px; color: #334155;">${dayjs(
                          expense.date
                        ).format("DD/MM/YYYY")}</td>
                        <td style="padding: 10px; color: #334155; font-weight: 600;">${
                          expense.description
                        }</td>
                        <td style="padding: 10px; color: #059669; font-weight: 700;">${formatCurrency(
                          expense.amount
                        )}</td>
                        <td style="padding: 10px; color: #64748b; font-style: italic; line-height: 1.6;">💬 ${
                          expense.notes
                        }</td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>
          `;
            })
            .join("")}
        </div>
        
        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row final">
            <span class="total-label">الإجمالي الكلي:</span>
            <span class="total-value">${formatCurrency(totalAmount)}</span>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p class="footer-main">شكراً لتعاملكم معنا</p>
          <p>هذا تقرير فواتير مصروفات رسمي معتمد</p>
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

export const generateFinalReportPDF = (
  client: Client,
  expenses: Expense[],
  payments: Payment[],
  invoices: Invoice[]
) => {
  // Company information
  const COMPANY_INFO = {
    name: "شركة ماكن للمقاولات العامة",
    address: "طرابلس - تاجوراء",
    phone: "0912118388",
    email: "info@makin.ly",
    taxNumber: "",
  };

  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("يرجى السماح بفتح النوافذ المنبثقة لطباعة التقرير");
    return;
  }

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalPayments = payments.reduce((sum, pay) => sum + pay.amount, 0);
  const profitPercentage = client.profitPercentage || 0;
  const profit =
    totalExpenses > 0 && profitPercentage > 0
      ? (totalExpenses * profitPercentage) / 100
      : 0;
  const remaining = totalPayments - totalExpenses;

  // Group expenses by date
  const expensesByDate = expenses.reduce((acc, exp) => {
    const dateKey = dayjs(exp.date).format("YYYY-MM-DD");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(exp);
    return acc;
  }, {} as Record<string, Expense[]>);

  // Group payments by date
  const paymentsByDate = payments.reduce((acc, payment) => {
    const dateKey = dayjs(payment.paymentDate).format("YYYY-MM-DD");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(payment);
    return acc;
  }, {} as Record<string, Payment[]>);

  const getPaymentMethodLabel = (method: Payment["paymentMethod"]) => {
    switch (method) {
      case "cash":
        return "💵 نقدي";
      case "bank_transfer":
        return "🏦 تحويل بنكي";
      case "check":
        return "📝 شيك";
      case "credit_card":
        return "💳 بطاقة ائتمان";
      default:
        return method;
    }
  };

  // Generate HTML for the final report
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
      <meta name="format-detection" content="telephone=no">
      <title>التقرير النهائي - ${client.name}</title>
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
          line-height: 1.7;
          color: #1e293b;
          background: #ffffff;
          padding: 0;
          margin: 0;
          width: 100%;
          overflow-x: hidden;
        }
        
        .report-container {
          max-width: 100%;
          width: 100%;
          background: #ffffff;
          margin: 0 auto;
          padding: 20px;
        }
        
        @media screen and (max-width: 768px) {
          .report-container {
            padding: 12px;
          }
        }
        
        .header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
          color: #ffffff;
          padding: 40px 28px;
          border-radius: 0;
          margin: -20px -20px 32px -20px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(99, 102, 241, 0.25);
          position: relative;
          overflow: hidden;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        }
        
        @media screen and (max-width: 768px) {
          .header {
            padding: 28px 20px;
            margin: -12px -12px 24px -12px;
          }
        }
        
        .company-name {
          font-size: 32px;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 20px;
          letter-spacing: 0.5px;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          position: relative;
          z-index: 1;
        }
        
        @media screen and (max-width: 768px) {
          .company-name {
            font-size: 24px;
            margin-bottom: 16px;
          }
        }
        
        .company-details {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.95);
          line-height: 2.2;
          font-weight: 500;
          position: relative;
          z-index: 1;
        }
        
        @media screen and (max-width: 768px) {
          .company-details {
            font-size: 14px;
            line-height: 2;
          }
        }
        
        .company-details-item {
          display: inline-block;
          margin: 0 14px;
        }
        
        @media screen and (max-width: 768px) {
          .company-details-item {
            display: block;
            margin: 4px 0;
          }
        }
        
        .report-title {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
          color: #ffffff;
          padding: 24px 28px;
          text-align: center;
          font-size: 28px;
          font-weight: 900;
          margin-bottom: 32px;
          border-radius: 0;
          letter-spacing: 1.5px;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
        }
        
        @media screen and (max-width: 768px) {
          .report-title {
            font-size: 22px;
            padding: 18px 20px;
            margin-bottom: 24px;
          }
        }
        
        .client-info-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 28px 24px;
          border-radius: 0;
          margin-bottom: 32px;
          border-right: 5px solid #6366f1;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }
        
        @media screen and (max-width: 768px) {
          .client-info-section {
            padding: 20px 18px;
            margin-bottom: 24px;
          }
        }
        
        .client-info-title {
          font-size: 20px;
          color: #6366f1;
          margin-bottom: 20px;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .client-info-title::before {
          content: "👤";
          font-size: 24px;
        }
        
        @media screen and (max-width: 768px) {
          .client-info-title {
            font-size: 18px;
            margin-bottom: 16px;
          }
        }
        
        .client-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        
        @media screen and (max-width: 768px) {
          .client-info-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
        
        .client-info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #ffffff;
          border-radius: 0;
          border-right: 3px solid #cbd5e1;
        }
        
        @media screen and (max-width: 768px) {
          .client-info-item {
            padding: 10px 14px;
          }
        }
        
        .client-info-label {
          font-weight: 700;
          color: #475569;
          font-size: 14px;
        }
        
        @media screen and (max-width: 768px) {
          .client-info-label {
            font-size: 13px;
          }
        }
        
        .client-info-value {
          color: #1e293b;
          font-weight: 600;
          font-size: 14px;
        }
        
        @media screen and (max-width: 768px) {
          .client-info-value {
            font-size: 13px;
          }
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        
        @media screen and (max-width: 768px) {
          .summary-cards {
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }
        }
        
        .summary-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          padding: 24px;
          border-radius: 0;
          border: 2px solid #e2e8f0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          position: relative;
          overflow: hidden;
        }
        
        .summary-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
        }
        
        @media screen and (max-width: 768px) {
          .summary-card {
            padding: 20px;
          }
        }
        
        .summary-card.expenses::before {
          background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
        }
        
        .summary-card.payments::before {
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
        }
        
        .summary-card.profit::before {
          background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
        }
        
        .summary-card.remaining::before {
          background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
        }
        
        .summary-card-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        
        @media screen and (max-width: 768px) {
          .summary-card-icon {
            font-size: 28px;
            margin-bottom: 10px;
          }
        }
        
        .summary-card-label {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        @media screen and (max-width: 768px) {
          .summary-card-label {
            font-size: 13px;
            margin-bottom: 8px;
          }
        }
        
        .summary-card-value {
          font-size: 26px;
          color: #1e293b;
          font-weight: 900;
          line-height: 1.2;
        }
        
        @media screen and (max-width: 768px) {
          .summary-card-value {
            font-size: 22px;
          }
        }
        
        .summary-card-value.expenses {
          color: #ef4444;
        }
        
        .summary-card-value.payments {
          color: #10b981;
        }
        
        .summary-card-value.profit {
          color: #f59e0b;
        }
        
        .summary-card-value.remaining {
          color: #3b82f6;
        }
        
        .section-title {
          font-size: 22px;
          color: #1e293b;
          margin-bottom: 20px;
          font-weight: 900;
          padding-bottom: 12px;
          border-bottom: 3px solid #6366f1;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        @media screen and (max-width: 768px) {
          .section-title {
            font-size: 19px;
            margin-bottom: 16px;
            padding-bottom: 10px;
          }
        }
        
        .modern-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          background: #ffffff;
          margin-bottom: 32px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          border-radius: 0;
          overflow: hidden;
        }
        
        @media screen and (max-width: 768px) {
          .modern-table {
            font-size: 11px;
            margin-bottom: 24px;
          }
        }
        
        .modern-table thead {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
        }
        
        .modern-table th {
          padding: 16px 14px;
          text-align: right;
          font-weight: 800;
          color: #ffffff;
          font-size: 14px;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        @media screen and (max-width: 768px) {
          .modern-table th {
            padding: 12px 10px;
            font-size: 12px;
          }
        }
        
        .modern-table td {
          padding: 14px;
          border-bottom: 1px solid #e5e7eb;
          text-align: right;
          font-size: 13px;
          color: #334155;
        }
        
        @media screen and (max-width: 768px) {
          .modern-table td {
            padding: 12px 10px;
            font-size: 11px;
          }
        }
        
        .modern-table tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        
        .modern-table tbody tr:hover {
          background: #f3f4f6;
          transition: background 0.2s;
        }
        
        .modern-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .table-notes {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
          margin-top: 6px;
          padding-right: 10px;
          border-right: 2px solid #cbd5e1;
          line-height: 1.6;
        }
        
        @media screen and (max-width: 768px) {
          .table-notes {
            font-size: 10px;
            margin-top: 4px;
            padding-right: 8px;
          }
        }
        
        .category-badge {
          display: inline-block;
          padding: 6px 14px;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1e40af;
          border-radius: 0;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(30, 64, 175, 0.2);
        }
        
        @media screen and (max-width: 768px) {
          .category-badge {
            padding: 5px 10px;
            font-size: 11px;
          }
        }
        
        .method-badge {
          display: inline-block;
          padding: 6px 14px;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          border-radius: 0;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2);
        }
        
        @media screen and (max-width: 768px) {
          .method-badge {
            padding: 5px 10px;
            font-size: 11px;
          }
        }
        
        .calculation-section {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 28px 24px;
          border-radius: 0;
          margin-bottom: 32px;
          border-right: 5px solid #f59e0b;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.15);
        }
        
        @media screen and (max-width: 768px) {
          .calculation-section {
            padding: 20px 18px;
            margin-bottom: 24px;
          }
        }
        
        .calculation-title {
          font-size: 20px;
          color: #d97706;
          margin-bottom: 20px;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .calculation-title::before {
          content: "📊";
          font-size: 24px;
        }
        
        @media screen and (max-width: 768px) {
          .calculation-title {
            font-size: 18px;
            margin-bottom: 16px;
          }
        }
        
        .calculation-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        
        @media screen and (max-width: 768px) {
          .calculation-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
        
        .calculation-item {
          background: #ffffff;
          padding: 18px 20px;
          border-radius: 0;
          border-right: 3px solid #f59e0b;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        @media screen and (max-width: 768px) {
          .calculation-item {
            padding: 14px 16px;
          }
        }
        
        .calculation-label {
          font-size: 13px;
          color: #78350f;
          margin-bottom: 8px;
          font-weight: 700;
        }
        
        @media screen and (max-width: 768px) {
          .calculation-label {
            font-size: 12px;
            margin-bottom: 6px;
          }
        }
        
        .calculation-value {
          font-size: 20px;
          color: #92400e;
          font-weight: 900;
        }
        
        @media screen and (max-width: 768px) {
          .calculation-value {
            font-size: 18px;
          }
        }
        
        .footer {
          text-align: center;
          font-size: 13px;
          color: #64748b;
          border-top: 3px solid #e2e8f0;
          padding-top: 24px;
          margin-top: 40px;
          font-weight: 500;
        }
        
        @media screen and (max-width: 768px) {
          .footer {
            font-size: 12px;
            padding-top: 20px;
            margin-top: 32px;
          }
        }
        
        .footer-main {
          font-size: 16px;
          color: #475569;
          margin-bottom: 8px;
          font-weight: 700;
        }
        
        @media screen and (max-width: 768px) {
          .footer-main {
            font-size: 14px;
            margin-bottom: 6px;
          }
        }
        
        .date-group-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 14px 20px;
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.5px;
          margin-bottom: 0;
        }
        
        @media screen and (max-width: 768px) {
          .date-group-header {
            padding: 12px 16px;
            font-size: 14px;
          }
        }
        
        @media print {
          body {
            padding: 0;
            background: #ffffff;
          }
          
          .report-container {
            box-shadow: none;
            padding: 0;
          }
          
          .header {
            margin: 0 0 24px 0;
            page-break-inside: avoid;
          }
          
          .modern-table {
            page-break-inside: avoid;
          }
          
          .calculation-section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <!-- Header -->
        <div class="header">
          <div class="company-name">${COMPANY_INFO.name}</div>
          <div class="company-details">
            <span class="company-details-item">${COMPANY_INFO.address}</span>
            <span class="company-details-item">${COMPANY_INFO.phone}</span>
          </div>
        </div>
        
        <!-- Report Title -->
        <div class="report-title">
          📋 التقرير النهائي
        </div>
        
        <!-- Client Info -->
        <div class="client-info-section">
          <div class="client-info-title">معلومات العميل</div>
          <div class="client-info-grid">
            <div class="client-info-item">
              <span class="client-info-label">الاسم:</span>
              <span class="client-info-value">${client.name}</span>
            </div>
            <div class="client-info-item">
              <span class="client-info-label">الهاتف:</span>
              <span class="client-info-value">${client.phone}</span>
            </div>
            ${
              client.email
                ? `
            <div class="client-info-item">
              <span class="client-info-label">البريد:</span>
              <span class="client-info-value">${client.email}</span>
            </div>
            `
                : ""
            }
            ${
              client.address
                ? `
            <div class="client-info-item">
              <span class="client-info-label">العنوان:</span>
              <span class="client-info-value">${client.address}</span>
            </div>
            `
                : ""
            }
            <div class="client-info-item">
              <span class="client-info-label">النوع:</span>
              <span class="client-info-value">${
                client.type === "company" ? "شركة" : "فرد"
              }</span>
            </div>
            <div class="client-info-item">
              <span class="client-info-label">تاريخ التقرير:</span>
              <span class="client-info-value">${dayjs().format(
                "DD/MM/YYYY"
              )}</span>
            </div>
          </div>
        </div>
        
        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="summary-card expenses">
            <div class="summary-card-icon">💰</div>
            <div class="summary-card-label">إجمالي المصروفات</div>
            <div class="summary-card-value expenses">${formatCurrency(
              totalExpenses
            )}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">${
              expenses.length
            } مصروف</div>
          </div>
          
          <div class="summary-card payments">
            <div class="summary-card-icon">💵</div>
            <div class="summary-card-label">إجمالي المدفوعات</div>
            <div class="summary-card-value payments">${formatCurrency(
              totalPayments
            )}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">${
              payments.length
            } دفعة</div>
          </div>
          
          <div class="summary-card profit">
            <div class="summary-card-icon">📈</div>
            <div class="summary-card-label">نسبة الربح (${profitPercentage}%)</div>
            <div class="summary-card-value profit">${formatCurrency(
              profit
            )}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">من المصروفات</div>
          </div>
          
          <div class="summary-card remaining">
            <div class="summary-card-icon">💼</div>
            <div class="summary-card-label">المتبقي</div>
            <div class="summary-card-value remaining">${formatCurrency(
              remaining
            )}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">المدفوعات - المصروفات</div>
          </div>
        </div>
        
        <!-- Expenses Section -->
        <h2 class="section-title">
          <span>📝</span>
          المصروفات (${expenses.length})
        </h2>
        
        ${Object.entries(expensesByDate)
          .sort(([a], [b]) => dayjs(b).diff(dayjs(a)))
          .map(([date, dateExpenses]) => {
            const dateTotal = dateExpenses.reduce(
              (sum, e) => sum + e.amount,
              0
            );
            return `
          <div style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
            <div class="date-group-header">
              📅 ${dayjs(date).format("DD/MM/YYYY")}
            </div>
            <table class="modern-table">
              <thead>
                <tr>
                  <th>الوصف</th>
                  <th>الفئة</th>
                  <th>ملاحظات</th>
                  <th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                ${dateExpenses
                  .map(
                    (exp) => `
                  <tr>
                    <td>
                      <strong>${exp.description}</strong>
                    </td>
                    <td><span class="category-badge">${exp.category}</span></td>
                    <td>
                      ${
                        exp.notes
                          ? `<div class="table-notes">💬 ${exp.notes}</div>`
                          : '<span style="color: #94a3b8;">-</span>'
                      }
                    </td>
                    <td style="font-weight: bold; color: #ef4444; font-size: 15px;">${formatCurrency(
                      exp.amount
                    )}</td>
                  </tr>
                `
                  )
                  .join("")}
                <tr style="background: #fef2f2; font-weight: bold;">
                  <td colspan="3" style="text-align: left; padding-right: 20px; color: #991b1b;">💰 إجمالي اليوم:</td>
                  <td style="color: #dc2626; font-size: 16px;">${formatCurrency(
                    dateTotal
                  )}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
          })
          .join("")}
        
        <!-- Payments Section -->
        <h2 class="section-title">
          <span>💳</span>
          المدفوعات (${payments.length})
        </h2>
        
        ${Object.entries(paymentsByDate)
          .sort(([a], [b]) => dayjs(b).diff(dayjs(a)))
          .map(([date, datePayments]) => {
            const dateTotal = datePayments.reduce(
              (sum, p) => sum + p.amount,
              0
            );
            return `
          <div style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
            <div class="date-group-header">
              📅 ${dayjs(date).format("DD/MM/YYYY")}
            </div>
            <table class="modern-table">
              <thead>
                <tr>
                  <th>الفاتورة</th>
                  <th>طريقة الدفع</th>
                  <th>ملاحظات</th>
                  <th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                ${datePayments
                  .map((payment) => {
                    const invoice = payment.invoiceId
                      ? invoices.find((i) => i.id === payment.invoiceId)
                      : null;
                    return `
                  <tr>
                    <td>${invoice ? invoice.invoiceNumber : "-"}</td>
                    <td><span class="method-badge">${getPaymentMethodLabel(
                      payment.paymentMethod
                    )}</span></td>
                    <td>
                      ${
                        payment.notes
                          ? `<div class="table-notes">💬 ${payment.notes}</div>`
                          : '<span style="color: #94a3b8;">-</span>'
                      }
                    </td>
                    <td style="font-weight: bold; color: #10b981; font-size: 15px;">${formatCurrency(
                      payment.amount
                    )}</td>
                  </tr>
                `;
                  })
                  .join("")}
                <tr style="background: #f0fdf4; font-weight: bold;">
                  <td colspan="3" style="text-align: left; padding-right: 20px; color: #065f46;">💰 إجمالي اليوم:</td>
                  <td style="color: #059669; font-size: 16px;">${formatCurrency(
                    dateTotal
                  )}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
          })
          .join("")}
        
        <!-- Calculation Section -->
        <div class="calculation-section">
          <div class="calculation-title">الحسابات المالية</div>
          <div class="calculation-grid">
            <div class="calculation-item">
              <div class="calculation-label">إجمالي المصروفات</div>
              <div class="calculation-value" style="color: #ef4444;">${formatCurrency(
                totalExpenses
              )}</div>
            </div>
            <div class="calculation-item">
              <div class="calculation-label">إجمالي المدفوعات</div>
              <div class="calculation-value" style="color: #10b981;">${formatCurrency(
                totalPayments
              )}</div>
            </div>
            <div class="calculation-item">
              <div class="calculation-label">نسبة الربح (${profitPercentage}%)</div>
              <div class="calculation-value" style="color: #f59e0b;">${formatCurrency(
                profit
              )}</div>
            </div>
            <div class="calculation-item">
              <div class="calculation-label">المتبقي</div>
              <div class="calculation-value" style="color: #3b82f6;">${formatCurrency(
                remaining
              )}</div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p class="footer-main">شكراً لتعاملكم معنا</p>
          <p>هذا تقرير نهائي رسمي معتمد - ${dayjs().format("DD/MM/YYYY")}</p>
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
