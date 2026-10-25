import { Fragment, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Balance, ContentCopy, FilterAltOff, IosShare } from '../../../../design-system/icons';
import { Amount, Button, EmptyState, Segmented, Sheet } from '../../../../design-system/primitives';
import { monthTitle, periodRange, todayDay } from '../../../../core/finance/clientActivity';
import {
  buildClientStatement,
  buildStatementText,
  type StatementKind,
  type StatementRow,
} from '../../../../core/finance/clientStatement';
import type { Client, Expense, Payment, StandaloneDebt } from '../../../../types';
import { CustomRange, DEFAULT_PERIOD, PeriodSelect, type PeriodState } from './PeriodFilter';
import { RowsSkeleton, ShowMore } from './parts';
import { copyText, shareText } from './shareText';
import { StatementSummary } from './StatementSummary';
import { MonthDivider, StatementEntry } from './StatementRow';
import { remainingPhrase, useVisibleCount } from './useVisibleCount';

const PAGE = 80;
const ROW_NOUN = { one: 'حركة', two: 'حركتان', few: 'حركات', many: 'حركة' };

type Order = 'oldest' | 'newest';

export interface ClientStatementSheetProps {
  open: boolean;
  onClose: () => void;
  client: Pick<Client, 'id' | 'name'>;
  /** The statement is a whole-account figure: it renders only when `showSummary` is true. */
  caps: { showSummary: boolean };
  payments: Payment[];
  /** Every expense of the client, worker payments included. */
  expenses: Expense[];
  debts: StandaloneDebt[];
  loading?: boolean;
  /** A row was tapped. For `worker` the id is the payment's expense id. */
  onOpen: (kind: StatementKind, id: string) => void;
}

/** كشف الحساب: money in and out in order, with the balance after every line. */
export function ClientStatementSheet(props: ClientStatementSheetProps) {
  if (!props.caps.showSummary) return null;
  return <StatementSheet key={props.client.id} {...props} />;
}

function StatementSheet({ open, onClose, client, payments, expenses, debts, loading, onOpen }: ClientStatementSheetProps) {
  const [period, setPeriod] = useState<PeriodState>(DEFAULT_PERIOD);
  const [order, setOrder] = useState<Order>('oldest');

  const range = useMemo(
    () => periodRange(period.period, todayDay(), { from: period.from, to: period.to }),
    [period.period, period.from, period.to],
  );
  const statement = useMemo(() => buildClientStatement({ payments, expenses, debts }, range), [payments, expenses, debts, range]);

  const rows = useMemo(() => (order === 'oldest' ? statement.rows : [...statement.rows].reverse()), [statement.rows, order]);
  const { count: visible, showMore } = useVisibleCount(`${period.period}|${period.from}|${period.to}|${order}`, PAGE);
  const shown = rows.slice(0, visible);
  const remaining = Math.max(0, rows.length - visible);

  const empty = payments.length === 0 && expenses.length === 0;
  const periodActive = period.period !== 'all';

  const text = () => buildStatementText({ clientName: client.name, statement, rowLimit: 10 });
  const onShare = async () => {
    const result = await shareText(text(), `كشف حساب ${client.name}`);
    if (result === 'failed') toast.error('تعذّرت المشاركة، جرّب النسخ');
  };
  const onCopy = async () => {
    if (await copyText(text())) toast.success('تم نسخ الكشف');
    else toast.error('تعذّر النسخ');
  };

  let lastMonth = '';
  const entries = shown.map((row: StatementRow) => {
    const month = row.day.slice(0, 7);
    const divider = month !== lastMonth;
    lastMonth = month;
    return (
      <Fragment key={row.key}>
        {divider && <MonthDivider title={monthTitle(month)} />}
        <StatementEntry row={row} onOpen={() => onOpen(row.kind, row.id)} />
      </Fragment>
    );
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="كشف الحساب"
      subtitle={client.name}
      maxWidth="md"
      footer={
        empty ? undefined : (
          <div className="grid grid-cols-2 gap-3">
            <Button leftIcon={<IosShare sx={{ fontSize: 20 }} />} onClick={onShare}>
              مشاركة
            </Button>
            <Button variant="outline" leftIcon={<ContentCopy sx={{ fontSize: 20 }} />} onClick={onCopy}>
              نسخ
            </Button>
          </div>
        )
      }
    >
      <div className="min-h-[40vh]">
        {!empty && !loading && (
          <div className="px-4 pt-4 lg:px-6">
            <StatementSummary statement={statement} />
          </div>
        )}
        {!empty && (
          <div className="z-[1] space-y-3 bg-surface-canvas px-4 pb-3 pt-4 lg:px-6 [@media(min-height:44rem)]:sticky [@media(min-height:44rem)]:top-0">
            <div className="flex flex-wrap gap-3">
              <div className="w-40 flex-none">
                <PeriodSelect value={period} onChange={setPeriod} />
              </div>
              <Segmented<Order>
                aria-label="ترتيب الحركات"
                className="min-w-0 flex-1 basis-44 sm:w-72 sm:flex-none"
                value={order}
                onChange={setOrder}
                options={[
                  { value: 'oldest', label: 'الأقدم أولاً' },
                  { value: 'newest', label: 'الأحدث أولاً' },
                ]}
              />
            </div>
            <CustomRange value={period} onChange={setPeriod} />
          </div>
        )}

        <div className="space-y-6 px-4 pb-8 pt-1 lg:px-6">
          {loading ? (
            <RowsSkeleton />
          ) : empty ? (
            <EmptyState
              Icon={Balance}
              title="لا توجد حركات مالية بعد"
              description="يتكوّن الكشف من الدفعات المستلمة من العميل والمصروفات ودفعات العمال. سجّل أول دفعة أو مصروف وسيظهر هنا برصيد جارٍ."
            />
          ) : (
            <>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-panel">
                {rows.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-base font-semibold text-fg">لا توجد حركات في هذه الفترة</p>
                    {periodActive && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        leftIcon={<FilterAltOff sx={{ fontSize: 20 }} />}
                        onClick={() => setPeriod(DEFAULT_PERIOD)}
                      >
                        عرض كل الفترات
                      </Button>
                    )}
                  </div>
                ) : (
                  entries
                )}
              </div>

              {remaining > 0 && (
                <ShowMore label={`عرض المزيد (${remainingPhrase(remaining, ROW_NOUN)})`} onClick={showMore} />
              )}

              {statement.debtsCount > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-panel px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">الديون المتبقية</p>
                    <p className="text-xs text-fg-muted">منفصلة عن الرصيد ولا تدخل فيه</p>
                  </div>
                  <Amount amount={statement.debtsRemaining} tone="warning" className="flex-none text-md font-bold" />
                </div>
              )}

              {statement.skipped > 0 && (
                <p className="px-1 text-xs text-fg-muted">
                  {statement.skipped === 1 ? 'سجل واحد بلا تاريخ لم يدخل الكشف.' : `${statement.skipped} سجلات بلا تاريخ لم تدخل الكشف.`}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}
