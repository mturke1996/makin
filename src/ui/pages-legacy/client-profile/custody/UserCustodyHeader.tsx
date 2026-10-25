import { Amount, Avatar, Badge } from '../../../../design-system/primitives';
import { formatCurrencyDisplay } from '../../../../core/utils-formatters';
import type { UserBalanceInfo } from '../types';
import { CustodyBar, userParts } from './CustodyBar';
import { balanceTone, custodyCount, usedText } from './copy';

/**
 * Who holds the custody and where it stands. With several holders it carries their balance and one bar;
 * with a single holder the totals above already say the same, so it is only the identity line.
 */
export function UserCustodyHeader({ info, withFigures }: { info: UserBalanceInfo; withFigures: boolean }) {
  const figures = withFigures && info.exact;
  const tone = balanceTone(info.remaining);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={info.name} tone="warning" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold leading-tight text-fg">{info.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
            {info.exact && info.custodies.length > 1 && (
              <Badge tone={info.status.tone} dot>
                {info.status.label}
              </Badge>
            )}
            <span>{custodyCount(info.custodies.length)}</span>
          </p>
        </div>
        {figures && (
          <div className="flex-none text-end">
            <p className="text-2xs text-fg-muted">{info.remaining < 0 ? 'العجز' : 'المتبقي'}</p>
            <Amount amount={info.remaining} tone={tone} className="text-xl font-bold" />
          </div>
        )}
        {withFigures && !info.exact && (
          <div className="flex-none text-end">
            <p className="text-2xs text-fg-muted">الممنوح</p>
            <Amount amount={info.given} tone="success" className="text-xl font-bold" />
          </div>
        )}
      </div>

      {figures && (
        <div className="space-y-1.5">
          <CustodyBar
            parts={userParts(info)}
            label={`صُرف ${formatCurrencyDisplay(info.spent)} من ${formatCurrencyDisplay(info.given)} الممنوحة لـ${info.name}`}
          />
          <p className="text-xs text-fg-muted">
            صُرف <Amount amount={info.spent} bare className="font-semibold text-fg" /> من{' '}
            <Amount amount={info.given} className="font-semibold text-fg" />
            {info.deficit > 0 ? (
              <>
                ، وتجاوز الممنوح بمقدار <Amount amount={info.deficit} className="font-semibold text-danger-ink" />
              </>
            ) : (
              <>، أي {usedText(info.usedPct)}</>
            )}
          </p>
        </div>
      )}

      {!info.exact && (
        <p className="rounded-md bg-surface-sunken px-3 py-2.5 text-sm leading-relaxed text-fg-subtle">
          المصروف من عهدة {info.name} غير متاح لك، فلا يظهر هنا إلا ما سُلِّم له وتاريخه.
        </p>
      )}
    </div>
  );
}
