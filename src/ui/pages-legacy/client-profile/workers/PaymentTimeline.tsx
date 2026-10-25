import { useMemo, useState } from 'react';
import { Delete, Edit, ReceiptLong } from '@mui/icons-material';
import {
  Amount,
  Badge,
  EmptyState,
  IconButton,
  ListGroup,
  Section,
  Input,
  Button,
} from '../../../../design-system/primitives';
import type {
  WorkerLedger,
  WorkerLedgerPayment,
} from '../../../../core/finance/workerLedger';
import { formatDay, monthLabel } from './format';
import { filterWorkerPayments } from '../../../../core/finance/workerPaymentSearch';
import { sumMoney } from '../../../../core/finance/money';

interface PaymentTimelineProps {
  ledger: WorkerLedger;
  /** هل تسمح سياسة الوصول لهذا المستخدم بتعديل هذه الدفعة / حذفها؟ */
  canEdit: (payment: WorkerLedgerPayment) => boolean;
  canDelete: (payment: WorkerLedgerPayment) => boolean;
  /** هل يستطيع صرف دفعة (`workers.manage`)؟ يغيّر نص الحالة الفارغة فقط. */
  canPay: boolean;
  onEdit: (payment: WorkerLedgerPayment) => void;
  onDelete: (payment: WorkerLedgerPayment) => void;
}

function PaymentRow({
  payment,
  ordinal,
  crossed,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  payment: WorkerLedgerPayment;
  ordinal: number;
  /** هذه الدفعة هي التي تجاوزت الاتفاق. */
  crossed: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold tabular-nums text-fg">
            الدفعة {ordinal}
            <span className="font-normal text-fg-muted">
              {payment.day ? ` · ${formatDay(payment.day)}` : ''}
            </span>
          </p>
          {payment.recordedBy && (
            <p className="mt-0.5 text-xs text-fg-muted">
              سجّلها {payment.recordedBy}
            </p>
          )}
        </div>
        <Amount
          amount={payment.amount}
          className="flex-none text-md font-bold text-fg"
        />
      </div>

      {payment.note ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
          {payment.note}
        </p>
      ) : (
        <p className="mt-2 text-sm text-fg-muted">بدون ملاحظة</p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-xs text-fg-muted">
            {payment.balanceBasis === 'recorded'
              ? 'المتبقي وفق الاتفاق المسجل وقتها'
              : payment.balanceBasis === 'opening'
                ? 'المتبقي وفق الاتفاق الافتتاحي'
                : 'المتبقي وفق الاتفاق الحالي'}{' '}
            <Amount
              amount={payment.remainingAfter}
              tone={
                payment.remainingAfter < 0
                  ? 'danger'
                  : payment.remainingAfter === 0
                    ? 'success'
                    : 'inherit'
              }
              className="font-semibold"
            />
          </p>
          {crossed && <Badge tone="danger">تجاوزت الاتفاق</Badge>}
          {payment.expense.isClosed && (
            <Badge tone="info">مغلقة في فاتورة مصروفات</Badge>
          )}
        </div>
        {(canEdit || canDelete) && (
          <div className="-me-2 flex flex-none">
            {canEdit && (
              <IconButton label={`تعديل الدفعة ${ordinal}`} onClick={onEdit}>
                <Edit sx={{ fontSize: 20 }} />
              </IconButton>
            )}
            {canDelete && (
              <IconButton label={`حذف الدفعة ${ordinal}`} onClick={onDelete}>
                <Delete sx={{ fontSize: 20 }} />
              </IconButton>
            )}
          </div>
        )}
      </div>
      {payment.balanceBasis !== 'recorded' && (
        <p className="mt-1 text-xs text-fg-muted">
          تعديلات الاتفاق السابقة لهذه الدفعة غير موثقة.
        </p>
      )}
      <p className="mt-2 break-all text-2xs text-fg-muted">
        مرجع: <bdi dir="ltr">{payment.id}</bdi>
      </p>
    </article>
  );
}

/** «سجل الدفعات»: خط زمني مجمّع بالشهر، الأحدث أولاً. الملاحظة تظهر كاملة دائماً. */
export function PaymentTimeline({
  ledger,
  canEdit,
  canDelete,
  canPay,
  onEdit,
  onDelete,
}: PaymentTimelineProps) {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filtered = useMemo(
    () => filterWorkerPayments(ledger.payments, search, from, to),
    [ledger.payments, search, from, to],
  );
  const filtering = !!(search || from || to);
  const visibleIds = useMemo(
    () => new Set(filtered.map((payment) => payment.id)),
    [filtered],
  );
  const ordinalById = useMemo(
    () => new Map(ledger.payments.map((p, i) => [p.id, i + 1])),
    [ledger.payments],
  );
  const crossedId = useMemo(
    () => ledger.payments.find((p) => p.exceedsAgreed)?.id,
    [ledger.payments],
  );
  const months = useMemo(
    () =>
      [...ledger.months]
        .reverse()
        .map((month) => {
          const payments = month.payments.filter((payment) =>
            visibleIds.has(payment.id),
          );
          return {
            ...month,
            payments,
            count: payments.length,
            total: sumMoney(payments.map((payment) => payment.amount)),
          };
        })
        .filter((month) => month.count > 0),
    [ledger.months, visibleIds],
  );

  return (
    <Section
      title="سجل الدفعات"
      description={
        ledger.paymentCount === 0
          ? undefined
          : `${ledger.paymentCount} ${ledger.paymentCount === 1 ? 'دفعة' : 'دفعات'}${ledger.lastPaymentDay ? `، آخرها ${formatDay(ledger.lastPaymentDay)}` : ''}`
      }
    >
      {ledger.paymentCount === 0 ? (
        <EmptyState
          Icon={ReceiptLong}
          title="لا توجد دفعات بعد"
          description={
            canPay
              ? 'اضغط «صرف دفعة» وسجّل المبلغ مع ملاحظة توضح سببه، مثل دفعة مقدمة أو إنجاز مرحلة. تظهر هنا مرتبة بالتاريخ مع المتبقي بعد كل دفعة.'
              : 'لم تُصرف أي دفعة لهذا العامل بعد. تظهر الدفعات هنا مرتبة بالتاريخ مع المتبقي بعد كل دفعة.'
          }
        />
      ) : (
        <div className="space-y-4">
          <Input
            label="بحث في دفعات العامل"
            type="search"
            placeholder="الملاحظة أو المسجل أو مرجع الدفعة"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-fg-subtle">
              تصفية حسب التاريخ
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Input
                label="من تاريخ"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
              />
              <Input
                label="إلى تاريخ"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </details>
          {filtering && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p role="status" className="text-xs text-fg-subtle">
                {filtered.length} دفعة، مجموعها{' '}
                <Amount
                  amount={sumMoney(filtered.map((payment) => payment.amount))}
                />
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setFrom('');
                  setTo('');
                }}
              >
                مسح التصفية
              </Button>
            </div>
          )}
          {!filtered.length && (
            <p
              role="status"
              className="py-6 text-center text-sm text-fg-subtle"
            >
              لا توجد دفعات مطابقة لهذه الشروط.
            </p>
          )}
          {months.map((m) => (
            <div key={m.key}>
              <div className="sticky top-0 z-[1] -mx-4 flex items-baseline justify-between gap-3 bg-surface-canvas px-5 py-2 lg:-mx-6 lg:px-7">
                <h3 className="text-sm font-semibold text-fg">
                  {monthLabel(m.year, m.month)}
                </h3>
                <p className="text-xs text-fg-muted">
                  {m.count} {m.count === 1 ? 'دفعة' : 'دفعات'} ·{' '}
                  <Amount
                    amount={m.total}
                    className="font-semibold text-fg-subtle"
                  />
                </p>
              </div>
              <ListGroup>
                {[...m.payments].reverse().map((p) => (
                  <PaymentRow
                    key={p.id}
                    payment={p}
                    ordinal={ordinalById.get(p.id) ?? 0}
                    crossed={p.id === crossedId}
                    canEdit={canEdit(p)}
                    canDelete={canDelete(p)}
                    onEdit={() => onEdit(p)}
                    onDelete={() => onDelete(p)}
                  />
                ))}
              </ListGroup>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
