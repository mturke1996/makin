import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Groups, Search } from '@mui/icons-material';
import {
  Amount,
  Avatar,
  Badge,
  Button,
  EmptyState,
  FigureStrip,
  Input,
  ListGroup,
  ListRow,
  PageHeader,
  PageShell,
  Segmented,
  Select,
} from '../../design-system/primitives';
import { useDataStore } from '../../stores/useDataStore';
import { useAccess } from '../../core/access/useAccess';
import {
  buildWorkforce,
  filterWorkforce,
  type WorkforceFilter,
} from '../../core/finance/workforce';
import { summarizeWorkerLedgers } from '../../core/finance/workerLedger';
import { LEDGER_STATUS_META } from '../pages-legacy/client-profile/workers/format';

export function WorkersPage() {
  const { workers, expenses, clients, isLoading } = useDataStore();
  const access = useAccess();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<WorkforceFilter>('owed');
  const [clientId, setClientId] = useState('');
  const entries = useMemo(
    () => buildWorkforce(workers, expenses, clients),
    [workers, expenses, clients],
  );
  const shown = useMemo(
    () => filterWorkforce(entries, filter, clientId, query),
    [entries, filter, clientId, query],
  );
  const totals = useMemo(
    () => summarizeWorkerLedgers(entries.map((entry) => entry.ledger)),
    [entries],
  );
  const hasFilters = !!query || !!clientId || filter !== 'all';
  return (
    <PageShell>
      <PageHeader
        title="مركز العمال"
        subtitle="مستحقات العمال والمقاولين في جميع المشاريع"
        actions={
          access.can('clients.view') ? (
            <Button variant="outline" onClick={() => navigate('/clients')}>
              {access.can('workers.manage') ? 'اختيار مشروع وإضافة عامل' : 'مشاريع العملاء'}
            </Button>
          ) : undefined
        }
      />
      <FigureStrip
        figures={[
          {
            label: 'المستحق للعمال',
            value: <Amount amount={totals.owed} tone="danger" />,
            hint: 'يشمل المؤرشفين',
          },
          { label: 'المدفوع', value: <Amount amount={totals.paid} /> },
        ]}
      />
      {totals.overpaid > 0 && (
        <p className="text-xs text-warning-ink">
          زيادة مدفوعة عبر العمال: <Amount amount={totals.overpaid} />، لا تُخصم
          من مستحقات العمال الآخرين.
        </p>
      )}
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="بحث في العمال"
            placeholder="اسم العامل أو المهنة أو المشروع"
            leftIcon={<Search sx={{ fontSize: 20 }} />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
          />
          <Select
            label="المشروع"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">كل المشاريع</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </div>
        <Segmented<WorkforceFilter>
          aria-label="حالة حساب العمال"
          layout="scroll"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'owed', label: 'لهم مستحقات' },
            { value: 'current', label: 'الحاليون' },
            { value: 'settled', label: 'مسددون' },
            { value: 'overpaid', label: 'زيادة مدفوعة' },
            { value: 'archived', label: 'الأرشيف' },
            { value: 'all', label: 'الجميع' },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-xs text-fg-subtle">
          عرض {shown.length} من {entries.length} عامل
        </p>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery('');
              setClientId('');
              setFilter('all');
            }}
          >
            عرض الجميع
          </Button>
        )}
      </div>
      {isLoading && !entries.length ? (
        <p role="status" className="py-8 text-center text-fg-subtle">
          جارٍ تحميل حسابات العمال…
        </p>
      ) : !shown.length ? (
        <EmptyState
          Icon={Groups}
          title={
            entries.length
              ? 'لا يوجد عمال بهذه الشروط'
              : 'سجّل عمال مشاريعك في مكان واحد'
          }
          description={
            entries.length
              ? 'غيّر البحث أو اختر عرض الجميع.'
              : 'افتح ملف العميل ثم قسم العمال وأضف الاتفاق والدفعات. يظهر هنا المستحق عبر جميع المشاريع.'
          }
          action={entries.length || access.can('clients.view') ? (
            <Button
              variant="outline"
              onClick={() => {
                if (entries.length) {
                  setFilter('all');
                  setQuery('');
                  setClientId('');
                } else navigate('/clients');
              }}
            >
              {entries.length ? 'عرض الجميع' : 'فتح المشاريع'}
            </Button>
          ) : undefined}
        />
      ) : (
        <ListGroup>
          {shown.map(({ worker, ledger, clientName, clientAvailable }) => (
            <ListRow
              key={worker.id}
              leading={<Avatar name={worker.name} />}
              title={worker.name}
              subtitle={`${worker.jobType || 'عامل / مقاول'} · ${clientName}`}
              meta={
                <>
                  <Badge tone={LEDGER_STATUS_META[ledger.status].tone}>
                    {LEDGER_STATUS_META[ledger.status].label}
                  </Badge>
                  {worker.archivedAt && <Badge tone="neutral">مؤرشف</Badge>}
                </>
              }
              trailing={
                <div className="text-end">
                  <p className="text-2xs text-fg-muted">
                    {ledger.remaining < 0 ? 'زيادة مدفوعة' : 'المستحق'}
                  </p>
                  <Amount
                    amount={Math.abs(ledger.remaining)}
                    className="text-lg font-bold"
                    tone={
                      ledger.remaining > 0
                        ? 'danger'
                        : ledger.remaining < 0
                          ? 'warning'
                          : 'success'
                    }
                  />
                </div>
              }
              chevron={clientAvailable && access.can('clients.view')}
              onClick={
                clientAvailable && access.can('clients.view')
                  ? () =>
                      navigate(
                        `/clients/${worker.clientId}?section=workers&worker=${encodeURIComponent(worker.id)}`,
                      )
                  : undefined
              }
            />
          ))}
        </ListGroup>
      )}
    </PageShell>
  );
}
