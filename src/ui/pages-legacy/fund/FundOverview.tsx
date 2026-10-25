import { useMemo, useState } from 'react';
import { Add, AccountBalanceWallet, Search } from '../../../design-system/icons';
import { Amount, Button, EmptyState, Input, ListGroup, PageHeader, Section } from '../../../design-system/primitives';
import { toMilli, type CustodyOverviewTotals, type UserCustodyProfile } from '../../../core/finance/custodyProfile';
import { HeroButton, HeroPanel, type HeroSegment } from './HeroPanel';
import { fieldInner } from './fundUi';
import { UserRow } from './UserRow';
import type { FundUser } from './types';

type Props = {
  profiles: UserCustodyProfile[];
  totals: CustodyOverviewTotals;
  /** كل المستخدمين المسجَّلين (لإنشاء عهدة لمن لا يملك عهدة). */
  users: FundUser[];
  usersError: boolean;
  /** custody.manage: إضافة العهد ورؤية من لا عهدة لهم. */
  canManage: boolean;
  onOpenUser: (id: string) => void;
  onAdd: () => void;
};

type Row = { id: string; name: string; email?: string; profile?: UserCustodyProfile };

/** البحث يظهر عند كثرة المستخدمين فقط، فقائمة قصيرة لا تحتاجه. */
const SEARCH_FROM = 8;

function matchesQuery(row: Row, q: string) {
  return row.name.toLowerCase().includes(q) || (row.email ?? '').toLowerCase().includes(q);
}

/** الأعداد بالكلمات: «موظف واحد»، «موظفان»، «5 موظفين». */
const peopleCount = (n: number) => (n === 1 ? 'موظف واحد' : n === 2 ? 'موظفان' : n <= 10 ? `${n} موظفين` : `${n} موظفاً`);

function FundHero({ totals, canManage, onAdd }: { totals: CustodyOverviewTotals; canManage: boolean; onAdd: () => void }) {
  const short = toMilli(totals.remaining) < 0;
  // المعتاد: المصروف والمتبقي من المستلم. عند العجز: ما غطّته العهد وما زاد عليها.
  const base = short ? toMilli(totals.spent) : toMilli(totals.deposited);
  const pct = (v: number) => (base > 0 ? Math.min(100, (toMilli(v) / base) * 100) : 0);
  const segments: HeroSegment[] = short
    ? [
        { key: 'covered', pct: pct(totals.deposited), tone: 'spent' },
        { key: 'deficit', pct: pct(-totals.remaining), tone: 'deficit' },
      ]
    : [
        { key: 'spent', pct: pct(totals.spent), tone: 'spent' },
        { key: 'left', pct: pct(totals.remaining), tone: 'left' },
      ];

  return (
    <HeroPanel
      title="صندوق العهد"
      subtitle="الأرصدة بالدينار الليبي"
      actions={
        canManage ? (
          <HeroButton onClick={onAdd}>
            <Add sx={{ fontSize: 20 }} aria-hidden />
            عهدة جديدة
          </HeroButton>
        ) : undefined
      }
      figureLabel={short ? 'العجز الكلي على الصندوق' : 'المتبقي في الصندوق'}
      figure={<Amount amount={totals.remaining} />}
      badge={
        totals.deficitUsers > 0 ? (
          <span
            className="inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold"
            style={{ backgroundColor: 'color-mix(in srgb, var(--on-accent) 18%, transparent)' }}
          >
            {totals.deficitUsers === 1 ? 'موظف واحد عليه عجز' : `${peopleCount(totals.deficitUsers)} عليهم عجز`}
          </span>
        ) : undefined
      }
      segments={segments}
      barLabel={short ? 'المصروف تجاوز ما استُلم' : 'ما صُرف وما تبقى من العهد'}
      stats={[
        { label: 'إجمالي المستلم', value: <Amount amount={totals.deposited} bare /> },
        { label: 'إجمالي المصروف', value: <Amount amount={totals.spent} bare /> },
        { label: 'أصحاب العهد', value: peopleCount(totals.holders) },
      ]}
    />
  );
}

export function FundOverview({ profiles, totals, users, usersError, canManage, onOpenUser, onAdd }: Props) {
  const [search, setSearch] = useState('');

  const { holders, others } = useMemo(() => {
    const holderRows: Row[] = profiles.map((p) => ({
      id: p.userId,
      name: p.userName || 'مستخدم',
      email: users.find((u) => u.id === p.userId || u.name === p.userName)?.email,
      profile: p,
    }));
    const otherRows: Row[] = users
      .filter((u) => !profiles.some((p) => p.userId === u.id || p.userName === u.name))
      .map((u) => ({ id: u.id, name: u.name, email: u.email }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return { holders: holderRows, others: otherRows };
  }, [profiles, users]);

  const q = search.trim().toLowerCase();
  const shownHolders = q ? holders.filter((r) => matchesQuery(r, q)) : holders;
  const shownOthers = q ? others.filter((r) => matchesQuery(r, q)) : others;
  const noCustodyYet = holders.length === 0;

  return (
    <>
      {noCustodyYet && (
        <PageHeader title="صندوق العهد" subtitle="الأرصدة بالدينار الليبي" />
      )}

      {usersError && (
        <p role="alert" className="rounded-md bg-warning-soft px-4 py-3 text-sm text-warning-ink">
          تعذر تحميل قائمة المستخدمين. تظهر هنا أصحاب العهد فقط.
        </p>
      )}

      {!noCustodyYet && <FundHero totals={totals} canManage={canManage} onAdd={onAdd} />}

      {noCustodyYet && (
        <EmptyState
          Icon={AccountBalanceWallet}
          title="لا توجد عهدة بعد"
          description={
            canManage
              ? 'أضف أول عهدة لموظف، وتُخصم مصروفاته منها تلقائياً مع ترحيل أي عجز للعهدة التالية. لكل موظف سجله، ولكل عهدة سجلها.'
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
      )}

      {holders.length + others.length >= SEARCH_FROM && (
        <Input
          type="search"
          aria-label="ابحث عن موظف"
          placeholder="ابحث عن موظف"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search sx={{ fontSize: 22 }} />}
          className={fieldInner}
        />
      )}

      {q && shownHolders.length === 0 && shownOthers.length === 0 && (
        <EmptyState bare title="لا يوجد موظف بهذا الاسم" description="جرّب اسماً آخر أو امسح البحث." />
      )}

      {shownHolders.length > 0 && (
        <Section title="الموظفون" description="اضغط على موظف لعرض سجله وكل عهدة معه">
          <ListGroup aria-label="أصحاب العهد">
            {shownHolders.map((row) => (
              <UserRow key={row.id} name={row.name} profile={row.profile} onOpen={() => onOpenUser(row.id)} />
            ))}
          </ListGroup>
        </Section>
      )}

      {canManage && shownOthers.length > 0 && (
        <Section title={noCustodyYet ? 'المستخدمون' : 'بدون عهدة'}>
          <ListGroup>
            {shownOthers.map((row) => (
              <UserRow key={row.id} name={row.name} profile={row.profile} onOpen={() => onOpenUser(row.id)} />
            ))}
          </ListGroup>
        </Section>
      )}
    </>
  );
}
