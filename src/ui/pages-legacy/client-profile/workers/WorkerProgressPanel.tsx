import { useState } from 'react';
import { WarningAmber } from '../../../../design-system/icons';
import { Amount, Button, Input, ProgressBar } from '../../../../design-system/primitives';
import { normalizePercent, type WorkerProgressView } from '../../../../core/finance/workerProgress';

interface WorkerProgressPanelProps {
  view: WorkerProgressView;
  /** Whoever may approve the progress (`workers.manage`); everyone else only reads it. */
  onSave?: (percent: number) => Promise<void>;
  /** When the percentage was approved, and by whom. */
  approvedLine?: string;
}

/** The approved progress of the work against what the worker has been paid, with the alert when he is ahead. */
export function WorkerProgressPanel({ view, onSave, approvedLine }: WorkerProgressPanelProps) {
  const [text, setText] = useState(view.percent === null ? '' : String(view.percent));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const typed = normalizePercent(text);
  const changed = typed !== null && typed !== view.percent;
  const ahead = view.state === 'ahead' || view.state === 'far_ahead';

  const save = async () => {
    if (typed === null) {
      setError('اكتب نسبة بين 0 و100');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onSave?.(typed);
    } catch {
      /* the store already told the person */
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="إنجاز العمل مقابل المدفوع" className="space-y-3 rounded-lg border border-border bg-surface-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">إنجاز العمل مقابل المدفوع</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {view.percent === null ? 'لم يُعتمد إنجاز بعد، فلا مقارنة بما دُفع.' : (approvedLine ?? 'النسبة التي اعتمدها المشرف.')}
          </p>
        </div>
        {view.percent !== null && (
          <span className="flex-none text-xl font-bold tabular-nums text-fg" aria-label={`الإنجاز ${view.percent} بالمئة`}>
            <bdi dir="ltr">{view.percent}%</bdi>
          </span>
        )}
      </div>

      {view.percent !== null && (
        <>
          <ProgressBar value={view.percent} tone={ahead ? 'warning' : 'success'} label="نسبة الإنجاز المعتمدة" />
          <dl className="grid grid-cols-3 gap-3">
            <div className="min-w-0">
              <dt className="text-2xs text-fg-muted">المستحق بالإنجاز</dt>
              <dd className="mt-0.5 text-sm font-bold tabular-nums text-fg"><Amount amount={view.earned} /></dd>
            </div>
            <div className="min-w-0">
              <dt className="text-2xs text-fg-muted">المدفوع</dt>
              <dd className="mt-0.5 text-sm font-bold tabular-nums text-fg"><Amount amount={view.paid} /></dd>
            </div>
            <div className="min-w-0">
              <dt className="text-2xs text-fg-muted">{ahead ? 'مدفوع قبل الإنجاز' : 'مستحق الآن'}</dt>
              <dd className="mt-0.5 text-sm font-bold tabular-nums">
                <Amount amount={ahead ? view.aheadBy : view.payableNow} tone={ahead ? 'danger' : 'success'} />
              </dd>
            </div>
          </dl>
          {view.advances > 0 && (
            <p className="text-xs text-fg-subtle">
              سلف مصروفة <Amount amount={view.advances} className="font-semibold text-fg" />
              {view.advanceSettled > 0 && <> · خُصم منها بالإنجاز <Amount amount={view.advanceSettled} className="font-semibold text-fg" /></>}
              {view.advanceOutstanding > 0 && <> · قائمة <Amount amount={view.advanceOutstanding} tone="danger" className="font-semibold" /></>}
            </p>
          )}
          {ahead && (
            <div role="status" className={`flex items-start gap-2.5 rounded-md p-3 ${view.state === 'far_ahead' ? 'bg-danger-soft text-danger-ink' : 'bg-warning-soft text-warning-ink'}`}>
              <WarningAmber sx={{ fontSize: 20 }} aria-hidden className="mt-0.5 flex-none" />
              <p className="text-sm leading-relaxed">
                {view.state === 'far_ahead' ? 'المدفوع يسبق الإنجاز بفارق كبير. ' : 'المدفوع يسبق الإنجاز المعتمد. '}
                أوقف الصرف حتى يلحق العمل بما دُفع، أو حدّث نسبة الإنجاز إن كان قد زاد.
              </p>
            </div>
          )}
        </>
      )}

      {onSave && (
        <div className="flex items-end gap-2 border-t border-border pt-3">
          <div className="min-w-0 flex-1">
            <Input
              label="تحديث نسبة الإنجاز"
              type="number"
              inputMode="decimal"
              dir="ltr"
              min={0}
              max={100}
              step="0.5"
              placeholder="مثال: 40"
              value={text}
              error={error || undefined}
              onChange={(e) => { setText(e.target.value); setError(''); }}
            />
          </div>
          <Button className="h-11" loading={busy} disabled={!changed} onClick={() => void save()}>اعتماد</Button>
        </div>
      )}
    </section>
  );
}
