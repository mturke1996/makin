import { useEffect, useState } from 'react';
import { Button, Input, Select, Sheet } from '../../../design-system/primitives';
import { formatCurrencyDisplay } from '../../../core/utils-formatters';
import { parseAmount } from './invoiceMath';
import type { Payment } from '../../../types';

type Method = Extract<Payment['paymentMethod'], 'cash' | 'bank_transfer' | 'check' | 'mobile_payment'>;

export interface PaymentDraft {
  amount: number;
  method: Method;
  notes: string;
}

interface PaymentSheetProps {
  open: boolean;
  onClose: () => void;
  invoiceNumber: string;
  remaining: number;
  /** Resolves when saved (the sheet then closes and clears), rejects to keep what was typed. */
  onSubmit: (draft: PaymentDraft) => Promise<void>;
}

/** Record a payment against an invoice. Amount is checked against what is still owed. */
export function PaymentSheet({ open, onClose, invoiceNumber, remaining, onSubmit }: PaymentSheetProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Method>('cash');
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setTried(false);
  }, [open]);

  const value = parseAmount(amount);
  const error = !(value > 0)
    ? 'أدخل مبلغاً أكبر من صفر'
    : value > remaining + 0.01
      ? `المبلغ أكبر من المتبقي (${formatCurrencyDisplay(remaining)})`
      : undefined;

  const submit = async () => {
    setTried(true);
    if (error) return;
    setSaving(true);
    try {
      await onSubmit({ amount: value, method, notes: notes.trim() });
      setAmount('');
      setNotes('');
      setMethod('cash');
      onClose();
    } catch {
      /* the store showed the error; keep the typed values */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      mobile="bottom"
      maxWidth="sm"
      title="تسجيل دفعة"
      subtitle={
        <>
          فاتورة <bdi dir="ltr">{invoiceNumber}</bdi> · المتبقي <bdi dir="ltr">{formatCurrencyDisplay(remaining)}</bdi>
        </>
      }
      footer={
        <Button block loading={saving} onClick={submit}>
          تسجيل الدفعة
        </Button>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-5 p-4 lg:p-6"
      >
        <div className="space-y-2">
          <Input
            label="مبلغ الدفعة"
            calculator="حاسبة الدفعة"
            calculatorUnit="د.ل"
            inputMode="decimal"
            autoComplete="off"
            placeholder={String(remaining)}
            fieldSize="lg"
            value={amount}
            error={tried ? error : undefined}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button variant="secondary" size="sm" className="min-h-11" onClick={() => setAmount(String(remaining))}>
            المتبقي كاملاً
          </Button>
        </div>
        <Select label="طريقة الدفع" value={method} onChange={(e) => setMethod(e.target.value as Method)}>
          <option value="cash">نقدي</option>
          <option value="bank_transfer">تحويل بنكي</option>
          <option value="check">شيك</option>
          <option value="mobile_payment">دفع إلكتروني</option>
        </Select>
        <Input label="ملاحظات" hint="اختياري" autoComplete="off" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </form>
    </Sheet>
  );
}
