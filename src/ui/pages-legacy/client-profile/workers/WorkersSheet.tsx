import { useMemo, useState } from 'react';
import { Add, PersonAdd, PictureAsPdf, Share } from '@mui/icons-material';
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
  ProgressBar,
  Section,
  Segmented,
  Sheet,
  Skeleton,
} from '../../../../design-system/primitives';
import { displayProgress, type WorkerLedgerTotals } from '../../../../core/finance/workerLedger';
import { LEDGER_STATUS_META } from './format';
import type { WorkerEntry } from './types';
import { filterWorkerEntries, type WorkerFilter } from './workerListModel';

interface WorkersSheetProps {
  open: boolean;
  onClose: () => void;
  clientName?: string;
  entries: WorkerEntry[];
  totals: WorkerLedgerTotals;
  loading: boolean;
  /** إضافة عامل: `workers.manage`. */
  canManage: boolean;
  onAdd: () => void;
  onOpen: (workerId: string) => void;
  pdfLoading: boolean;
  /** The statement PDF needs the full picture, so these exist only where the client summary is shown. */
  onDownloadPdf?: () => void;
  onSharePdf?: () => void;
}

function WorkerRow({ entry, onOpen }: { entry: WorkerEntry; onOpen: (id: string) => void }) {
  const { worker, ledger } = entry;
  const meta = LEDGER_STATUS_META[ledger.status];
  const pct = displayProgress(ledger);
  const tone = ledger.status === 'settled' ? 'success' : ledger.status === 'overpaid' ? 'danger' : 'brand';
  return (
    <ListRow
      onClick={() => onOpen(worker.id)}
      chevron
      leading={<Avatar name={worker.name} />}
      title={<span className="block whitespace-normal break-words">{worker.name}</span>}
      subtitle={<span className="block whitespace-normal break-words">{worker.jobType || 'عامل / مقاول'}</span>}
      meta={
        <>
          <span className="flex min-w-[5rem] flex-1 items-center gap-2">
            <ProgressBar value={ledger.progress} tone={tone} label={`نسبة المدفوع للعامل ${worker.name}`} />
            <span className="text-2xs tabular-nums text-fg-muted">{pct}%</span>
          </span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <Badge tone="neutral">{worker.archivedAt ? 'مؤرشف' : worker.status === 'completed' ? 'العمل مكتمل' : 'العمل جارٍ'}</Badge>
        </>
      }
      trailing={
        <span className="block">
          <span className="block text-2xs text-fg-muted">{ledger.remaining < 0 ? 'زيادة' : 'المتبقي'}</span>
          <Amount
            amount={ledger.remaining < 0 ? ledger.overpaidBy : ledger.remaining}
            tone={ledger.remaining === 0 ? 'success' : 'danger'}
            className="text-base font-bold"
          />
        </span>
      }
    />
  );
}

function WorkersSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <Skeleton height={168} className="rounded-lg" />
      <div className="space-y-3">
        <Skeleton height={24} width="30%" />
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-panel">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <Skeleton circle width={44} height={44} />
              <div className="flex-1 space-y-2">
                <Skeleton height={16} width="55%" />
                <Skeleton height={12} width="35%" />
                <Skeleton height={6} width="70%" />
              </div>
              <Skeleton height={20} width={64} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** قائمة عمال العميل: ملخص مالي ثم صفوف مرتبة بالمتبقي. الضغط على الصف يفتح ملف العامل. */
export function WorkersSheet({
  open, onClose, clientName, entries, totals, loading, canManage, onAdd, onOpen, pdfLoading, onDownloadPdf, onSharePdf,
}: WorkersSheetProps) {
  const [filter, setFilter] = useState<WorkerFilter>('current');
  const [query, setQuery] = useState('');
  const sorted = useMemo(() => filterWorkerEntries(entries, filter, query), [entries, filter, query]);
  const addButton = canManage ? (
    <Button size="lg" block leftIcon={<Add sx={{ fontSize: 22 }} />} onClick={onAdd}>
      إضافة عامل
    </Button>
  ) : undefined;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="العمال والمقاولون"
      subtitle={clientName}
      maxWidth="md"
      footer={entries.length > 0 ? addButton : undefined}
    >
      <div className="space-y-6 p-4 pb-8 lg:p-6">
        {loading && entries.length === 0 ? (
          <WorkersSkeleton />
        ) : entries.length === 0 ? (
          <EmptyState
            Icon={PersonAdd}
            title="لا يوجد عمال بعد"
            description={
              canManage
                ? 'سجّل كل عامل أو مقاول مع المبلغ المتفق عليه، ثم أضف دفعاته مع ملاحظة لكل دفعة ليظهر لك المتبقي له دائماً.'
                : 'لم يُسجَّل أي عامل أو مقاول على هذا المشروع بعد.'
            }
            action={
              canManage ? (
                <Button leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={onAdd}>
                  إضافة أول عامل
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <FigureStrip
              figures={[
                { label: 'المتفق عليه', value: <Amount amount={totals.agreed} /> },
                { label: 'المدفوع', value: <Amount amount={totals.paid} /> },
                {
                  label: 'المستحق للعمال',
                  value: <Amount amount={totals.owed} tone={totals.owed > 0 ? 'danger' : 'success'} />,
                  hint: 'يشمل مستحقات المؤرشفين',
                },
                { label: 'زيادة مدفوعة', value: <Amount amount={totals.overpaid} tone={totals.overpaid > 0 ? 'danger' : 'neutral'} />, hint: `${totals.workerCount} عامل، ${totals.settledCount} مسدد` },
              ]}
            />

            <div className="space-y-3">
              <Input label="البحث عن عامل" type="search" placeholder="الاسم أو المهنة أو الهاتف أو الملاحظة" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Segmented<WorkerFilter> layout="scroll" aria-label="تصفية العمال" value={filter} onChange={setFilter} options={[
                { value: 'current', label: 'الحاليون', count: entries.filter((e) => !e.worker.archivedAt).length },
                { value: 'owed', label: 'لهم مستحقات', count: entries.filter((e) => e.ledger.remaining > 0).length },
                { value: 'settled', label: 'مسددون' },
                { value: 'overpaid', label: 'زيادة مدفوعة' },
                { value: 'completed', label: 'العمل مكتمل' },
                { value: 'archived', label: 'الأرشيف', count: entries.filter((e) => !!e.worker.archivedAt).length },
                { value: 'all', label: 'الجميع' },
              ]} />
            </div>

            <Section title={`العمال (${sorted.length})`} description="الأكبر استحقاقاً أولاً. الأرقام أعلاه لجميع العمال.">
              {sorted.length > 0 ? <ListGroup>
                {sorted.map((e) => (
                  <WorkerRow key={e.worker.id} entry={e} onOpen={onOpen} />
                ))}
              </ListGroup> : <EmptyState Icon={PersonAdd} title="لا توجد نتائج" description="غيّر البحث أو التصفية لعرض بقية العمال." action={<Button variant="outline" onClick={() => { setQuery(''); setFilter('all'); }}>عرض الجميع</Button>} />}
            </Section>

            {onDownloadPdf && onSharePdf && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  loading={pdfLoading}
                  leftIcon={<PictureAsPdf sx={{ fontSize: 20 }} />}
                  onClick={onDownloadPdf}
                >
                  كشف PDF
                </Button>
                <Button variant="outline" disabled={pdfLoading} leftIcon={<Share sx={{ fontSize: 20 }} />} onClick={onSharePdf}>
                  مشاركة
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
