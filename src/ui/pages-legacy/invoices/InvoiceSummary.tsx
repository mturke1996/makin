import { Amount, Button } from '../../../design-system/primitives';

interface SummaryProps {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  clientName?: string;
  dueDateText?: string;
  saving: boolean;
  saveLabel: string;
  onSave: () => void;
  onCancel: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-fg-subtle">{label}</dt>
      <dd className="text-md font-semibold text-fg">{children}</dd>
    </div>
  );
}

/** Desktop: sticky summary column beside the form with the single primary save action. */
export function InvoiceSummaryPanel({
  subtotal, taxRate, taxAmount, total, clientName, dueDateText, saving, saveLabel, onSave, onCancel,
}: SummaryProps) {
  return (
    <aside className="hidden self-start rounded-lg border border-border bg-surface-panel p-5 lg:sticky lg:top-6 lg:block">
      <h2 className="text-lg font-bold text-fg">ملخص الفاتورة</h2>
      <dl className="mt-4 space-y-3">
        <Row label="العميل">
          <span className="block max-w-[11rem] truncate text-sm">{clientName || 'لم يُحدد بعد'}</span>
        </Row>
        {dueDateText && (
          <Row label="الاستحقاق">
            <bdi dir="ltr" className="text-sm">{dueDateText}</bdi>
          </Row>
        )}
        <div className="border-t border-border pt-3" />
        <Row label="الإجمالي الفرعي">
          <Amount amount={subtotal} />
        </Row>
        <Row label={`الضريبة (${taxRate}%)`}>
          <Amount amount={taxAmount} />
        </Row>
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
          <dt className="text-md font-bold text-fg">الإجمالي</dt>
          <dd className="text-2xl font-bold text-fg">
            <Amount amount={total} />
          </dd>
        </div>
      </dl>
      <div className="mt-5 space-y-2">
        <Button block loading={saving} onClick={onSave}>
          {saveLabel}
        </Button>
        <Button block variant="ghost" onClick={onCancel} disabled={saving}>
          إلغاء
        </Button>
      </div>
    </aside>
  );
}

/**
 * Phones: bottom bar with the total and the single primary action.
 * It sits above the tab bar (higher z-index) so the form owns the screen while editing.
 */
export function InvoiceSaveBar({ total, saving, saveLabel, onSave }: Pick<SummaryProps, 'total' | 'saving' | 'saveLabel' | 'onSave'>) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[1100] border-t border-border bg-surface-panel px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-fg-muted">الإجمالي</p>
          <p className="truncate text-xl font-bold leading-tight text-fg">
            <Amount amount={total} />
          </p>
        </div>
        <Button loading={saving} onClick={onSave} className="flex-none px-6">
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
