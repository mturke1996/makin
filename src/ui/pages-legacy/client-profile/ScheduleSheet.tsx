import { Add, CalendarToday, Delete, Edit, WhatsApp } from '../../../design-system/icons';
import { Amount, Badge, Button, EmptyState, IconButton, ListGroup, ProgressBar, Sheet } from '../../../design-system/primitives';
import { useBrand } from '../../../config/BrandProvider';
import { reminderHref, buildReminderText } from '../../../core/finance/paymentReminder';
import { milestoneStatusLabel, type MilestoneRow, type MilestoneStatus, type PaymentSchedule } from '../../../core/finance/paymentSchedule';
import { formatDate } from '../../../core/utils-formatters';
import type { Client } from '../../../types';
import { countPhrase } from './moduleCopy';
import { whatsappHref } from './details/contactLinks';
import { RecordsSkeleton } from './records/RecordsSkeleton';
import { RecordsSummary } from './records/RecordsSummary';

const STATUS_TONE: Record<MilestoneStatus, 'success' | 'danger' | 'warning' | 'info'> = {
  paid: 'success',
  overdue: 'danger',
  due_soon: 'warning',
  upcoming: 'info',
};

interface ScheduleSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  schedule: PaymentSchedule;
  /** The agreed value of the contract, to say how much of it the schedule lays out. */
  contractValue?: number;
  /** The handlers are omitted when this person may not manage payments (`payments.manage`). */
  onAdd?: () => void;
  onGenerate?: () => void;
  onEdit?: (milestoneId: string) => void;
  onDelete?: (milestoneId: string) => void;
  loading?: boolean;
}

export function ScheduleSheet({ open, onClose, client, schedule, contractValue, onAdd, onGenerate, onEdit, onDelete, loading }: ScheduleSheetProps) {
  const brand = useBrand();
  const { rows } = schedule;
  const collectedPercent = schedule.total > 0 ? Math.min(100, Math.round((schedule.covered / schedule.total) * 100)) : 0;
  const unscheduled = contractValue && contractValue > 0 ? Math.round((contractValue - schedule.total) * 1000) / 1000 : 0;

  const remind = (row: MilestoneRow) => {
    const text = buildReminderText({
      clientName: client.name,
      companyName: brand.fullName,
      items: [
        {
          key: `m:${row.milestone.id}`,
          kind: 'milestone',
          title: row.milestone.title,
          dueDate: row.milestone.dueDate,
          amount: row.remaining,
          daysLate: row.status === 'overdue' ? row.daysLate : -row.daysUntil,
        },
      ],
      total: row.remaining,
    });
    window.open(reminderHref(whatsappHref(client.phone), text), '_blank', 'noopener,noreferrer');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="جدول الدفعات"
      subtitle={client?.name ? `${client.name} · ${countPhrase('milestones', rows.length)}` : countPhrase('milestones', rows.length)}
      maxWidth="lg"
      footer={
        onAdd ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onGenerate} disabled={loading}>تقسيم قيمة العقد</Button>
            <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={onAdd}>إضافة دفعة</Button>
          </div>
        ) : undefined
      }
    >
      <div className="min-h-[40vh]">
        {loading && rows.length === 0 ? (
          <RecordsSkeleton />
        ) : rows.length === 0 ? (
          <div className="px-4 py-5 lg:px-6">
            <EmptyState
              Icon={CalendarToday}
              title="لا يوجد جدول دفعات بعد"
              description={
                onAdd
                  ? 'اكتب الدفعات المتفق عليها مع العميل بمواعيدها، فيُظهر لك النظام ما حلّ موعده وما تأخر، ويذكّرك به. أو قسّم قيمة العقد على دفعات بنقرتين.'
                  : 'لم يُسجَّل لهذا المشروع جدول دفعات بعد.'
              }
            />
          </div>
        ) : (
          <>
            <div className="px-4 pb-3 pt-4 lg:px-6">
              <RecordsSummary
                eyebrow="المتبقي على الجدول"
                figure={<Amount amount={schedule.remaining} />}
                tone={schedule.overdueAmount > 0 ? 'danger' : 'neutral'}
                caption={countPhrase('milestones', rows.length)}
                stats={[
                  { label: 'إجمالي الجدول', value: <Amount amount={schedule.total} /> },
                  { label: 'المحصّل منه', value: <Amount amount={schedule.covered} tone="success" /> },
                  {
                    label: 'متأخر',
                    value: schedule.overdueAmount > 0 ? <Amount amount={schedule.overdueAmount} tone="danger" /> : <span className="text-fg-muted">لا شيء</span>,
                  },
                ]}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <ProgressBar value={collectedPercent} tone={schedule.overdueAmount > 0 ? 'warning' : 'success'} label="نسبة المحصّل من الجدول" />
                    <span className="flex-none text-xs font-semibold tabular-nums text-fg-subtle">
                      حُصّل <bdi dir="ltr">{collectedPercent}%</bdi>
                    </span>
                  </div>
                  {unscheduled > 0 && (
                    <p className="text-xs text-fg-muted">
                      الجدول يغطي جزءاً من قيمة العقد، وبقي <Amount amount={unscheduled} className="font-semibold text-fg" /> غير مجدول.
                    </p>
                  )}
                  {unscheduled < 0 && (
                    <p className="text-xs font-medium text-warning-ink">
                      الجدول يزيد على قيمة العقد بمقدار <Amount amount={-unscheduled} />، راجع المبالغ.
                    </p>
                  )}
                  {schedule.surplus > 0 && (
                    <p className="text-xs text-fg-muted">
                      حُصّل أكثر من الجدول بمقدار <Amount amount={schedule.surplus} className="font-semibold text-fg" />، وهو لا يقابل دفعة مجدولة بعد.
                    </p>
                  )}
                </div>
              </RecordsSummary>
            </div>

            <div className="space-y-5 px-4 pb-8 pt-3 lg:px-6">
              <ListGroup>
                {rows.map((row, i) => (
                  <MilestoneItem
                    key={row.milestone.id}
                    row={row}
                    index={i + 1}
                    onRemind={row.status === 'overdue' || row.status === 'due_soon' ? () => remind(row) : undefined}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </ListGroup>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

function MilestoneItem({
  row,
  index,
  onRemind,
  onEdit,
  onDelete,
}: {
  row: MilestoneRow;
  index: number;
  onRemind?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { milestone } = row;
  const paid = row.status === 'paid';

  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-9 flex-none place-items-center rounded-md bg-surface-sunken text-sm font-bold tabular-nums text-fg-subtle">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-fg">{milestone.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge dot tone={STATUS_TONE[row.status]}>{milestoneStatusLabel(row)}</Badge>
            {row.partial && <Badge tone="neutral">سُدّد جزء منها</Badge>}
          </div>
          <p className="mt-2 text-xs tabular-nums text-fg-muted">الاستحقاق {formatDate(milestone.dueDate)}</p>
          {milestone.notes && <p className="mt-1 line-clamp-2 text-xs text-fg-subtle">{milestone.notes}</p>}
        </div>
        {(onRemind || onEdit || onDelete) && (
          <div className="-me-2 flex flex-none">
            {onRemind && (
              <IconButton label={`تذكير العميل بـ ${milestone.title} عبر واتساب`} onClick={onRemind}>
                <WhatsApp sx={{ fontSize: 20 }} />
              </IconButton>
            )}
            {onEdit && (
              <IconButton label={`تعديل ${milestone.title}`} onClick={() => onEdit(milestone.id)}>
                <Edit sx={{ fontSize: 20 }} />
              </IconButton>
            )}
            {onDelete && (
              <IconButton label={`حذف ${milestone.title}`} onClick={() => onDelete(milestone.id)}>
                <Delete sx={{ fontSize: 20 }} />
              </IconButton>
            )}
          </div>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(6.25rem,1fr))] gap-x-3 gap-y-2.5">
        <div className="min-w-0">
          <dt className="text-2xs text-fg-muted">القيمة</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg"><Amount amount={milestone.amount} /></dd>
        </div>
        <div className="min-w-0">
          <dt className="text-2xs text-fg-muted">المحصّل</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg"><Amount amount={row.covered} tone={row.covered > 0 ? 'success' : 'inherit'} /></dd>
        </div>
        {!paid && (
          <div className="min-w-0">
            <dt className="text-2xs text-fg-muted">المتبقي</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg"><Amount amount={row.remaining} tone={row.status === 'overdue' ? 'danger' : 'inherit'} /></dd>
          </div>
        )}
      </dl>

      {row.partial && (
        <div className="mt-3">
          <ProgressBar value={(row.covered / milestone.amount) * 100} tone={row.status === 'overdue' ? 'danger' : 'brand'} label={`المحصّل من ${milestone.title}`} />
        </div>
      )}
    </div>
  );
}
