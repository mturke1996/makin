import { CheckCircle } from '../../design-system/icons';
import { Amount } from '../../design-system/primitives';
import { custodyWarning, type CustodyPreview } from './quickExpenseLogic';

export interface SavedInfo {
  reference?: string;
  amount: number;
  clientName: string;
  categoryLabel: string;
  /** Name of the person it was recorded for, only when that is not me. */
  forName?: string;
  /** Their custody as it stood before the save; null when they hold none or it is not visible. */
  custody: CustodyPreview | null;
}

/** The confirmation that replaces the form: what was recorded, for whom, and what is left. */
export function SavedSummary({ info }: { info: SavedInfo }) {
  const warning = info.custody ? custodyWarning(info.custody, info.forName) : null;
  const owner = info.forName ? `عهدة ${info.forName}` : 'عهدتك';
  return (
    <div role="status" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-success-soft text-success-ink">
        <CheckCircle aria-hidden sx={{ fontSize: 40 }} />
      </span>
      <p className="text-xl font-bold leading-snug text-fg">
        تم تسجيل <Amount amount={info.amount} /> على {info.clientName}
      </p>
      <p className="text-sm text-fg-subtle">
        {info.categoryLabel}
        {info.forName ? ` · باسم ${info.forName}` : ''}
      </p>
      {info.reference && <p className="max-w-full break-all text-xs text-fg-muted">مرجع العملية: <bdi dir="ltr">{info.reference}</bdi></p>}
      {info.custody &&
        (warning ? (
          <p className="max-w-sm text-sm font-semibold leading-relaxed text-warning-ink">
            {warning.lead} <Amount amount={warning.amount} /> {warning.tail}
          </p>
        ) : (
          <p className="text-sm text-fg-subtle">
            المتبقي في {owner} <Amount amount={info.custody.after} className="font-semibold text-fg" />
          </p>
        ))}
    </div>
  );
}
