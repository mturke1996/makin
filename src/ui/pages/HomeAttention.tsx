import { Amount } from '../../design-system/primitives';
import { AttentionPanel, AttentionRow } from '../../design-system/primitives/AttentionPanel';
import type { AttentionItem, AttentionKind } from './homeAttentionModel';
interface HomeAttentionProps { items: AttentionItem[]; onOpen: (path: string) => void; title: string; className?: string }
const ACTIONS: Record<AttentionKind, string> = { invoice: 'مراجعة الفواتير', debt: 'مراجعة الديون', 'custody-deficit': 'مراجعة العهدة', 'custody-empty': 'فتح العهدة', 'expense-approval': 'مراجعة المصروفات', 'expense-rejected': 'تصحيح المصروفات' };
export function HomeAttention({ items, onOpen, title, className }: HomeAttentionProps) {
  if (items.length === 0) return null;
  const counts = { danger: 0, warning: 0, info: 0 };
  for (const item of items) counts[item.tone]++;
  return <AttentionPanel title={title} counts={counts} className={className}>
    {items.map((item) => <AttentionRow key={item.key} title={item.title} reason={item.subtitle} severity={item.tone} actionLabel={ACTIONS[item.kind]} onAction={() => onOpen(item.path)} amount={item.amount === undefined ? undefined : <Amount amount={item.amount} tone={item.tone} />} />)}
  </AttentionPanel>;
}
