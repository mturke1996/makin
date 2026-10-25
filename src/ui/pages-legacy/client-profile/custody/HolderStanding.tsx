import { Amount, Badge } from '../../../../design-system/primitives';
import type { UserBalanceInfo } from '../types';
import { depositPreview } from './depositPreview';
import { balanceTone, custodyCount } from './copy';

interface HolderStandingProps {
  name: string;
  /** The holder's custody on this client now; undefined when they hold none yet. */
  info: UserBalanceInfo | undefined;
  /** The amount typed in the form. */
  typed: number | undefined;
  /** Amount of the custody being edited when it is this holder's (it is replaced, not added). */
  replacing: number;
}

/** Where the chosen employee stands on this client, and what saving this custody will do to it. */
export function HolderStanding({ name, info, typed, replacing }: HolderStandingProps) {
  const body = () => {
    if (!info) {
      const preview = depositPreview(0, typed, replacing);
      return (
        <>
          <p className="text-sm leading-relaxed text-fg-subtle">لا عهدة لـ{name} على هذا المشروع بعد، وهذه ستكون أول عهدة له.</p>
          {preview && (
            <p className="text-sm text-fg-subtle">
              رصيده بعد الإيداع <Amount amount={preview.after} tone="success" className="font-bold" />
            </p>
          )}
        </>
      );
    }

    if (!info.exact) {
      return (
        <p className="text-sm leading-relaxed text-fg-subtle">
          سُلِّم لـ{name} على هذا المشروع <Amount amount={info.given} className="font-bold text-fg" />، والمصروف من عهدته غير متاح لك.
        </p>
      );
    }

    const preview = depositPreview(info.remaining, typed, replacing);
    return (
      <>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-muted">رصيده الحالي على المشروع</p>
            <Amount amount={info.remaining} tone={balanceTone(info.remaining)} className="text-lg font-bold" />
          </div>
          <Badge tone={info.status.tone} dot className="flex-none">
            {info.status.label}
          </Badge>
        </div>
        <p className="text-xs text-fg-muted">
          {custodyCount(info.custodies.length)}، الممنوح <Amount amount={info.given} bare className="font-semibold text-fg" /> والمصروف{' '}
          <Amount amount={info.spent} bare className="font-semibold text-fg" />
        </p>
        {preview && preview.deducted > 0 && (
          <p className="text-sm leading-relaxed text-warning-ink">
            عليه عجز <Amount amount={preview.deducted} className="font-bold" /> يُخصم من هذه العهدة عند إيداعها
          </p>
        )}
        {preview && (
          <p className="text-sm text-fg-subtle">
            رصيده بعد {replacing > 0 ? 'التعديل' : 'الإيداع'}{' '}
            <Amount amount={preview.after} tone={balanceTone(preview.after)} className="font-bold" />
          </p>
        )}
      </>
    );
  };

  return (
    <div role="status" aria-live="polite" className="space-y-1.5 rounded-md bg-surface-sunken px-4 py-3">
      {body()}
    </div>
  );
}
