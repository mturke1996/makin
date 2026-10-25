import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Add, PeopleOutline, Search } from '../../design-system/icons';
import { useDataSlice } from '../../stores/useDataStore';
import { useAccess } from '../../core/access/useAccess';
import {
  Button, EmptyState, Input, ListGroup, PageHeader, PageShell, Segmented, Skeleton,
} from '../../design-system/primitives';
import type { Client } from '../../types';
import { ClientFormSheet } from './clients/ClientFormSheet';
import { ClientRow } from './clients/ClientRow';
import { canShowClientFigures } from './clients/clientAccess';
import { buildClientFigures, hasDeficit } from './clients/clientFigures';
import { sumMoney } from './invoices/invoiceMath';
import { formatCurrencyDisplay } from '../../core/utils-formatters';

type TypeFilter = 'all' | 'company' | 'individual';

function ClientsSkeleton() {
  return (
    <ListGroup aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3.5">
          <Skeleton circle width={44} height={44} />
          <div className="flex-1 space-y-2">
            <Skeleton height={14} width="55%" />
            <Skeleton height={11} width="35%" />
          </div>
          <Skeleton height={18} width={64} />
        </div>
      ))}
    </ListGroup>
  );
}

/** «عميل واحد»، «عميلان»، «3 عملاء»، «12 عميلاً». */
function clientCountLabel(n: number): string {
  if (n === 1) return 'عميل واحد';
  if (n === 2) return 'عميلان';
  if (n <= 10) return `${n} عملاء`;
  return `${n} عميلاً`;
}

export const ClientsPage = () => {
  const navigate = useNavigate();
  const { clients, expenses, payments, standaloneDebts, isLoading } = useDataSlice('clients', 'expenses', 'payments', 'standaloneDebts', 'isLoading');
  const access = useAccess();
  const canManage = access.can('clients.manage');
  // Per-client figures need every expense, payment and debt of the client; without all three the rows show identity only.
  const showFigures = canShowClientFigures(access.principal);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const figures = useMemo(
    () =>
      showFigures
        ? buildClientFigures({ clients, expenses: access.listableExpenses(expenses), payments, debts: standaloneDebts })
        : null,
    [showFigures, clients, expenses, payments, standaloneDebts, access]
  );

  const counts = useMemo(
    () => ({
      all: clients.length,
      company: clients.filter((c) => c.type === 'company').length,
      individual: clients.filter((c) => c.type === 'individual').length,
    }),
    [clients]
  );

  const totalRequired = useMemo(
    () =>
      figures
        ? sumMoney(clients.map((c) => figures.get(c.id)).filter((f) => f && hasDeficit(f)).map((f) => f!.required))
        : null,
    [clients, figures]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => typeFilter === 'all' || c.type === typeFilter)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .sort((a, b) => {
        const fa = figures?.get(a.id)?.required ?? 0;
        const fb = figures?.get(b.id)?.required ?? 0;
        return fb - fa || a.name.localeCompare(b.name, 'ar');
      });
  }, [clients, typeFilter, query, figures]);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (client: Client) => {
    setEditing(client);
    setSheetOpen(true);
  };

  // The collection total is a claim about every client's account, so it is only made when it is computable.
  const subtitle =
    clients.length === 0 ? (
      canManage ? 'أضف عملاءك لتتبع مصروفاتهم ودفعاتهم' : 'عملاء الشركة ومشاريعها'
    ) : totalRequired === null ? (
      clientCountLabel(clients.length)
    ) : totalRequired > 0 ? (
      <>
        المطلوب تحصيله{' '}
        <span className="font-semibold text-danger-ink">{formatCurrencyDisplay(totalRequired)}</span>
      </>
    ) : (
      'كل حسابات العملاء مغطاة'
    );

  const showSkeleton = isLoading && clients.length === 0;

  return (
    <PageShell>
      <PageHeader
        title="العملاء"
        subtitle={subtitle}
        actions={
          canManage ? (
            <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
              عميل جديد
            </Button>
          ) : undefined
        }
      />

      {clients.length > 0 && (
        <div className="space-y-3">
          <Input
            aria-label="بحث في العملاء"
            leftIcon={<Search sx={{ fontSize: 20 }} />}
            placeholder="ابحث بالاسم أو رقم الهاتف"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            autoComplete="off"
          />
          <Segmented<TypeFilter>
            aria-label="تصفية العملاء"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'الكل', count: counts.all },
              { value: 'company', label: 'شركات', count: counts.company },
              { value: 'individual', label: 'أفراد', count: counts.individual },
            ]}
          />
        </div>
      )}

      {showSkeleton ? (
        <ClientsSkeleton />
      ) : clients.length === 0 ? (
        <EmptyState
          Icon={PeopleOutline}
          title="لا يوجد عملاء بعد"
          description="العميل هو المشروع أو الجهة التي تُسجَّل عليها المصروفات والدفعات والفواتير."
          action={
            canManage ? (
              <Button variant="secondary" leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={openAdd}>
                أضف أول عميل
              </Button>
            ) : undefined
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          Icon={Search}
          title="لا نتائج مطابقة"
          description={query.trim() ? `لا يوجد عميل يطابق «${query.trim()}».` : 'لا يوجد عملاء في هذا التصنيف.'}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
                setTypeFilter('all');
              }}
            >
              مسح البحث
            </Button>
          }
        />
      ) : (
        <ListGroup>
          {visible.map((client) => (
            <ClientRow
              key={client.id}
              client={client}
              figure={figures ? (figures.get(client.id) ?? { required: 0, remaining: 0, active: false }) : undefined}
              onOpen={() => navigate(`/clients/${client.id}`)}
              onEdit={canManage ? () => openEdit(client) : undefined}
            />
          ))}
        </ListGroup>
      )}

      {canManage && <ClientFormSheet open={sheetOpen} onClose={() => setSheetOpen(false)} client={editing} />}
    </PageShell>
  );
};
