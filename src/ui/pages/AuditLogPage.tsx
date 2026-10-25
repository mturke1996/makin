import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Close, History, Lock, Search } from '@mui/icons-material';
import { useAuditStore } from '../../stores/useAuditStore';
import { useAccess } from '../../core/access/useAccess';
import type { AuditAction, AuditLogEntry } from '../../types';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  ListGroup,
  PageHeader,
  PageShell,
  Segmented,
  Skeleton,
} from '../../design-system/primitives';

const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'إنشاء',
  update: 'تحديث',
  delete: 'حذف',
  export: 'تصدير',
  pay: 'سداد',
  other: 'أخرى',
};

/** The tone says what kind of change it was; deletes are the only red. */
const ACTION_TONE: Record<AuditAction, 'success' | 'info' | 'danger' | 'brand' | 'neutral'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  pay: 'brand',
  export: 'neutral',
  other: 'neutral',
};

const ENTITY_LABELS: Record<string, string> = {
  client: 'عميل',
  invoice: 'فاتورة',
  payment: 'دفعة',
  expense: 'مصروف',
  debt: 'دين',
  worker: 'عامل',
  balance: 'عهدة',
  phase: 'مرحلة',
  boq: 'BOQ',
  site_report: 'تقرير موقع',
  letter: 'خطاب',
  user: 'مستخدم',
  record: 'سجل',
};

type ActionFilter = 'all' | AuditAction;

const timeFormat = new Intl.DateTimeFormat('ar-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long' });

function dayKey(iso: string): string {
  const d = dayjs(iso);
  return d.isValid() ? d.format('YYYY-MM-DD') : 'unknown';
}

function dayLabel(key: string): string {
  if (key === 'unknown') return 'تاريخ غير معروف';
  const d = dayjs(key);
  const today = dayjs().startOf('day');
  if (d.isSame(today, 'day')) return 'اليوم';
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'أمس';
  return `${weekdayFormat.format(d.toDate())} ${d.format('DD/MM/YYYY')}`;
}

/** Entries are already newest-first; keep that order inside each day. */
function groupByDay(logs: AuditLogEntry[]): { key: string; items: AuditLogEntry[] }[] {
  const groups: { key: string; items: AuditLogEntry[] }[] = [];
  for (const log of logs) {
    const key = dayKey(log.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(log);
    else groups.push({ key, items: [log] });
  }
  return groups;
}

export function AuditLogPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAccess();
  const { logs, isLoading, subscribe } = useAuditStore();
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<ActionFilter>('all');

  useEffect(() => {
    if (!isAdmin) return;
    return subscribe();
  }, [isAdmin, subscribe]);

  /** Search narrows first, so the chip counts always match what a tap would show. */
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.summary.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q)
    );
  }, [logs, query]);

  const filtered = useMemo(
    () => (action === 'all' ? searched : searched.filter((l) => l.action === action)),
    [searched, action]
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const filterOptions = useMemo(() => {
    const counts = new Map<AuditAction, number>();
    for (const l of searched) counts.set(l.action, (counts.get(l.action) || 0) + 1);
    const present = (Object.keys(ACTION_LABELS) as AuditAction[]).filter((a) => counts.has(a) || a === action);
    return [
      { value: 'all' as ActionFilter, label: 'الكل', count: searched.length },
      ...present.map((a) => ({ value: a as ActionFilter, label: ACTION_LABELS[a], count: counts.get(a) || 0 })),
    ];
  }, [searched, action]);

  if (!isAdmin) {
    return (
      <PageShell width="4xl">
        <EmptyState
          Icon={Lock}
          title="هذه الصفحة للمدير فقط"
          description="سجل التدقيق يعرض عمليات كل المستخدمين، لذلك لا يظهر إلا لمدير النظام."
          action={<Button onClick={() => navigate('/')}>العودة للرئيسية</Button>}
        />
      </PageShell>
    );
  }

  const filtersActive = query.trim() !== '' || action !== 'all';
  const resetFilters = () => {
    setQuery('');
    setAction('all');
  };

  return (
    <PageShell width="4xl">
      <PageHeader
        title="سجل التدقيق"
        subtitle={
          isLoading
            ? 'من قام بماذا ومتى'
            : `${filtered.length} من ${logs.length} عملية${logs.length >= 300 ? ' (آخر 300)' : ''}`
        }
      />

      <div className="space-y-3">
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label="بحث في السجل"
          placeholder="ابحث في العملية أو اسم المنفّذ"
                    leftIcon={<Search sx={{ fontSize: 20 }} />}
          rightIcon={
            query ? (
              <IconButton size="md" label="مسح البحث" onClick={() => setQuery('')} className="-me-2">
                <Close sx={{ fontSize: 20 }} />
              </IconButton>
            ) : undefined
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!isLoading && logs.length > 0 && (
          <Segmented<ActionFilter>
            layout="scroll"
            aria-label="نوع العملية"
            options={filterOptions}
            value={action}
            onChange={setAction}
          />
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {isLoading ? 'جارٍ تحميل السجل' : `${filtered.length} عملية معروضة`}
      </p>

      {isLoading ? (
        <AuditSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState
          Icon={History}
          title="لا توجد عمليات مسجلة بعد"
          description="ستظهر هنا عمليات الإضافة والتعديل والحذف والسداد التي ينفذها فريقك، مع اسم المنفّذ ووقت العملية."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          Icon={Search}
          title="لا نتائج مطابقة"
          description="جرّب كلمة أخرى أو اعرض كل أنواع العمليات."
          action={
            filtersActive ? (
              <Button variant="outline" onClick={resetFilters}>
                مسح الفلاتر
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key} aria-label={dayLabel(g.key)}>
              {/* top-14 clears the phone top bar (h-14 + notch); the desktop page scrolls under nothing */}
              <h2 className="sticky top-[calc(3.5rem+var(--sa-top,0px))] z-10 flex items-center justify-between bg-surface-canvas px-1 py-2 text-sm font-semibold text-fg-subtle lg:top-0">
                <span>{dayLabel(g.key)}</span>
                <span className="text-xs font-medium tabular-nums text-fg-muted">{g.items.length}</span>
              </h2>
              <ListGroup>
                {g.items.map((log) => (
                  <AuditRow key={log.id} log={log} />
                ))}
              </ListGroup>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function AuditRow({ log }: { log: AuditLogEntry }) {
  const d = dayjs(log.createdAt);
  const time = d.isValid() ? timeFormat.format(d.toDate()) : '';
  const actionKey: AuditAction = log.action in ACTION_LABELS ? log.action : 'other';
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 sm:items-center">
      <Avatar name={log.userName || '?'} size="md" />
      {/* Phones: badges sit under the text. From sm up they move to the inline end. */}
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <p className="text-base font-semibold leading-snug text-fg">{log.summary}</p>
          {log.details && <p className="mt-0.5 line-clamp-2 text-sm text-fg-subtle">{log.details}</p>}
          <p className="mt-1 text-xs text-fg-muted">
            {log.userName}
            {time && <span> · <span className="tabular-nums">{time}</span></span>}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-0 sm:flex-none">
          <Badge tone={ACTION_TONE[actionKey]}>{ACTION_LABELS[actionKey]}</Badge>
          <Badge tone="neutral">{ENTITY_LABELS[log.entity] || log.entity}</Badge>
        </div>
      </div>
    </div>
  );
}

/** Two day groups with three rows each, same silhouette as the loaded timeline. */
function AuditSkeleton() {
  return (
    <div aria-hidden className="space-y-5">
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="px-1 py-2">
            <Skeleton height={12} width={96} />
          </div>
          <ListGroup>
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-start gap-3 px-4 py-3.5">
                <Skeleton circle width={44} height={44} />
                <div className="flex-1 space-y-2 pt-0.5">
                  <Skeleton height={14} width="70%" />
                  <Skeleton height={10} width="40%" />
                  <div className="flex gap-1.5 pt-1">
                    <Skeleton height={28} width={56} pill />
                    <Skeleton height={28} width={64} pill />
                  </div>
                </div>
              </div>
            ))}
          </ListGroup>
        </div>
      ))}
    </div>
  );
}
