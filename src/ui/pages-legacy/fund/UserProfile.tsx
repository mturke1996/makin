import { Add, AccountBalanceWallet, ArrowBack, ArrowForward } from '@mui/icons-material';
import { Amount, Avatar, Button, EmptyState, ListGroup, PageHeader, Section } from '../../../design-system/primitives';
import { toMilli, type CustodyBatch, type TimelineEntry, type UserCustodyProfile } from '../../../core/finance/custodyProfile';
import { CustodySection } from './CustodySection';
import { HeroButton, HeroPanel, type HeroSegment } from './HeroPanel';
import { formatFundDate, formatFundTime } from './fundUi';

type Props = {
  profile: UserCustodyProfile;
  /** admin | employee | undefined */
  role?: string;
  /** يرى المشاهد ملفه هو فقط: العنوان «عهدتي» ولا رجوع إلى قائمة المستخدمين. */
  own: boolean;
  /** custody.manage: إضافة العهد وتعديلها وحذفها. */
  canManage: boolean;
  /** يظهر زر الرجوع للقائمة لمن يرى أكثر من نفسه. */
  onBack?: () => void;
  onAdd: () => void;
  onEdit: (batch: CustodyBatch) => void;
};

const ROLE_LABEL: Record<string, string> = { admin: 'مدير النظام', employee: 'موظف' };

function BackLink({ onBack, onBrand }: { onBack: () => void; onBrand?: boolean }) {
  const rtl = typeof document !== 'undefined' && document.documentElement.getAttribute('dir') === 'rtl';
  const Icon = rtl ? ArrowForward : ArrowBack;
  return (
    <button
      type="button"
      onClick={onBack}
      className={
        '-ms-2 inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-[opacity,background-color] duration-fast ease-out focus:outline-none focus-visible:shadow-focus ' +
        (onBrand ? 'opacity-80 hover:opacity-100' : 'text-fg-subtle hover:bg-surface-hover hover:text-fg')
      }
    >
      <Icon sx={{ fontSize: 20 }} aria-hidden />
      كل الموظفين
    </button>
  );
}

const countLabel = (n: number) => (n === 1 ? 'عهدة واحدة' : n === 2 ? 'عهدتان' : n <= 10 ? `${n} عهد` : `${n} عهدة`);

function EmployeeHero({ profile, role, own, canManage, onBack, onAdd }: Pick<Props, 'profile' | 'role' | 'own' | 'canManage' | 'onBack' | 'onAdd'>) {
  const { totals } = profile;
  const name = profile.userName || 'مستخدم';
  const short = toMilli(totals.deficit) > 0;
  // المعتاد: المصروف والمتبقي من المستلم. عند العجز: ما غطّته العهد وما زاد عليها.
  const base = short ? toMilli(totals.spent) : toMilli(totals.deposited);
  const pct = (v: number) => (base > 0 ? Math.min(100, (toMilli(v) / base) * 100) : 0);
  const segments: HeroSegment[] = short
    ? [
        { key: 'covered', pct: pct(totals.deposited), tone: 'spent' },
        { key: 'deficit', pct: pct(totals.deficit), tone: 'deficit' },
      ]
    : [
        { key: 'spent', pct: pct(totals.spent), tone: 'spent' },
        { key: 'left', pct: pct(totals.remaining), tone: 'left' },
      ];

  return (
    <HeroPanel
      eyebrow={onBack ? <BackLink onBack={onBack} onBrand /> : undefined}
      leading={<Avatar name={name} size="lg" />}
      title={own ? 'عهدتي' : name}
      subtitle={role ? ROLE_LABEL[role] : undefined}
      actions={
        canManage ? (
          <HeroButton onClick={onAdd}>
            <Add sx={{ fontSize: 20 }} aria-hidden />
            إضافة عهدة
          </HeroButton>
        ) : undefined
      }
      figureLabel={short ? 'العجز القائم' : own ? 'المتبقي معي' : 'المتبقي من العهد'}
      figure={<Amount amount={short ? -totals.deficit : totals.remaining} />}
      badge={
        <span
          className="inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold"
          style={{ backgroundColor: 'color-mix(in srgb, var(--on-accent) 18%, transparent)' }}
        >
          {profile.status.label}
        </span>
      }
      segments={segments}
      barLabel={short ? 'المصروف تجاوز العهد المستلمة' : 'ما صُرف وما تبقى من العهد'}
      stats={[
        { label: 'استلم', value: <Amount amount={totals.deposited} bare /> },
        { label: 'صرف', value: <Amount amount={totals.spent} bare /> },
        { label: 'عدد العهد', value: countLabel(profile.counts.custodies) },
      ]}
    />
  );
}

/** سحب مسجَّل خارج رصيد العهد: لا يغيّر رصيد أي عهدة، فيُعرض وحده. */
function WithdrawalRow({ entry }: { entry: TimelineEntry }) {
  const time = formatFundTime(entry.createdAt, entry.date);
  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold leading-snug text-fg">{entry.title || 'سحب'}</p>
        <p className="mt-0.5 text-xs tabular-nums text-fg-muted">
          {formatFundDate(entry.date)}
          {time && ` ${time}`}
        </p>
        {entry.notes && <p className="mt-1 text-xs text-fg-subtle">{entry.notes}</p>}
      </div>
      <Amount amount={entry.amount} showSign bare className="flex-none text-base font-bold text-fg-subtle" />
    </li>
  );
}

/**
 * ملف موظف واحد، له وحده: الهوية والرصيد في الأعلى، ثم كل عهدة له ومعها سجلها الخاص (إيداعها ومصروفاتها وما رُحّل
 * منها وإليها) والرصيد بعد كل حركة. لا يظهر هنا اسم أي موظف آخر.
 */
export function UserProfile({ profile, role, own, canManage, onBack, onAdd, onEdit }: Props) {
  const name = profile.userName || 'مستخدم';
  // الأحدث أولاً. تُفتح أحدث عهدة دائماً، وكلها إن كانت قليلة.
  const custodies = [...profile.custodies].reverse();
  const openAll = custodies.length <= 3;
  const withdrawals = profile.timeline.filter((e) => e.kind === 'withdrawal');

  if (!profile.hasCustody) {
    return (
      <div className="space-y-6">
        <PageHeader
          leading={<Avatar name={name} size="lg" />}
          eyebrow={onBack ? <BackLink onBack={onBack} /> : undefined}
          title={own ? 'عهدتي' : name}
          subtitle={role ? ROLE_LABEL[role] : undefined}
        />
        <EmptyState
          Icon={AccountBalanceWallet}
          title={own ? 'لم تُمنح عهدة بعد' : 'لا توجد عهدة بعد'}
          description={
            canManage
              ? `أضف أول عهدة لـ${name}، وتُخصم مصروفاته منها تلقائياً مع ترحيل أي عجز للعهدة التالية. لكل عهدة سجلها الخاص.`
              : 'عند منحك عهدة ستظهر هنا مع مصروفاتك.'
          }
          action={
            canManage ? (
              <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={onAdd}>
                إضافة أول عهدة
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmployeeHero profile={profile} role={role} own={own} canManage={canManage} onBack={onBack} onAdd={onAdd} />

      <Section
        title="العهد وسجلها"
        description="لكل عهدة سجلها الخاص: إيداعها، مصروفاتها، وما رُحّل منها أو إليها، والرصيد بعد كل حركة"
      >
        <div className="space-y-4">
          {custodies.map((batch, i) => (
            <CustodySection
              key={batch.id}
              batch={batch}
              defaultOpen={openAll || i === 0}
              onEdit={canManage ? onEdit : undefined}
            />
          ))}
        </div>
      </Section>

      {withdrawals.length > 0 && (
        <Section title="سحوبات خارج العهد" description="مسجَّلة لكنها لا تدخل في رصيد أي عهدة">
          <ListGroup>
            {withdrawals.map((w) => (
              <WithdrawalRow key={w.id} entry={w} />
            ))}
          </ListGroup>
        </Section>
      )}
    </div>
  );
}
