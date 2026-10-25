import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, ExpandMore } from '../../design-system/icons';
import { Avatar, Button, Input, ListGroup, ListRow, Sheet } from '../../design-system/primitives';
import type { Client } from '../../types';
import { matchesQuery } from './quickExpenseLogic';

interface ClientChoiceProps {
  clients: Client[];
  selectedId: string;
  onOpenPicker: () => void;
  loading: boolean;
  open: boolean;
}

/** A single explicit field always opens the complete client list. */
export function ClientChoice({ clients, selectedId, onOpenPicker, loading, open }: ClientChoiceProps) {
  const client = clients.find((entry) => entry.id === selectedId);
  return (
    <Button
      block variant="outline" onClick={onOpenPicker}
      aria-haspopup="dialog" aria-expanded={open} aria-label={`اختيار العميل: ${client?.name ?? 'لم يتم الاختيار'}`}
      disabled={clients.length === 0}
      rightIcon={<ExpandMore aria-hidden sx={{ fontSize: 20 }} />}
      className="min-h-14 text-start [&>span]:flex-1 [&>span]:justify-start"
    >
      <span className="min-w-0 text-start">
        <span className="block break-words font-semibold">{client?.name ?? (loading ? 'جارٍ تحميل العملاء…' : clients.length ? 'اختر العميل / المشروع' : 'لا يوجد عملاء بعد')}</span>
        <span className="mt-0.5 block text-xs font-normal text-fg-muted">كل العملاء ({clients.length})، بحث واختيار</span>
      </span>
    </Button>
  );
}

interface ClientPickerProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** All available clients, alphabetically, without a recent-client limit. */
export function ClientPicker({ open, onClose, clients, selectedId, onSelect }: ClientPickerProps) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    // A keyboard on a phone would cover the list: focus the search box only where there is a pointer.
    const fine = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;
    if (fine) {
      const timer = window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 80);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const shown = useMemo(() => [...clients]
    .filter((client) => matchesQuery(query.trim(), client.name, client.phone, client.address))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar')), [clients, query]);

  const choose = (id: string) => {
    onSelect(id);
    onClose();
  };

  const row = (c: Client) => (
    <ListRow
      key={c.id}
      density="compact"
      leading={<Avatar name={c.name} shape="entity" />}
      title={c.name}
      subtitle={c.address || undefined}
      trailing={
        c.id === selectedId ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-ink">
            <Check aria-hidden sx={{ fontSize: 20 }} />
            المحدد
          </span>
        ) : undefined
      }
      aria-current={c.id === selectedId ? 'true' : undefined}
      onClick={() => choose(c.id)}
    />
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      mobile="bottom"
      maxWidth="sm"
      title="كل العملاء"
      subtitle={`اختر العميل / المشروع من ${clients.length} عميل`}
      headerExtras={
        <Input
          ref={searchRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label="بحث عن عميل"
          placeholder="ابحث بالاسم أو الهاتف"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search aria-hidden sx={{ fontSize: 22 }} />}
        />
      }
    >
      <div className="min-h-[50dvh] space-y-3 px-4 py-4 lg:px-6">
        <p role="status" className="text-xs text-fg-muted">عرض {shown.length} من {clients.length} عميل</p>
        {shown.length ? <ListGroup>{shown.map(row)}</ListGroup> : <p className="px-2 py-10 text-center text-sm text-fg-subtle">لا يوجد عميل مطابق. جرّب الاسم أو الهاتف أو الموقع.</p>}
      </div>
    </Sheet>
  );
}
