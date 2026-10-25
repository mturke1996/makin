import { useState } from 'react';
import { ExpandMore } from '../../../../design-system/icons';
import { Button } from '../../../../design-system/primitives';
import { AttentionPanel, AttentionRow } from '../../../../design-system/primitives/AttentionPanel';
import type { ClientInsight, InsightAction } from '../../../../core/finance/clientInsights';
export const INSIGHTS_SHOWN = 5;
export interface InsightsListProps {
  insights: readonly ClientInsight[];
  onAction: (action: InsightAction) => void;
  unavailable?: readonly InsightAction[];
  limit?: number;
  className?: string;
}
const ACTIONS: Record<InsightAction, string> = {
  expenses: 'مراجعة المصروفات', payments: 'مراجعة التحصيل', debts: 'فتح الديون', workers: 'مراجعة مستحقات العمال',
  balances: 'مراجعة العهد', phases: 'متابعة المراحل', boq: 'مراجعة جدول الكميات', invoices: 'مراجعة الفواتير', schedule: 'فتح جدول الدفعات', profit: 'مراجعة النسبة', statement: 'فتح كشف الحساب',
};
/** Priorities, evidence and explicit destinations; unavailable actions remain readable. */
export function InsightsList({ insights, onAction, unavailable = [], limit = INSIGHTS_SHOWN, className }: InsightsListProps) {
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, insights.length - limit);
  const shown = expanded ? insights : insights.slice(0, limit);
  const counts = { danger: 0, warning: 0, info: 0 };
  for (const insight of insights) counts[insight.severity]++;
  return <AttentionPanel title="يستحق انتباهك" counts={counts} empty={insights.length === 0} className={className}
    footer={hidden > 0 && <Button block variant="ghost" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} rightIcon={<ExpandMore sx={{ fontSize: 18 }} className={expanded ? 'rotate-180' : undefined} />}>
      {expanded ? 'عرض الأهم فقط' : `عرض ${hidden} ملاحظات أخرى`}
    </Button>}>
    {shown.map((insight) => <AttentionRow key={insight.id} title={insight.title} reason={insight.reason} severity={insight.severity} actionLabel={ACTIONS[insight.action]} onAction={unavailable.includes(insight.action) ? undefined : () => onAction(insight.action)} />)}
  </AttentionPanel>;
}
