import { ChevronRight } from '../../../design-system/icons';
import { Amount, Avatar } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import type { UserCustodyProfile } from '../../../core/finance/custodyProfile';

type Props = {
  name: string;
  profile?: UserCustodyProfile;
  onOpen: () => void;
};

const rowClass =
  'flex min-h-[4.5rem] w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-start transition-colors duration-fast ease-out ' +
  'hover:bg-surface-hover active:bg-surface-hover focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]';

/**
 * سطر مستخدم في قائمة العهد: صورة، اسم، المتبقي كبيراً، وجملة حالة واحدة قصيرة.
 * عليه عجز (بلون الخطر)، أو «استلم س · صرف ص». لا أشرطة ولا شارات.
 * مع الخط الكبير ينزل الرقم إلى سطر تحت الاسم بدل أن يقتطع الاسم أو يتراكب مع الحالة.
 */
export function UserRow({ name, profile, onOpen }: Props) {
  const has = !!profile && profile.hasCustody;
  const deficit = has && profile.status.key === 'deficit';

  return (
    <button type="button" onClick={onOpen} className={rowClass}>
      <span className="flex min-w-0 flex-[1_1_8rem] items-center gap-3">
        <Avatar name={name} />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-base font-semibold leading-snug text-fg">{name}</span>
          <span className={cn('mt-0.5 flex flex-wrap gap-x-2 text-xs', deficit ? 'font-semibold text-danger-ink' : 'text-fg-muted')}>
            {!has && <span>لا توجد عهدة بعد</span>}
            {has && deficit && <span>عليه عجز</span>}
            {has && !deficit && (
              <>
                <span className="whitespace-nowrap">
                  استلم <Amount amount={profile.totals.deposited} bare />
                </span>
                <span className="whitespace-nowrap">
                  صرف <Amount amount={profile.totals.spent} bare />
                </span>
              </>
            )}
          </span>
        </span>
      </span>
      <span className="ms-auto flex flex-none items-center gap-2">
        {has && (
          <Amount
            amount={deficit ? -profile.totals.deficit : profile.totals.remaining}
            tone={deficit ? 'danger' : 'neutral'}
            bare
            className="text-xl font-bold"
          />
        )}
        <ChevronRight sx={{ fontSize: 20 }} className="flex-none text-fg-muted rtl-flip" aria-hidden />
      </span>
    </button>
  );
}
