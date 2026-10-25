import { useDeferredValue, useMemo, useState, type ElementType } from 'react';
import { Add, AccountBalance, CreditCard, PhoneAndroid, Payments, RequestQuote } from '../../../design-system/icons';
import { Amount, Button, EmptyState, Segmented, Sheet } from '../../../design-system/primitives';
import {
  EMPTY_PAYMENT_QUERY,
  filterPayments,
  formatDayText,
  groupRecords,
  limitGroups,
  paymentFacets,
  summarizePayments,
  type PaymentContext,
  type PaymentQuery,
  type RecordSort,
} from '../../../core/finance/clientRecords';
import type { Client, Payment } from '../../../types';
import { monthKeyLabel } from './ledgerUtils';
import { LedgerGroup, LedgerRow, PdfActions } from './LedgerParts';
import { countPhrase } from './moduleCopy';
import { FilterGroup, MultiChips, SingleChips } from './records/filterControls';
import { groupTitle, RecordsNoResults, ShowMore } from './records/RecordsList';
import { RecordsFilterBar, type ActiveFilter } from './records/RecordsFilterBar';
import { RecordsSummary, ShareList } from './records/RecordsSummary';
import { countCaption } from './records/recordLabels';
import { RecordsSkeleton } from './records/RecordsSkeleton';
import { usePagedLimit, useResetOnClose } from './records/useRecordsView';

export const PAYMENT_METHOD_LABEL: Record<Payment['paymentMethod'], string> = {
  cash: 'نقدي',
  bank_transfer: 'تحويل بنكي',
  check: 'شيك',
  credit_card: 'بطاقة',
  mobile_payment: 'دفع إلكتروني',
};

const METHOD_ICON: Record<Payment['paymentMethod'], ElementType> = {
  cash: Payments,
  bank_transfer: AccountBalance,
  check: RequestQuote,
  credit_card: CreditCard,
  mobile_payment: PhoneAndroid,
};

const methodLabel = (method: string) => PAYMENT_METHOD_LABEL[method as Payment['paymentMethod']] ?? method;
const CONTEXT: PaymentContext = { methodLabel };
const SORT_LABEL: Record<RecordSort, string> = { newest: 'الأحدث', oldest: 'الأقدم', largest: 'الأكبر مبلغاً' };

interface PaymentsSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  clientPayments: Payment[];
  totalPaid: number;
  pdfLoading: boolean;
  /** Omitted when this person may not record payments (`payments.manage`): the sheet is then read-only. */
  onAdd?: () => void;
  onEdit?: (payment: Payment) => void;
  /** Omitted when this user may not delete (`payments.delete`). */
  onDelete?: (payment: Payment) => void;
  /** The statement PDF needs the full picture, so these exist only where the summary is shown. */
  onDownloadPdf?: () => void;
  onSharePdf?: () => void;
  /** True while the records are still arriving: shows a skeleton instead of «no records yet». */
  loading?: boolean;
}

/** Payments received from the client: filterable, newest month first, with where the money came in by. */
export function PaymentsSheet({
  open,
  onClose,
  client,
  clientPayments,
  totalPaid,
  pdfLoading,
  onAdd,
  onEdit,
  onDelete,
  onDownloadPdf,
  onSharePdf,
  loading,
}: PaymentsSheetProps) {
  const [query, setQuery] = useState<PaymentQuery>(EMPTY_PAYMENT_QUERY);
  useResetOnClose(open, () => setQuery(EMPTY_PAYMENT_QUERY));

  const deferredSearch = useDeferredValue(query.search);
  const effective = useMemo(() => ({ ...query, search: deferredSearch }), [query, deferredSearch]);
  const filtered = useMemo(() => filterPayments(clientPayments, effective, CONTEXT), [clientPayments, effective]);
  const facets = useMemo(() => paymentFacets(clientPayments, effective, CONTEXT), [clientPayments, effective]);
  const summary = useMemo(() => summarizePayments(filtered, CONTEXT), [filtered]);

  const groupBy = query.sort === 'largest' ? 'none' : 'month';
  const groups = useMemo(
    () =>
      groupRecords(
        filtered,
        (p) => p.paymentDate,
        (p) => p.amount,
        groupBy
      ),
    [filtered, groupBy]
  );
  const { limit, more } = usePagedLimit(JSON.stringify([effective, groupBy]));
  const page = useMemo(() => limitGroups(groups, limit), [groups, limit]);

  const filtering = query.search.trim() !== '' || query.methods.length > 0 || query.month !== '';
  const patch = (next: Partial<PaymentQuery>) => setQuery((q) => ({ ...q, ...next }));
  const clearAll = () => setQuery(EMPTY_PAYMENT_QUERY);

  const active: ActiveFilter[] = [
    ...(query.month
      ? [{ key: 'month', label: `الشهر: ${monthKeyLabel(query.month)}`, onRemove: () => patch({ month: '' }) }]
      : []),
    ...query.methods.map((key) => ({
      key: `m:${key}`,
      label: `الطريقة: ${methodLabel(key)}`,
      onRemove: () => patch({ methods: query.methods.filter((k) => k !== key) }),
    })),
    ...(query.sort !== 'newest'
      ? [{ key: 'sort', label: `الترتيب: ${SORT_LABEL[query.sort]}`, onRemove: () => patch({ sort: 'newest' }) }]
      : []),
  ];
  const monthOptions = facets.months.map((m) => ({ ...m, label: monthKeyLabel(m.key) }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="المدفوعات"
      subtitle={client?.name || 'تحصيلات العميل'}
      maxWidth="lg"
      footer={
        onAdd ? (
          <Button block leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={onAdd}>
            إضافة دفعة
          </Button>
        ) : undefined
      }
    >
      <div className="min-h-[40vh]">
        {loading && clientPayments.length === 0 ? (
          <RecordsSkeleton />
        ) : clientPayments.length === 0 ? (
          <div className="px-4 py-5 lg:px-6">
            <EmptyState
              Icon={Payments}
              title="لا توجد مدفوعات بعد"
              description={
                onAdd
                  ? 'سجّل كل دفعة يستلمها المشروع من العميل بمبلغها وطريقتها وتاريخها، فيُحسب رصيد حسابه تلقائياً وتظهر هنا مرتبة بالأشهر. اضغط إضافة دفعة للبدء.'
                  : 'لم تُسجَّل أي دفعة من هذا العميل بعد.'
              }
            />
          </div>
        ) : (
          <>
            <div className="px-4 pb-3 pt-4 lg:px-6">
              <RecordsSummary
                eyebrow={filtering ? 'المحصّل المطابق' : 'إجمالي المحصّل'}
                tone="success"
                figure={<Amount amount={filtering ? summary.total : totalPaid} />}
                caption={countCaption('payments', filtering ? summary.count : clientPayments.length, filtering)}
                context={
                  filtering ? (
                    <>
                      من إجمالي <Amount amount={totalPaid} />
                    </>
                  ) : undefined
                }
              >
                {summary.byMethod.length > 1 && (
                  <ShareList title="حسب طريقة الدفع" rows={summary.byMethod} top={4} expandLabel="عرض التفاصيل" />
                )}
              </RecordsSummary>
            </div>

            <RecordsFilterBar
              searchLabel="بحث في المدفوعات"
              placeholder="ابحث في المدفوعات"
              search={query.search}
              onSearchChange={(search) => patch({ search })}
              active={active}
              onClearAll={clearAll}
              shown={filtered.length}
              total={clientPayments.length}
            >
              {(monthOptions.length > 1 || query.month !== '') && (
                <FilterGroup title="الشهر">
                  <SingleChips
                    scroll
                    options={monthOptions}
                    value={query.month}
                    onChange={(month) => patch({ month })}
                    allLabel="كل الأشهر"
                  />
                </FilterGroup>
              )}
              {(facets.methods.length > 1 || query.methods.length > 0) && (
                <FilterGroup title="طريقة الدفع">
                  <MultiChips
                    options={facets.methods}
                    selected={query.methods}
                    onToggle={(key) =>
                      patch({
                        methods: query.methods.includes(key) ? query.methods.filter((k) => k !== key) : [...query.methods, key],
                      })
                    }
                    moreLabel="عرض كل الطرق"
                  />
                </FilterGroup>
              )}
              <FilterGroup title="الترتيب">
                <Segmented<RecordSort>
                  aria-label="ترتيب المدفوعات"
                  value={query.sort}
                  onChange={(sort) => patch({ sort })}
                  options={(Object.keys(SORT_LABEL) as RecordSort[]).map((value) => ({ value, label: SORT_LABEL[value] }))}
                />
              </FilterGroup>
            </RecordsFilterBar>

            <div className="space-y-5 px-4 pb-8 pt-1 lg:px-6">
              {filtered.length === 0 ? (
                <RecordsNoResults
                  description="لا توجد دفعة بهذه الشروط. جرّب مبلغاً أو كلمة أخرى، أو أزل بعض عناصر التصفية."
                  onReset={clearAll}
                />
              ) : (
                page.groups.map((group) => (
                  <LedgerGroup
                    key={group.key}
                    sticky={groupBy !== 'none'}
                    title={groupBy === 'none' ? `مرتبة حسب ${SORT_LABEL.largest}` : groupTitle(group)}
                    count={countPhrase('payments', group.count)}
                    trailing={<Amount amount={group.total} tone="success" />}
                  >
                    {group.items.map((p) => {
                      const Icon = METHOD_ICON[p.paymentMethod] ?? Payments;
                      const label = methodLabel(p.paymentMethod);
                      const date = formatDayText(p.paymentDate);
                      return (
                        <LedgerRow
                          key={p.id}
                          leading={
                            <span className="grid size-11 place-items-center rounded-full bg-success-soft text-success-ink">
                              <Icon sx={{ fontSize: 22 }} aria-hidden />
                            </span>
                          }
                          title={label}
                          subtitle={
                            <bdi dir="ltr" className="tabular-nums">
                              {date}
                            </bdi>
                          }
                          note={p.notes}
                          meta={p.createdBy && <span className="text-xs text-fg-muted">بواسطة {p.createdBy}</span>}
                          trailing={<Amount amount={p.amount} tone="success" showSign className="text-md font-bold" />}
                          onOpen={onEdit ? () => onEdit(p) : undefined}
                          onDelete={onDelete ? () => onDelete(p) : undefined}
                          editLabel={`تعديل دفعة ${label} بتاريخ ${date}`}
                          deleteLabel={`حذف دفعة ${label} بتاريخ ${date}`}
                        />
                      );
                    })}
                  </LedgerGroup>
                ))
              )}
              <ShowMore hidden={page.hidden} onMore={more} />

              {onDownloadPdf && onSharePdf && <PdfActions loading={pdfLoading} onDownload={onDownloadPdf} onShare={onSharePdf} />}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
