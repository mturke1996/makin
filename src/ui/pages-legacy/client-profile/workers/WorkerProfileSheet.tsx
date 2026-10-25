import { useState, type ReactNode } from 'react';
import {
  Archive,
  CalendarToday,
  CheckCircle,
  Edit,
  Payment,
  PhoneEnabled,
  PictureAsPdf,
  ReplayCircleFilled,
  Share,
  Unarchive,
} from '../../../../design-system/icons';
import {
  Avatar,
  Badge,
  Button,
  IconButton,
  Input,
  ListGroup,
  ListRow,
  Section,
  Sheet,
  Segmented,
} from '../../../../design-system/primitives';
import type { WorkerLedgerPayment } from '../../../../core/finance/workerLedger';
import { formatDay, telHref } from './format';
import { WorkerMoneySummary } from './WorkerMoneySummary';
import { AgreementBreakdown } from './AgreementBreakdown';
import { PaymentTimeline } from './PaymentTimeline';
import { AgreementHistory } from './AgreementHistory';
import { LEDGER_STATUS_META } from './format';
import type { WorkerReportPeriod } from '../../../../features/pdf/workerReportModel';
import type { WorkerEntry } from './types';

interface WorkerProfileSheetProps {
  open: boolean;
  onClose: () => void;
  clientName?: string;
  entry: WorkerEntry | null;
  /** تعديل العامل وإنهاء/إعادة فتح العمل وحذفه وصرف دفعة له: `workers.manage`. */
  canManage: boolean;
  /** تعديل دفعة / حذفها: قرار سياسة الوصول على مصروف الدفعة (صاحبها أو من يملك الصلاحية، وليست مغلقة). */
  canEditPayment: (payment: WorkerLedgerPayment) => boolean;
  canDeletePayment: (payment: WorkerLedgerPayment) => boolean;
  onPay: () => void;
  onEditPayment: (payment: WorkerLedgerPayment) => void;
  onDeletePayment: (payment: WorkerLedgerPayment) => void;
  onEditWorker: (opts?: { itemize?: boolean }) => void;
  onToggleCompleted: () => void;
  onArchiveWorker: () => void;
  onStatementPdf?: (period?: WorkerReportPeriod) => void;
  onShareStatement?: (period?: WorkerReportPeriod) => void;
  pdfLoading?: boolean;
}

function ActionIcon({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <span
      aria-hidden
      className={`flex h-10 w-10 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-danger-soft text-danger-ink' : 'bg-surface-sunken text-fg-subtle'}`}
    >
      {children}
    </span>
  );
}

/** الملف الشخصي المخصص للعامل: الهوية، المال، تفصيل الاتفاق، سجل الدفعات، ثم الإدارة. */
export function WorkerProfileSheet({
  open,
  onClose,
  clientName,
  entry,
  canManage,
  canEditPayment,
  canDeletePayment,
  onPay,
  onEditPayment,
  onDeletePayment,
  onEditWorker,
  onToggleCompleted,
  onArchiveWorker,
  onStatementPdf,
  onShareStatement,
  pdfLoading,
}: WorkerProfileSheetProps) {
  const worker = entry?.worker;
  const ledger = entry?.ledger;
  const completed = worker?.status === 'completed';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tab, setTab] = useState<'payments' | 'agreement' | 'details'>(
    'payments',
  );
  const invalidPeriod = !!(from && to && from > to);
  const period: WorkerReportPeriod = {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="ملف العامل"
      subtitle={clientName}
      maxWidth="md"
      headerAction={
        worker && canManage && !worker.archivedAt ? (
          <IconButton
            label="تعديل بيانات العامل"
            onClick={() => onEditWorker()}
          >
            <Edit sx={{ fontSize: 22 }} />
          </IconButton>
        ) : undefined
      }
      footer={
        worker && canManage && !worker.archivedAt ? (
          <Button
            size="lg"
            block
            leftIcon={<Payment sx={{ fontSize: 22 }} />}
            onClick={onPay}
          >
            صرف دفعة
          </Button>
        ) : undefined
      }
    >
      {worker && ledger && (
        <div className="space-y-6 p-4 pb-8 lg:p-6">
          <section className="flex items-start gap-4">
            <Avatar name={worker.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-xl font-bold leading-tight text-fg">
                {worker.name}
              </h3>
              <p className="mt-0.5 text-sm text-fg-subtle">
                {worker.jobType || 'عامل / مقاول'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="neutral">
                  {completed ? 'العمل مكتمل' : 'العمل جارٍ'}
                </Badge>
                <Badge tone={LEDGER_STATUS_META[ledger.status].tone}>
                  {LEDGER_STATUS_META[ledger.status].label}
                </Badge>
                {worker.archivedAt && <Badge tone="neutral">مؤرشف</Badge>}
              </div>
            </div>
          </section>

          {(worker.phone || worker.startDate || worker.notes) && (
            <ListGroup>
              {worker.phone && (
                <a
                  href={telHref(worker.phone)}
                  className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-fast hover:bg-surface-hover focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]"
                >
                  <ActionIcon>
                    <PhoneEnabled sx={{ fontSize: 20 }} />
                  </ActionIcon>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-fg-muted">الهاتف</span>
                    <bdi
                      dir="ltr"
                      className="block truncate text-base font-semibold tabular-nums text-fg"
                    >
                      {worker.phone}
                    </bdi>
                  </span>
                  <span className="text-sm font-semibold text-accent-ink">
                    اتصال
                  </span>
                </a>
              )}
              {worker.startDate && (
                <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                  <ActionIcon>
                    <CalendarToday sx={{ fontSize: 20 }} />
                  </ActionIcon>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-fg-muted">
                      بدأ العمل
                    </span>
                    <span className="block text-base font-semibold tabular-nums text-fg">
                      {formatDay(worker.startDate)}
                    </span>
                  </span>
                </div>
              )}
              {worker.notes && (
                <div className="px-4 py-3">
                  <p className="text-xs text-fg-muted">ملاحظات</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
                    {worker.notes}
                  </p>
                </div>
              )}
            </ListGroup>
          )}

          <WorkerMoneySummary
            ledger={ledger}
            onEditAgreement={
              canManage && !worker.archivedAt ? () => onEditWorker() : undefined
            }
          />

          <Segmented<'payments' | 'agreement' | 'details'>
            aria-label="محتوى ملف العامل"
            value={tab}
            onChange={setTab}
            options={[
              {
                value: 'payments',
                label: 'الدفعات',
                count: ledger.paymentCount,
              },
              { value: 'agreement', label: 'الاتفاق' },
              { value: 'details', label: 'الكشف والإدارة' },
            ]}
          />

          {tab === 'agreement' && (
            <>
              <AgreementBreakdown
                ledger={ledger}
                onItemize={
                  canManage && !worker.archivedAt
                    ? () => onEditWorker({ itemize: true })
                    : undefined
                }
              />

              <AgreementHistory worker={worker} />
            </>
          )}

          {tab === 'payments' && (
            <PaymentTimeline
              ledger={ledger}
              canEdit={canEditPayment}
              canDelete={canDeletePayment}
              canPay={canManage && !worker.archivedAt}
              onEdit={onEditPayment}
              onDelete={onDeletePayment}
            />
          )}

          {tab === 'details' && (onStatementPdf || onShareStatement) && (
            <Section
              title="نطاق كشف الحساب"
              description="اترك التاريخين فارغين لعرض جميع الدفعات. الاتفاق والمستحق الحاليان يظهران دائماً بمسمّاهما."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="دفعات من تاريخ"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <Input
                  label="دفعات إلى تاريخ"
                  type="date"
                  value={to}
                  min={from || undefined}
                  error={
                    invalidPeriod
                      ? 'يجب أن تأتي نهاية الفترة بعد بدايتها'
                      : undefined
                  }
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </Section>
          )}

          {tab === 'details' &&
            (canManage || onStatementPdf || onShareStatement) && (
              <Section title="إدارة العامل">
                <ListGroup>
                  {onStatementPdf && (
                    <ListRow
                      density="compact"
                      leading={
                        <ActionIcon>
                          <PictureAsPdf sx={{ fontSize: 20 }} />
                        </ActionIcon>
                      }
                      title="كشف حساب العامل (PDF)"
                      subtitle="الاتفاق والدفعات والملاحظات والمتبقي"
                      onClick={() => onStatementPdf(period)}
                      disabled={pdfLoading || invalidPeriod}
                    />
                  )}
                  {onShareStatement && (
                    <ListRow
                      density="compact"
                      leading={
                        <ActionIcon>
                          <Share sx={{ fontSize: 20 }} />
                        </ActionIcon>
                      }
                      title="مشاركة كشف الحساب"
                      onClick={() => onShareStatement(period)}
                      disabled={pdfLoading || invalidPeriod}
                    />
                  )}
                  {canManage && !worker.archivedAt && (
                    <ListRow
                      density="compact"
                      leading={
                        <ActionIcon>
                          {completed ? (
                            <ReplayCircleFilled sx={{ fontSize: 20 }} />
                          ) : (
                            <CheckCircle sx={{ fontSize: 20 }} />
                          )}
                        </ActionIcon>
                      }
                      title={
                        completed ? 'إعادة فتح العمل' : 'تعليم العمل كمكتمل'
                      }
                      subtitle={
                        completed
                          ? 'يعود العامل إلى قائمة الأعمال الجارية'
                          : 'يُعلَّم العامل بأن عمله انتهى'
                      }
                      onClick={onToggleCompleted}
                    />
                  )}
                  {canManage && (
                    <ListRow
                      density="compact"
                      leading={
                        <ActionIcon>
                          {worker.archivedAt ? (
                            <Unarchive sx={{ fontSize: 20 }} />
                          ) : (
                            <Archive sx={{ fontSize: 20 }} />
                          )}
                        </ActionIcon>
                      }
                      title={
                        worker.archivedAt ? 'استعادة العامل' : 'أرشفة العامل'
                      }
                      subtitle="يبقى الاتفاق والسجل والدفعات والمستحقات محفوظة"
                      onClick={onArchiveWorker}
                    />
                  )}
                </ListGroup>
              </Section>
            )}
        </div>
      )}
    </Sheet>
  );
}
