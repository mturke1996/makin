import { formatCurrencyDisplay, formatDate } from '../utils-formatters';
import type { ReceivableItem } from './paymentSchedule';

/**
 * The WhatsApp message that reminds a client of what is due. Courteous, one fact per line, the amount
 * and the date in the same figures the receipts use. Several overdue items are listed, then summed.
 */
export function buildReminderText(input: {
  clientName: string;
  companyName: string;
  items: readonly ReceivableItem[];
  total: number;
}): string {
  const { clientName, companyName, items, total } = input;
  const late = items.some((i) => i.daysLate > 0);
  const lines = [`السلام عليكم ${clientName}،`, ''];

  if (items.length === 1) {
    const [item] = items;
    lines.push(
      late
        ? `نذكّركم بأن «${item.title}» بقيمة ${formatCurrencyDisplay(item.amount)} حلّ موعدها في ${formatDate(item.dueDate)}.`
        : `نذكّركم بأن «${item.title}» بقيمة ${formatCurrencyDisplay(item.amount)} يحلّ موعدها في ${formatDate(item.dueDate)}.`,
    );
  } else {
    lines.push(late ? 'نذكّركم بالمستحقات التالية:' : 'نذكّركم بالدفعات التالية:');
    for (const item of items) {
      lines.push(`• ${item.title}: ${formatCurrencyDisplay(item.amount)} (${formatDate(item.dueDate)})`);
    }
    lines.push('', `الإجمالي: ${formatCurrencyDisplay(total)}`);
  }

  lines.push('', 'نرجو التكرّم بالسداد، ولأي استفسار نحن بالخدمة.', companyName);
  return lines.join('\n');
}

/** `https://wa.me/<number>?text=…` (or the number-less link when the client has no usable phone). */
export function reminderHref(baseHref: string | null, text: string): string {
  const query = `text=${encodeURIComponent(text)}`;
  return baseHref ? `${baseHref}?${query}` : `https://wa.me/?${query}`;
}
