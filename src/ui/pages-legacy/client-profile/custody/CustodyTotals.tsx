import { AccountBalanceWallet, WarningAmber } from '../../../../design-system/icons';
import { Amount } from '../../../../design-system/primitives';
import type { ClientCustodyTotals } from '../../../../core/finance/clientCustody';
import { ProfileModuleHero } from '../profileUi';
import { holdersCount } from './copy';

const deficitOf = (n: number) => (n === 1 ? 'واحد منهم' : n === 2 ? 'اثنين منهم' : `${n} منهم`);

/**
 * What the client's custody comes to. The remaining balance and what was spent are shown only when every
 * holder's expenses are visible to this person; otherwise the one true figure is what was handed out.
 */
export function CustodyTotals({ totals }: { totals: ClientCustodyTotals }) {
  const holders = `${holdersCount(totals.holders)} بعهدة`;

  if (!totals.exact) {
    return (
      <ProfileModuleHero
        tone="warning"
        Icon={AccountBalanceWallet}
        eyebrow="إجمالي الممنوح من العهد"
        headline={<Amount amount={totals.given} />}
        subline={`${holders}، والمصروف من عهد غيرك غير متاح لك`}
      />
    );
  }

  const inDeficit = totals.remaining < 0;
  return (
    <ProfileModuleHero
      tone={inDeficit ? 'danger' : 'success'}
      Icon={inDeficit ? WarningAmber : AccountBalanceWallet}
      eyebrow={inDeficit ? 'عجز العهد' : 'المتبقي من العهد'}
      headline={<Amount amount={inDeficit ? -totals.remaining : totals.remaining} />}
      subline={
        totals.deficitUsers > 0 && totals.holders > 1
          ? `${holders}، وعجز قائم على ${deficitOf(totals.deficitUsers)}`
          : totals.holders > 1
            ? holders
            : undefined
      }
      stats={[
        { label: 'الممنوح', value: <Amount amount={totals.given} /> },
        { label: 'المصروف من العهد', value: <Amount amount={totals.spent} /> },
      ]}
    />
  );
}
