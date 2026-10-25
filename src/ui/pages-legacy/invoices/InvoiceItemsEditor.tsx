import { Add, DeleteOutline } from '../../../design-system/icons';
import { Amount, Button, IconButton, Input, ListGroup, Textarea } from '../../../design-system/primitives';
import { lineTotal, parseAmount } from './invoiceMath';

/** An invoice line while editing: numbers stay text so partial typing ("12.") is preserved. */
export type DraftItem = { id: string; description: string; quantity: string; unitPrice: string };

export const newDraftItem = (): DraftItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: '1',
  unitPrice: '',
});

export type ItemErrors = { description?: string; quantity?: string };

export const draftItemTotal = (item: DraftItem) => lineTotal(parseAmount(item.quantity), parseAmount(item.unitPrice));

interface InvoiceItemsEditorProps {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  /** Per-item errors, keyed by item id. Only passed once the user tried to save. */
  errors: Record<string, ItemErrors>;
}

export function InvoiceItemsEditor({ items, onChange, errors }: InvoiceItemsEditorProps) {
  const update = (id: string, patch: Partial<DraftItem>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const remove = (id: string) => onChange(items.filter((item) => item.id !== id));

  return (
    <div className="space-y-3">
      <ListGroup>
        {items.map((item, index) => {
          const err = errors[item.id] || {};
          return (
            <div key={item.id} className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-fg-subtle">بند {index + 1}</span>
                {items.length > 1 && (
                  <IconButton
                    label={`حذف البند ${index + 1}`}
                    onClick={() => remove(item.id)}
                    className="-me-2 text-danger-ink hover:text-danger-ink"
                  >
                    <DeleteOutline sx={{ fontSize: 22 }} />
                  </IconButton>
                )}
              </div>
              <Textarea
                label="الوصف"
                placeholder="وصف البند أو الخدمة"
                rows={2}
                value={item.description}
                error={err.description}
                onChange={(e) => update(item.id, { description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Input
                  label="الكمية"
                  calculator="حاسبة الكمية"
                  inputMode="decimal"
                  autoComplete="off"
                  value={item.quantity}
                  error={err.quantity}
                  onChange={(e) => update(item.id, { quantity: e.target.value })}
                />
                <Input
                  label="سعر الوحدة"
                  calculator="حاسبة السعر"
                  calculatorUnit="د.ل"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={item.unitPrice}
                  onChange={(e) => update(item.id, { unitPrice: e.target.value })}
                />
                <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-1">
                  <span className="text-sm font-medium text-fg-subtle">إجمالي البند</span>
                  <div className="flex h-12 items-center justify-between rounded-md bg-surface-sunken px-3.5">
                    <span className="text-xs text-fg-muted lg:hidden">الكمية × السعر</span>
                    <Amount amount={draftItemTotal(item)} className="ms-auto text-md font-bold text-fg" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </ListGroup>
      <Button
        variant="outline"
        block
        leftIcon={<Add sx={{ fontSize: 20 }} />}
        onClick={() => onChange([...items, newDraftItem()])}
      >
        إضافة بند
      </Button>
    </div>
  );
}
