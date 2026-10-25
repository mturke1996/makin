import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Input, Select } from '../../../design-system/primitives';
import { findSupplierByName } from '../../../core/finance/supplierLedger';
import type { Supplier } from '../../../types';

const NEW = '__new__';

interface Props {
  suppliers: Supplier[];
  value: string;
  onChange: (supplierId: string) => void;
  /** Adds a supplier to the directory (whoever records expenses may). Omitted: the list is only picked from. */
  onCreate?: (name: string) => Promise<Supplier>;
  disabled?: boolean;
}

/** Who the material was bought from: pick from the directory, or add a new supplier without leaving the form. */
export function SupplierField({ suppliers, value, onChange, onCreate, disabled }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const live = suppliers.filter((s) => !s.archivedAt || s.id === value).sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  const create = async () => {
    const wanted = name.trim();
    if (!wanted || !onCreate) return;
    const existing = findSupplierByName(suppliers, wanted);
    if (existing) {
      onChange(existing.id);
      toast('هذا المورّد موجود في الدليل، اخترناه لك');
    } else {
      setBusy(true);
      try {
        onChange((await onCreate(wanted)).id);
      } catch {
        /* the store already told the person */
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setAdding(false);
    setName('');
  };

  return (
    <div className="space-y-2">
      <Select
        label="المورّد (اختياري)"
        value={adding ? NEW : value}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === NEW) setAdding(true);
          else {
            setAdding(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">بدون مورّد</option>
        {live.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
        {onCreate && <option value={NEW}>＋ إضافة مورّد جديد…</option>}
      </Select>
      {adding && (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input label="اسم المورّد الجديد" value={name} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void create(); } }} />
          </div>
          <Button type="button" className="h-11" loading={busy} disabled={!name.trim()} onClick={() => void create()}>إضافة</Button>
        </div>
      )}
    </div>
  );
}
