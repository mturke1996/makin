import { WarningAmber } from '@mui/icons-material';
import { Amount } from '../../design-system/primitives';
import { custodyWarning, type CustodyPreview } from './quickExpenseLogic';

interface CustodyLineProps {
  preview: CustodyPreview;
  /** First name of the person it belongs to when it is not me. */
  who?: string;
}

/**
 * One quiet line about the custody: what it holds and what is left after this expense. When the
 * amount goes beyond it the line turns into a plain warning sentence. It never blocks saving: that
 * is how custody works (the excess is deducted from the next custody).
 */
export function CustodyLine({ preview, who }: CustodyLineProps) {
  const warning = custodyWarning(preview, who);
  const owner = who ? `عهدة ${who}` : 'عهدتك';

  if (warning) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm font-semibold leading-relaxed text-warning-ink">
        <WarningAmber aria-hidden sx={{ fontSize: 20 }} className="mt-0.5 shrink-0" />
        <span className="min-w-0">
          {warning.lead} <Amount amount={warning.amount} /> {warning.tail}
        </span>
      </p>
    );
  }

  return (
    <p className="px-1 text-sm text-fg-subtle">
      {owner} <Amount amount={preview.remaining} className="font-semibold text-fg" />
      {preview.amount > 0 && (
        <>
          {' · '}بعد هذا المصروف <Amount amount={preview.after} className="font-semibold text-fg" />
        </>
      )}
    </p>
  );
}
