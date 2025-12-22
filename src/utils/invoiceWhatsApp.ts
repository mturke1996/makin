import type { Invoice, Client } from '../types';
import { formatCurrency } from './calculations';
import dayjs from 'dayjs';

export const generateInvoiceWhatsApp = (invoice: Invoice, client: Client) => {
  const invoiceText = `
📄 *فاتورة ضريبية*

*رقم الفاتورة:* ${invoice.invoiceNumber}
*تاريخ الإصدار:* ${dayjs(invoice.issueDate).format('DD/MM/YYYY')}
*تاريخ الاستحقاق:* ${dayjs(invoice.dueDate).format('DD/MM/YYYY')}

👤 *العميل:*
${client.name}
📱 ${client.phone}
${client.email ? `📧 ${client.email}` : ''}
${client.address ? `📍 ${client.address}` : ''}

━━━━━━━━━━━━━━━━━━━━

📋 *البنود:*
${invoice.items.map((item, index) => `${index + 1}. ${item.description}
   الكمية: ${item.quantity} × ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━

💰 *الإجماليات:*
المجموع الفرعي: ${formatCurrency(invoice.subtotal)}
${invoice.taxAmount > 0 ? `الضريبة (${invoice.taxRate}%): ${formatCurrency(invoice.taxAmount)}\n` : ''}*الإجمالي: ${formatCurrency(invoice.total)}*

${invoice.notes ? `\n📝 *ملاحظات:*\n${invoice.notes}` : ''}

━━━━━━━━━━━━━━━━━━━━

شكراً لتعاملكم معنا 🙏
  `.trim();

  const whatsappUrl = `https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(invoiceText)}`;
  
  window.open(whatsappUrl, '_blank');
};

