import { useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LockOutlined } from '../../../design-system/icons';
import { Input } from '../../../design-system/primitives';
import {
  expenseCategories,
  expenseHasQuantityLine,
  multiplyQuantityPrice,
  parseDecimalInput,
} from '../../../core/utils-formatters';
import type { Expense, ProjectPhase, Worker } from '../../../types';
import { ExpenseQuantityBlock } from './ExpenseQuantityBlock';
import {
  FormDateInput,
  FormField,
  FormSection,
  FormSelect,
  FormSheetShell,
  FormTextArea,
  MoneyField,
} from './FormSheetKit';
import { CustodyOverdraftNotice, UserBalanceBanner } from './profileBanners';
import { ProfileCallout } from './profileUi';
import { ExpenseReviewPanel } from '../money/ExpenseReviewPanel';
import { PriceHint } from '../money/PriceHint';
import { SupplierField } from '../money/SupplierField';
import { useSupplierPicker } from '../money/useSupplierPicker';
import { NewCategoryLink } from '../../expense-category/NewCategory';
import { isoDay } from './ledgerUtils';
import { expenseSchema, type ExpenseFormValues } from './schemas';
import type { FundStats, UserBalanceInfo } from './types';

interface ExpenseFormSheetProps {
  edit?: Expense | null;
  clientWorkers: Worker[];
  clientPhases: ProjectPhase[];
  currentUserBalanceInfo: UserBalanceInfo | null;
  userName: string;
  /** The custody pool the overdraft notice compares against (null when it does not apply). */
  fundStats: FundStats | null;
  /** Which custody `fundStats` is, named in the overdraft warning ("عهدتك على هذا المشروع"). */
  fundLabel?: string;
  /** Amount the edited expense already took from the pool, given back before comparing. */
  fundOriginalAmount?: number;
  /** Linking an expense to a worker is paying them, which takes `workers.manage`. */
  canLinkWorker: boolean;
  /**
   * Set when this person may look at the expense but not change it (it is closed in an expense
   * invoice, or it is not theirs). The form then shows the reason and offers no save or delete.
   */
  readOnlyNotice?: string | null;
  onClose: () => void;
  onSubmit: (data: ExpenseFormValues) => Promise<unknown>;
  onDelete?: () => void;
  /** Where the expense stands in review, with the decisions for someone who may take them. */
  review?: { canDecide: boolean; onApprove: () => Promise<void>; onReject: (reason: string) => Promise<void> };
}

export function ExpenseFormSheet({
  edit,
  clientWorkers,
  clientPhases,
  currentUserBalanceInfo,
  userName,
  fundStats,
  fundLabel,
  fundOriginalAmount = 0,
  canLinkWorker,
  readOnlyNotice,
  onClose,
  onSubmit,
  onDelete,
  review,
}: ExpenseFormSheetProps) {
  const { control, handleSubmit, setValue } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: edit?.description ?? '',
      amount: edit ? String(edit.amount) : '',
      quantity: edit?.quantity != null ? String(edit.quantity) : '',
      unit: edit?.unit ?? '',
      unitPrice: edit?.unitPrice != null ? String(edit.unitPrice) : '',
      category: edit?.category ?? 'materials',
      date: edit?.date ? isoDay(edit.date) : isoDay(),
      invoiceNumber: edit?.invoiceNumber ?? '',
      supplierId: edit?.supplierId ?? '',
      notes: edit?.notes ?? '',
      workerId: edit?.workerId ?? '',
      phaseId: edit?.phaseId ?? '',
    },
  });
  const amount = useWatch({ control, name: 'amount' });
  const quantity = useWatch({ control, name: 'quantity' });
  const measureUnit = useWatch({ control, name: 'unit' });
  const unitPrice = useWatch({ control, name: 'unitPrice' });
  const description = useWatch({ control, name: 'description' });
  const category = useWatch({ control, name: 'category' });
  const pick = useSupplierPicker();

  // Quantity x price drives the total, but only when one of them actually changes: opening an edit
  // (or React re-running the effect) must never rewrite an amount that was typed by hand.
  const lastPair = useRef(`${quantity}|${unitPrice}`);
  useEffect(() => {
    const pair = `${quantity}|${unitPrice}`;
    if (pair === lastPair.current) return;
    lastPair.current = pair;
    const q = parseDecimalInput(quantity);
    const p = parseDecimalInput(unitPrice);
    if (q != null && q > 0 && p != null && p >= 0) {
      setValue('amount', String(multiplyQuantityPrice(q, p)), { shouldValidate: true });
    }
  }, [quantity, unitPrice, setValue]);

  const hasQuantityLine = expenseHasQuantityLine({
    quantity: parseDecimalInput(quantity),
    unitPrice: parseDecimalInput(unitPrice),
  });

  const clearQuantity = () => {
    setValue('quantity', '');
    setValue('unit', '');
    setValue('unitPrice', '');
  };

  return (
    <FormSheetShell
      tone="danger"
      title={readOnlyNotice ? 'تفاصيل المصروف' : edit ? 'تعديل مصروف' : 'إضافة مصروف'}
      subtitle="مصروف على المشروع"
      amount={amount}
      amountLabel="مبلغ المصروف"
      maxWidth="md"
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={edit ? 'حفظ التعديلات' : 'حفظ المصروف'}
      onDelete={edit && !readOnlyNotice ? onDelete : undefined}
      deleteLabel="حذف المصروف"
      readOnly={!!readOnlyNotice}
    >
      {edit && review && <ExpenseReviewPanel expense={edit} {...review} />}
      {readOnlyNotice && (
        <ProfileCallout tone="info" icon={<LockOutlined sx={{ fontSize: 22 }} />} title="للاطلاع فقط">
          {readOnlyNotice}
        </ProfileCallout>
      )}
      {currentUserBalanceInfo && !readOnlyNotice && <UserBalanceBanner info={currentUserBalanceInfo} userName={userName} />}

      <FormSection title="البيانات الأساسية">
        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="وصف المصروف"
              placeholder="مثال: شراء مواد بناء"
              autoComplete="off"
              error={fieldState.error?.message}
            />
          )}
        />
        {(!readOnlyNotice || hasQuantityLine || edit?.unit) && (
          <ExpenseQuantityBlock
            readOnly={!!readOnlyNotice}
            control={control}
            quantity={quantity}
            unit={measureUnit}
            unitPrice={unitPrice}
            amount={amount}
            defaultOpen={
              expenseHasQuantityLine({ quantity: parseDecimalInput(edit?.quantity), unitPrice: edit?.unitPrice }) ||
              Boolean(edit?.unit)
            }
            onClear={clearQuantity}
          />
        )}
        {hasQuantityLine && !readOnlyNotice && (
          <PriceHint
            expenses={pick.expenses}
            complete={pick.complete}
            description={description}
            category={category}
            unit={measureUnit}
            unitPrice={parseDecimalInput(unitPrice) ?? undefined}
            excludeId={edit?.id}
          />
        )}
        <Controller
          name="amount"
          control={control}
          render={({ field, fieldState }) => (
            <MoneyField
              label={hasQuantityLine ? 'المبلغ الإجمالي (يُحسب من الكمية والسعر)' : 'المبلغ الإجمالي'}
              hint={hasQuantityLine && !readOnlyNotice ? 'يمكنك تعديل المبلغ يدوياً إذا لزم الأمر' : undefined}
              readOnly={!!readOnlyNotice}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              error={fieldState.error?.message}
            />
          )}
        />
        <CustodyOverdraftNotice
          stats={readOnlyNotice ? null : fundStats}
          label={fundLabel}
          amount={amount}
          originalAmount={fundOriginalAmount}
        />
      </FormSection>

      <FormSection title="التصنيف والربط">
        <div className={canLinkWorker ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : undefined}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <FormField label="التصنيف">
                <FormSelect {...field}>
                  {Object.entries(expenseCategories).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            )}
          />
          {canLinkWorker && (
            <Controller
              name="workerId"
              control={control}
              render={({ field }) => (
                <FormField label="العامل (اختياري)">
                  <FormSelect {...field}>
                    <option value="">بدون عامل</option>
                    {clientWorkers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>
              )}
            />
          )}
        </div>
        {!readOnlyNotice && <NewCategoryLink onCreated={(id) => setValue('category', id, { shouldDirty: true, shouldValidate: true })} />}
        {clientPhases.length > 0 && (
          <Controller
            name="phaseId"
            control={control}
            render={({ field }) => (
              <FormField label="مرحلة المشروع (اختياري)">
                <FormSelect {...field}>
                  <option value="">بدون مرحلة</option>
                  {clientPhases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            )}
          />
        )}
      </FormSection>

      <FormSection title="التوثيق">
        <Controller
          name="supplierId"
          control={control}
          render={({ field }) => (
            <SupplierField suppliers={pick.suppliers} value={field.value} onChange={field.onChange} onCreate={pick.create} disabled={!!readOnlyNotice} />
          )}
        />
        <Controller
          name="invoiceNumber"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="رقم الفاتورة (اختياري)"
              placeholder="INV-001"
              dir="ltr"
              className="text-end"
              autoComplete="off"
            />
          )}
        />
        <Controller
          name="date"
          control={control}
          render={({ field, fieldState }) => (
            <FormField label="تاريخ المصروف" error={fieldState.error?.message}>
              <FormDateInput {...field} />
            </FormField>
          )}
        />
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <FormField label="ملاحظات (اختياري)">
              <FormTextArea {...field} rows={2} placeholder="تفاصيل إضافية" />
            </FormField>
          )}
        />
      </FormSection>
    </FormSheetShell>
  );
}
