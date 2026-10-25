import { createElement, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Add, Search, Storefront, TrendingUp } from '../../design-system/icons';
import { Amount, Avatar, Badge, Button, EmptyState, FigureStrip, Input, ListGroup, PageHeader, PageShell, Segmented } from '../../design-system/primitives';
import { useAccess } from '../../core/access/useAccess';
import { buildPriceBook, summarizeMaterial, type MaterialSummary } from '../../core/finance/priceTracking';
import { buildSupplierRows, unlinkedPurchases, type SupplierRow } from '../../core/finance/supplierLedger';
import { formatDate, formatMeasureUnit } from '../../core/utils-formatters';
import { useAuthStore } from '../../stores/useAuthStore';
import { useDataSlice } from '../../stores/useDataStore';
import { ConfirmDeleteModal, FigureStripSkeleton, ListSkeleton } from '../pages-legacy/money/moneyUi';
import { MaterialSheet } from './suppliers/MaterialSheet';
import { SupplierFormSheet, type SupplierFormValues } from './suppliers/SupplierFormSheet';
import { SupplierSheet } from './suppliers/SupplierSheet';
import type { Supplier } from '../../types';

type Tab = 'suppliers' | 'prices';

/** Who the company buys from, how much, and what the materials cost over time (with the early warning on a price rise). */
export const SuppliersPage = () => {
  const access = useAccess();
  const user = useAuthStore((s) => s.user);
  const { suppliers, expenses, clients, isLoading, addSupplier, updateSupplier, deleteSupplier } = useDataSlice('suppliers', 'expenses', 'clients', 'isLoading', 'addSupplier', 'updateSupplier', 'deleteSupplier');
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'prices' ? 'prices' : 'suppliers';
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<{ edit: Supplier | null } | null>(null);
  const [material, setMaterial] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const canAdd = access.can('expenses.create');
  const canEdit = access.can('expenses.edit.all');

  const clientNames = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const clientName = (id: string) => clientNames.get(id) || 'مشروع';

  const rows = useMemo(() => buildSupplierRows(suppliers, expenses), [suppliers, expenses]);
  const materials = useMemo(
    () =>
      buildPriceBook(expenses)
        .map(summarizeMaterial)
        .sort((a, b) => Number(b.high) - Number(a.high) || b.latest.date.localeCompare(a.latest.date)),
    [expenses],
  );

  const q = search.trim().toLowerCase();
  const shownRows = rows.filter((r) => !q || r.supplier.name.toLowerCase().includes(q) || (r.supplier.supplies ?? '').toLowerCase().includes(q));
  const shownMaterials = materials.filter((m) => !q || m.material.name.toLowerCase().includes(q));
  const open = openId ? rows.find((r) => r.supplier.id === openId) ?? null : null;
  const openMaterial = material ? materials.find((m) => m.material.key === material) ?? null : null;
  const loading = isLoading && expenses.length === 0 && suppliers.length === 0;
  const totalBought = rows.reduce((sum, r) => sum + r.total, 0);
  const risen = materials.filter((m) => m.high).length;

  const setTab = (next: Tab) => {
    setSearch('');
    setParams(next === 'prices' ? { tab: 'prices' } : {}, { replace: true });
  };

  const save = async (values: SupplierFormValues) => {
    const now = new Date().toISOString();
    const fields = { name: values.name, phone: values.phone.trim() || undefined, supplies: values.supplies.trim() || undefined, notes: values.notes.trim() || undefined };
    if (form?.edit) {
      // A cleared optional field is removed (null), not left as it was.
      const cleared = null as unknown as undefined;
      const edit = form.edit;
      await updateSupplier(edit.id, {
        name: fields.name,
        phone: fields.phone ?? (edit.phone ? cleared : undefined),
        supplies: fields.supplies ?? (edit.supplies ? cleared : undefined),
        notes: fields.notes ?? (edit.notes ? cleared : undefined),
        updatedAt: now,
      });
    } else {
      await addSupplier({ id: crypto.randomUUID(), ...fields, createdAt: now, updatedAt: now, createdBy: user?.displayName || user?.email || 'المستخدم' });
    }
    setForm(null);
  };

  const statement = async (row: SupplierRow) => {
    setPdfBusy(true);
    try {
      const [{ downloadPdf }, { SupplierStatementPDF }, { supplierExpenses }] = await Promise.all([
        import('../../features/pdf/pdfService'),
        import('../../features/pdf/SupplierStatementPDF'),
        import('../../core/finance/supplierLedger'),
      ]);
      await downloadPdf(createElement(SupplierStatementPDF, { supplier: row.supplier, row, expenses: supplierExpenses(row.supplier.id, expenses), clientName }), `كشف-${row.supplier.name}`);
    } catch {
      toast.error('تعذّر إنشاء كشف المورّد');
    } finally {
      setPdfBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await deleteSupplier(confirmDelete.id);
      setConfirmDelete(null);
      setForm(null);
      setOpenId(null);
    } catch {
      /* the store already told the person */
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="المورّدون والأسعار"
        subtitle="من تشتري منه، وبكم تشتري"
        actions={canAdd ? <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={() => setForm({ edit: null })}>مورّد جديد</Button> : undefined}
      />

      {loading ? (
        <>
          <FigureStripSkeleton />
          <ListSkeleton />
        </>
      ) : (
        <>
          <FigureStrip
            figures={[
              { label: 'مشتريات من المورّدين', value: <Amount amount={totalBought} /> },
              { label: 'عدد المورّدين', value: suppliers.length },
              { label: 'مواد ارتفع سعرها', value: risen, tone: risen > 0 ? 'warning' : 'neutral', hint: risen > 0 ? 'أعلى من المعتاد' : undefined },
              { label: 'مشتريات بلا مورّد', value: unlinkedPurchases(expenses), hint: 'مواد بكمية وسعر' },
            ]}
          />

          <Segmented<Tab>
            aria-label="أقسام المورّدين"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'suppliers', label: 'المورّدون', count: suppliers.length },
              { value: 'prices', label: 'أسعار المواد', count: materials.length },
            ]}
          />
          <Input leftIcon={<Search sx={{ fontSize: 20 }} />} aria-label="بحث" placeholder={tab === 'suppliers' ? 'ابحث باسم المورّد أو ما يورّده' : 'ابحث باسم المادة'} value={search} onChange={(e) => setSearch(e.target.value)} />

          {tab === 'suppliers' ? (
            suppliers.length === 0 ? (
              <EmptyState
                Icon={Storefront}
                title="لا مورّدين بعد"
                description="أضف من تشتري منهم المواد، ثم اخترهم عند تسجيل المصروف، فتعرف كم اشتريت من كل واحد وبأي سعر."
                action={canAdd ? <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={() => setForm({ edit: null })}>أضف أول مورّد</Button> : undefined}
              />
            ) : shownRows.length === 0 ? (
              <EmptyState Icon={Search} title="لا نتائج مطابقة" description="غيّر كلمة البحث." />
            ) : (
              <ListGroup>
                {shownRows.map((r) => (
                  <button key={r.supplier.id} type="button" onClick={() => setOpenId(r.supplier.id)} className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3.5 text-start transition-colors duration-fast hover:bg-surface-hover focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]">
                    <Avatar name={r.supplier.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-fg">{r.supplier.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-fg-muted">
                        {[r.supplier.supplies, r.count > 0 ? `${r.count} ${r.count === 1 ? 'عملية' : 'عمليات'}` : 'لا مشتريات بعد', r.lastDate ? `آخرها ${formatDate(r.lastDate)}` : ''].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <Amount amount={r.total} className="flex-none text-md font-bold" />
                  </button>
                ))}
              </ListGroup>
            )
          ) : materials.length === 0 ? (
            <EmptyState
              Icon={TrendingUp}
              title="لا أسعار مسجلة بعد"
              description="تظهر هنا المواد التي سجّلت لها كمية وسعر وحدة في المصروفات. مع تكرار الشراء يتبيّن سعرها المعتاد، وينبّهك النظام إذا ارتفع."
            />
          ) : shownMaterials.length === 0 ? (
            <EmptyState Icon={Search} title="لا نتائج مطابقة" description="غيّر كلمة البحث." />
          ) : (
            <ListGroup>
              {shownMaterials.map((m) => (
                <MaterialRow key={m.material.key} summary={m} onOpen={() => setMaterial(m.material.key)} />
              ))}
            </ListGroup>
          )}
        </>
      )}

      {open && (
        <SupplierSheet
          row={open}
          expenses={expenses}
          clientName={clientName}
          busy={pdfBusy}
          onClose={() => setOpenId(null)}
          onEdit={canEdit ? () => setForm({ edit: open.supplier }) : undefined}
          onStatement={() => void statement(open)}
        />
      )}
      {form && (
        <SupplierFormSheet
          edit={form.edit}
          suppliers={suppliers}
          onClose={() => setForm(null)}
          onSubmit={save}
          onDelete={canEdit && form.edit ? () => setConfirmDelete(form.edit) : undefined}
        />
      )}
      {openMaterial && <MaterialSheet summary={openMaterial} clientName={clientName} onClose={() => setMaterial(null)} />}
      <ConfirmDeleteModal
        open={!!confirmDelete}
        title="حذف هذا المورّد؟"
        description={confirmDelete ? `سيُحذف «${confirmDelete.name}» من الدليل. تبقى مصروفاته كما هي وبقي اسمه عليها، لكنها لا تُربط به بعد ذلك.` : ''}
        confirmLabel="حذف المورّد"
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(null)}
      />
    </PageShell>
  );
};

function MaterialRow({ summary, onOpen }: { summary: MaterialSummary; onOpen: () => void }) {
  const { material, latest, change, high } = summary;
  const percent = change === null ? null : Math.round(change * 100);
  return (
    <button type="button" onClick={onOpen} className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3.5 text-start transition-colors duration-fast hover:bg-surface-hover focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-fg">{material.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
          <span className="tabular-nums">{formatDate(latest.date)}</span>
          {material.unit && <span>للـ {formatMeasureUnit(material.unit)}</span>}
          <span>{material.points.length} {material.points.length === 1 ? 'شراء' : 'مشتريات'}</span>
          {summary.cheapest && <span>الأرخص: {summary.cheapest.name}</span>}
        </span>
      </span>
      <span className="flex-none text-end">
        <Amount amount={latest.unitPrice} tone={high ? 'danger' : 'inherit'} className="text-md font-bold" />
        {percent !== null && percent !== 0 && (
          <Badge tone={high ? 'danger' : percent < 0 ? 'success' : 'neutral'} className="mt-1 block w-fit ms-auto">
            <bdi dir="ltr">{percent > 0 ? '+' : ''}{percent}%</bdi>
          </Badge>
        )}
      </span>
    </button>
  );
}
