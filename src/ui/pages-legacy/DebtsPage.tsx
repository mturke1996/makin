import { useMemo, useState } from 'react';
import { Add, RequestQuote, Search } from '../../design-system/icons';
import { useDataStore } from '../../stores/useDataStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { clearField } from '../../services/firebaseService';
import { useAccess } from '../../core/access/useAccess';
import { formatCurrencyDisplay } from '../../core/utils-formatters';
import {
  Amount,
  Button,
  EmptyState,
  FigureStrip,
  Input,
  ListGroup,
  PageHeader,
  PageShell,
  Segmented,
} from '../../design-system/primitives';
import type { StandaloneDebt } from '../../types';
import { DebtRow } from './money/DebtRow';
import { DebtFormSheet, type DebtFormData } from './money/DebtFormSheet';
import { DebtPaySheet } from './money/DebtPaySheet';
import { compareDebts, getDebtState, type DebtStatus } from './money/debtState';
import { ConfirmDeleteModal, FigureStripSkeleton, ListSkeleton } from './money/moneyUi';
import { matchesQuery, sumAmounts, toMilli } from './money/moneyUtils';
import { deriveDebtStatus } from '../../core/finance/invoicePayments';

type TypeView = 'all' | 'client' | 'external';
type StatusFilter = 'all' | DebtStatus;

const TYPE_LABEL: Record<TypeView, string> = { all: 'الكل', client: 'ديون العملاء', external: 'ديون خارجية' };

export const DebtsPage = () => {
  const {
    standaloneDebts, clients, debtParties, isLoading,
    addStandaloneDebt, updateStandaloneDebt, payStandaloneDebt, deleteStandaloneDebt,
  } = useDataStore();
  const { user } = useAuthStore();
  const access = useAccess();
  const canManage = access.can('debts.manage');
  const canRemove = access.can('debts.delete');
  const canPickClient = access.can('clients.view');

  const [typeView, setTypeView] = useState<TypeView>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState<{ open: boolean; edit: StandaloneDebt | null }>({ open: false, edit: null });
  const [pay, setPay] = useState<{ open: boolean; debt: StandaloneDebt | null }>({ open: false, debt: null });
  const [pendingDelete, setPendingDelete] = useState<StandaloneDebt | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(
    () => standaloneDebts.map((debt) => ({ debt, state: getDebtState(debt) })),
    [standaloneDebts]
  );

  const inType = useMemo(() => rows.filter((r) => typeView === 'all' || r.debt.partyType === typeView), [rows, typeView]);
  const inScope = useMemo(
    () => inType.filter((r) => matchesQuery(search, r.debt.partyName, r.debt.description)),
    [inType, search]
  );
  const visible = useMemo(
    () =>
      inScope
        .filter((r) => status === 'all' || r.state.status === status)
        .sort((a, b) => compareDebts(a.debt, b.debt)),
    [inScope, status]
  );

  const count = (pred: (r: (typeof rows)[number]) => boolean) => inScope.filter(pred).length;
  const typeOptions = (['all', 'client', 'external'] as TypeView[]).map((value) => ({
    value,
    label: TYPE_LABEL[value],
    count: rows.filter((r) => value === 'all' || r.debt.partyType === value).length,
  }));
  const statusOptions: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'الكل', count: inScope.length },
    { value: 'overdue', label: 'متأخرة', count: count((r) => r.state.status === 'overdue') },
    { value: 'unpaid', label: 'غير مسددة', count: count((r) => r.state.status === 'unpaid') },
    { value: 'partially_paid', label: 'مسددة جزئياً', count: count((r) => r.state.status === 'partially_paid') },
    { value: 'paid', label: 'مسددة', count: count((r) => r.state.status === 'paid') },
  ];

  const totals = useMemo(
    () => ({
      remaining: sumAmounts(inType.map((r) => r.state.remaining)),
      paid: sumAmounts(inType.map((r) => r.state.paid)),
      amount: sumAmounts(inType.map((r) => r.debt.amount)),
      overdue: inType.filter((r) => r.state.status === 'overdue').length,
    }),
    [inType]
  );

  const payState = useMemo(() => (pay.debt ? getDebtState(pay.debt) : null), [pay.debt]);

  const openAdd = () => setSheet({ open: true, edit: null });
  const openEdit = (debt: StandaloneDebt) => setSheet({ open: true, edit: debt });
  const closeSheet = () => setSheet((s) => ({ ...s, open: false }));

  const handleSubmit = async (data: DebtFormData) => {
    let partyName = data.partyName;
    if (data.partyType === 'client') {
      partyName = clients.find((c) => c.id === data.clientId)?.name || partyName;
    }
    const partyId =
      data.partyType === 'external' ? debtParties.find((p) => p.name.trim() === partyName)?.id : undefined;
    const common = {
      partyType: data.partyType,
      partyName,
      clientId: data.partyType === 'client' ? data.clientId : undefined,
      description: data.description,
      amount: data.amount,
      date: data.date,
      dueDate: data.dueDate || undefined,
      notes: data.notes,
    };

    if (sheet.edit) {
      const paidAmount = Math.min(toMilli(sheet.edit.paidAmount || 0), toMilli(data.amount)) / 1000;
      // Switching party type or clearing the due date must REMOVE the old field, not leave it behind
      // (a leftover clientId would keep counting this debt in that client's totals).
      await updateStandaloneDebt(sheet.edit.id, {
        ...common,
        clientId: data.partyType === 'client' ? data.clientId : clearField(),
        dueDate: data.dueDate || clearField(),
        ...(partyId ? { partyId } : data.partyType === 'client' ? { partyId: clearField() } : {}),
        paidAmount,
        remainingAmount: Math.max(0, toMilli(data.amount) - toMilli(paidAmount)) / 1000,
        status: deriveDebtStatus(data.amount, paidAmount, data.dueDate || undefined),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const now = new Date().toISOString();
      await addStandaloneDebt({
        id: crypto.randomUUID(),
        ...common,
        ...(partyId ? { partyId } : {}),
        paidAmount: 0,
        remainingAmount: data.amount,
        status: deriveDebtStatus(data.amount, 0, data.dueDate || undefined),
        createdAt: now,
        updatedAt: now,
        createdBy: user?.displayName || 'غير معروف',
      });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteStandaloneDebt(pendingDelete.id);
      setPendingDelete(null);
      closeSheet();
    } catch {
      /* toasted by the store */
    } finally {
      setDeleting(false);
    }
  };

  const filtering = !!search.trim() || status !== 'all';
  const pendingState = pendingDelete ? getDebtState(pendingDelete) : null;

  return (
    <PageShell>
      <PageHeader
        title="الديون"
        subtitle="ما عليك لموردين وأطراف خارجية، وما على العملاء"
        actions={
          canManage ? (
            <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
              دين جديد
            </Button>
          ) : undefined
        }
      />

      {isLoading && standaloneDebts.length === 0 ? (
        <>
          <FigureStripSkeleton />
          <ListSkeleton rows={4} />
        </>
      ) : standaloneDebts.length === 0 ? (
        <EmptyState
          Icon={RequestQuote}
          title="لا توجد ديون مسجلة"
          description={
            canManage
              ? 'سجّل دَيناً على عميل أو لطرف خارجي، وتابع المسدد والمتبقي وتاريخ الاستحقاق من هنا.'
              : 'الديون على العملاء والأطراف الخارجية وتواريخ استحقاقها تظهر هنا عند تسجيلها.'
          }
          action={
            canManage ? (
              <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
                سجّل أول دين
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Segmented<TypeView> aria-label="نوع الدين" options={typeOptions} value={typeView} onChange={setTypeView} />

          <FigureStrip
            figures={[
              { label: 'المتبقي', value: <Amount amount={totals.remaining} tone="danger" />, tone: 'danger' },
              { label: 'المسدد', value: <Amount amount={totals.paid} tone="success" />, tone: 'success' },
              { label: 'إجمالي الديون', value: <Amount amount={totals.amount} /> },
              {
                label: 'ديون متأخرة',
                value: totals.overdue,
                tone: totals.overdue > 0 ? 'danger' : 'neutral',
              },
            ]}
          />

          <div className="space-y-3">
            <Input
              leftIcon={<Search sx={{ fontSize: 20 }} />}
              placeholder="بحث باسم الطرف أو الوصف"
              aria-label="بحث في الديون"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Segmented<StatusFilter>
              layout="scroll"
              aria-label="حالة الدين"
              options={statusOptions}
              value={status}
              onChange={setStatus}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              Icon={Search}
              title={
                filtering
                  ? 'لا نتائج مطابقة'
                  : typeView === 'client'
                    ? 'لا توجد ديون على العملاء'
                    : 'لا توجد ديون خارجية'
              }
              description={
                filtering
                  ? 'غيّر كلمة البحث أو الحالة لرؤية ديون أخرى.'
                  : canManage
                    ? 'اضغط «دين جديد» وحدد نوع الطرف لتسجيل أول دين هنا.'
                    : undefined
              }
              action={
                filtering ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('');
                      setStatus('all');
                    }}
                  >
                    إزالة التصفية
                  </Button>
                ) : canManage ? (
                  <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
                    دين جديد
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ListGroup>
              {visible.map(({ debt, state }) => (
                <DebtRow
                  key={debt.id}
                  debt={debt}
                  state={state}
                  showType={typeView === 'all'}
                  onEdit={canManage ? () => openEdit(debt) : undefined}
                  onPay={canManage ? () => setPay({ open: true, debt }) : undefined}
                  onDelete={canRemove ? () => setPendingDelete(debt) : undefined}
                />
              ))}
            </ListGroup>
          )}
        </>
      )}

      {canManage && (
        <>
          <DebtFormSheet
            open={sheet.open}
            edit={sheet.edit}
            clients={clients}
            parties={debtParties}
            canPickClient={canPickClient}
            onClose={closeSheet}
            onSubmit={handleSubmit}
            onDelete={canRemove ? (d) => setPendingDelete(d) : undefined}
          />

          <DebtPaySheet
            open={pay.open}
            debt={pay.debt}
            state={payState}
            onClose={() => setPay((p) => ({ ...p, open: false }))}
            onPay={(debt, amount) => payStandaloneDebt(debt.id, amount)}
          />
        </>
      )}

      <ConfirmDeleteModal
        open={!!pendingDelete}
        title="حذف هذا الدين؟"
        description={
          pendingDelete && pendingState
            ? `سيُحذف دين ${pendingDelete.partyName}${pendingDelete.description ? ` («${pendingDelete.description}»)` : ''} بقيمة ${formatCurrencyDisplay(pendingDelete.amount)}، منها ${formatCurrencyDisplay(pendingState.paid)} مسدد. لا يمكن التراجع.`
            : ''
        }
        confirmLabel="حذف الدين"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </PageShell>
  );
};

