import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, HourglassEmpty, WhatsApp } from '../../design-system/icons';
import {
  Amount,
  Avatar,
  Badge,
  Button,
  EmptyState,
  FigureStrip,
  ListGroup,
  PageHeader,
  PageShell,
  ProgressBar,
} from '../../design-system/primitives';
import { useBrand } from '../../config/BrandProvider';
import { useAccess } from '../../core/access/useAccess';
import { daysWord } from '../../core/finance/clientInsights';
import { buildReminderText, reminderHref } from '../../core/finance/paymentReminder';
import { buildReceivables, type AgingBucket, type ClientReceivable, type ReceivableItem } from '../../core/finance/paymentSchedule';
import { formatDate } from '../../core/utils-formatters';
import { useDataSlice } from '../../stores/useDataStore';
import { whatsappHref } from '../pages-legacy/client-profile/details/contactLinks';
import { FigureStripSkeleton, ListSkeleton } from '../pages-legacy/money/moneyUi';

const BASIS_LABEL = { schedule: 'حسب جدول الدفعات', invoices: 'حسب الفواتير', none: '' } as const;
const BUCKET_TONE = { d30: 'info', d60: 'warning', d90: 'danger', d90p: 'danger' } as const;
/** Items listed under a client before the rest are folded into «و N أخرى». */
const ITEMS_SHOWN = 3;

/**
 * Who owes the company money, how late, and what is expected in the next 30 days.
 * Built from the agreed payment schedules (and the invoices of clients without one), never both for the
 * same client, so no amount is counted twice.
 */
export const ReceivablesPage = () => {
  const navigate = useNavigate();
  const brand = useBrand();
  const access = useAccess();
  const { clients, payments, invoices, paymentMilestones, isLoading } = useDataSlice('clients', 'payments', 'invoices', 'paymentMilestones', 'isLoading');
  const canSeeInvoices = access.can('invoices.view');

  const report = useMemo(
    () => buildReceivables({ clients, payments, milestones: paymentMilestones, invoices: canSeeInvoices ? invoices : undefined }),
    [clients, payments, paymentMilestones, invoices, canSeeInvoices],
  );

  const oldest = report.late[0]?.oldestDays ?? 0;
  const loading = isLoading && clients.length === 0;

  const remind = (row: ClientReceivable, items: readonly ReceivableItem[], total: number) => {
    const text = buildReminderText({ clientName: row.client.name, companyName: brand.fullName, items, total });
    window.open(reminderHref(whatsappHref(row.client.phone), text), '_blank', 'noopener,noreferrer');
  };

  const openClient = (row: ClientReceivable) =>
    navigate(`/clients/${row.client.id}?section=${row.basis === 'schedule' ? 'schedule' : 'invoices'}`);

  return (
    <PageShell>
      <PageHeader title="المتأخرات والمستحقات" subtitle="من تأخر في السداد وكم، مرتباً بالأقدم" />

      {loading ? (
        <>
          <FigureStripSkeleton />
          <ListSkeleton />
        </>
      ) : (
        <>
          <FigureStrip
            figures={[
              {
                label: 'إجمالي المتأخر',
                value: <Amount amount={report.overdueTotal} tone={report.overdueTotal > 0 ? 'danger' : 'inherit'} />,
                tone: report.overdueTotal > 0 ? 'danger' : 'neutral',
                hint: report.overdueCount > 0 ? `${report.overdueCount} ${report.overdueCount === 1 ? 'مستحق' : 'مستحقات'}` : undefined,
              },
              { label: 'عملاء متأخرون', value: report.late.length },
              { label: 'أقدم تأخير', value: oldest > 0 ? daysWord(oldest) : '-' },
              { label: 'متوقع خلال 30 يوماً', value: <Amount amount={report.upcomingTotal} />, hint: report.soon.length > 0 ? `${report.soon.length} عملاء` : undefined },
            ]}
          />

          {report.late.length === 0 && report.soon.length === 0 ? (
            <EmptyState
              Icon={CheckCircle}
              title="لا متأخرات ولا مستحقات قريبة"
              description="تظهر هنا الدفعات التي حلّ موعدها ولم تُسدَّد، من جدول الدفعات في ملف كل عميل ومن فواتير العملاء الذين لا جدول لهم."
            />
          ) : (
            <>
              {report.overdueTotal > 0 && <AgingBlock buckets={report.buckets} total={report.overdueTotal} />}

              {report.late.length > 0 && (
                <section aria-label="العملاء المتأخرون" className="space-y-2">
                  <h2 className="px-1 text-sm font-semibold text-fg-subtle">العملاء المتأخرون</h2>
                  <ListGroup>
                    {report.late.map((row) => (
                      <LateRow
                        key={row.client.id}
                        row={row}
                        onRemind={() => remind(row, row.overdue, row.overdueTotal)}
                        onOpen={() => openClient(row)}
                      />
                    ))}
                  </ListGroup>
                </section>
              )}

              {report.soon.length > 0 && (
                <section aria-label="مستحقات قادمة" className="space-y-2">
                  <h2 className="px-1 text-sm font-semibold text-fg-subtle">مستحقة خلال 30 يوماً</h2>
                  <ListGroup>
                    {report.soon.map((row) => (
                      <SoonRow
                        key={row.client.id}
                        row={row}
                        onRemind={() => remind(row, row.upcoming, row.upcomingTotal)}
                        onOpen={() => openClient(row)}
                      />
                    ))}
                  </ListGroup>
                </section>
              )}
            </>
          )}

          {!canSeeInvoices && (
            <p className="px-1 text-xs text-fg-muted">
              الفواتير غير ظاهرة لك، فلا تُحتسب هنا مستحقات العملاء الذين ليس لهم جدول دفعات.
            </p>
          )}
        </>
      )}
    </PageShell>
  );
};

function AgingBlock({ buckets, total }: { buckets: AgingBucket[]; total: number }) {
  return (
    <section aria-label="تقادم الذمم" className="overflow-hidden rounded-lg border border-border bg-surface-panel">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <HourglassEmpty sx={{ fontSize: 18 }} className="text-fg-muted" aria-hidden />
        <h2 className="text-sm font-semibold text-fg">تقادم الذمم</h2>
        <span className="text-xs text-fg-muted">كم مضى على موعد الاستحقاق</span>
      </header>
      <dl className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x sm:divide-x-reverse">
        {buckets.map((bucket) => {
          const share = total > 0 ? (bucket.amount / total) * 100 : 0;
          const empty = bucket.amount <= 0;
          return (
            <div key={bucket.def.id} className="min-w-0 border-b border-border px-4 py-3.5 sm:border-b-0">
              <dt className="text-xs font-medium text-fg-muted">{bucket.def.label}</dt>
              <dd className={empty ? 'mt-1 text-md font-bold tabular-nums text-fg-muted' : 'mt-1 text-md font-bold tabular-nums text-fg'}>
                <Amount amount={bucket.amount} />
              </dd>
              <div className="mt-2 flex items-center gap-2">
                <ProgressBar value={share} tone={BUCKET_TONE[bucket.def.id]} label={`حصة ${bucket.def.label}`} />
                <span className="flex-none text-2xs text-fg-muted">
                  {bucket.count === 0 ? 'لا شيء' : bucket.count === 1 ? 'مستحق واحد' : `${bucket.count} مستحقات`}
                </span>
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function ItemLines({ items, late }: { items: readonly ReceivableItem[]; late: boolean }) {
  const shown = items.slice(0, ITEMS_SHOWN);
  const hidden = items.length - shown.length;
  return (
    <ul className="mt-3 space-y-1.5 ps-12">
      {shown.map((item) => (
        <li key={item.key} className="flex items-start justify-between gap-3 text-sm">
          <span className="min-w-0">
            <span className="block text-fg-subtle">{item.title}</span>
            <span className="block text-xs tabular-nums text-fg-muted">
              {late ? `${formatDate(item.dueDate)} · متأخرة ${daysWord(item.daysLate)}` : `يستحق ${formatDate(item.dueDate)}`}
            </span>
          </span>
          {items.length > 1 && (
            <span className="flex-none font-semibold tabular-nums text-fg">
              <Amount amount={item.amount} />
            </span>
          )}
        </li>
      ))}
      {hidden > 0 && <li className="text-xs text-fg-muted">{hidden === 1 ? 'ومستحق آخر' : `و${hidden} مستحقات أخرى`}</li>}
    </ul>
  );
}

function RowActions({ onRemind, onOpen, openLabel }: { onRemind: () => void; onOpen: () => void; openLabel: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 ps-12">
      <Button size="sm" variant="outline" className="h-11" leftIcon={<WhatsApp sx={{ fontSize: 18 }} />} onClick={onRemind}>
        تذكير واتساب
      </Button>
      <Button size="sm" variant="ghost" className="h-11" onClick={onOpen}>
        {openLabel}
      </Button>
    </div>
  );
}

function LateRow({ row, onRemind, onOpen }: { row: ClientReceivable; onRemind: () => void; onOpen: () => void }) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        <Avatar name={row.client.name} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-fg">{row.client.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge dot tone="danger">متأخر {daysWord(row.oldestDays)}</Badge>
            <Badge>{BASIS_LABEL[row.basis]}</Badge>
          </div>
        </div>
        <div className="flex-none text-end">
          <p className="text-2xs text-fg-muted">المتأخر</p>
          <Amount amount={row.overdueTotal} tone="danger" className="text-md font-bold" />
        </div>
      </div>
      <ItemLines items={row.overdue} late />
      <RowActions onRemind={onRemind} onOpen={onOpen} openLabel={row.basis === 'schedule' ? 'فتح جدول الدفعات' : 'فتح فواتير العميل'} />
    </div>
  );
}

function SoonRow({ row, onRemind, onOpen }: { row: ClientReceivable; onRemind: () => void; onOpen: () => void }) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        <Avatar name={row.client.name} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-fg">{row.client.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge>{BASIS_LABEL[row.basis]}</Badge>
          </div>
        </div>
        <div className="flex-none text-end">
          <p className="text-2xs text-fg-muted">القادم</p>
          <Amount amount={row.upcomingTotal} className="text-md font-bold" />
        </div>
      </div>
      <ItemLines items={row.upcoming} late={false} />
      <RowActions onRemind={onRemind} onOpen={onOpen} openLabel={row.basis === 'schedule' ? 'فتح جدول الدفعات' : 'فتح فواتير العميل'} />
    </div>
  );
}
