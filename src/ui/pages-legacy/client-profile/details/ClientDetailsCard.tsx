import { useState, type ReactNode } from 'react';
import { EditOutlined, EventOutlined } from '@mui/icons-material';
import { Amount, Badge, Button, IconButton, ProgressBar, Card, CardHeader, CardTitle } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import {
  CLIENT_STATUS_LABEL,
  contractProgress,
  projectTimeline,
  resolveClientStatus,
  type ContractProgress,
  type ProjectTimelineKind,
} from '../../../../core/finance/clientProject';
import type { Client, ClientStatus } from '../../../../types';
import type { ClientProfileCaps } from '../types';
import { formatDay } from '../workers/format';
import { ContactActions } from './ContactActions';
import { describeTimeline, type TimelineTone } from './projectCopy';

const STATUS_TONE: Record<ClientStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  paused: 'warning',
  completed: 'neutral',
};

const TONE_INK: Record<TimelineTone, string> = {
  neutral: 'text-fg',
  info: 'text-info-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
};

const TIME_BAR: Record<TimelineTone, 'brand' | 'info' | 'success' | 'warning' | 'danger'> = {
  neutral: 'brand',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

/** The elapsed-time bar says something only while the project is under way (or has run past its end). */
const SHOWS_TIME_BAR: ReadonlySet<ProjectTimelineKind> = new Set(['running', 'due_today', 'late']);

/** Notes longer than this get a "show more" toggle. */
const NOTES_PREVIEW_CHARS = 140;

export interface ClientDetailsCardProps {
  client: Client;
  /** Only `payments` is read: the contract progress is collected money, so it needs `payments.view`. */
  caps: Pick<ClientProfileCaps, 'payments'>;
  /** Total collected from this client (`summary.totalPaid`). Ignored without `caps.payments`. */
  collected?: number;
  /** Opens the edit-client form. Leave out when this person may not edit clients (`clients.manage`). */
  onEdit?: () => void;
  /** The day the timeline is measured against. Defaults to now (a prop for tests and QA). */
  today?: Date;
  className?: string;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 border-t border-border px-4 py-4">
      <h3 className="text-xs font-medium text-fg-muted">{title}</h3>
      {children}
    </div>
  );
}

function ScheduleBlock({ client, today }: { client: Client; today?: Date }) {
  const timeline = projectTimeline(client, today);
  const copy = describeTimeline(timeline);
  return (
    <Block title="المدة">
      <div>
        <p className={cn('text-base font-semibold leading-snug', TONE_INK[copy.tone])}>{copy.title}</p>
        {copy.detail && <p className="mt-0.5 text-sm text-fg-subtle">{copy.detail}</p>}
      </div>
      {timeline.elapsedPct != null && SHOWS_TIME_BAR.has(timeline.kind) && (
        <div className="space-y-1.5">
          <ProgressBar value={timeline.elapsedPct} tone={TIME_BAR[copy.tone]} label={`مضى ${timeline.elapsedPct}% من المدة`} />
          {timeline.kind !== 'late' && (
            <p className="text-xs text-fg-muted">
              مضى <bdi dir="ltr" className="tabular-nums">{timeline.elapsedPct}%</bdi> من المدة المخططة
            </p>
          )}
        </div>
      )}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
        <EventOutlined sx={{ fontSize: 16 }} aria-hidden className="flex-none" />
        {client.startDate && (
          <span>
            البدء <bdi dir="ltr" className="tabular-nums">{formatDay(client.startDate)}</bdi>
          </span>
        )}
        {client.expectedEndDate && (
          <span>
            التسليم <bdi dir="ltr" className="tabular-nums">{formatDay(client.expectedEndDate)}</bdi>
          </span>
        )}
      </p>
    </Block>
  );
}

function ContractBlock({ progress }: { progress: ContractProgress }) {
  const tone = progress.state === 'complete' ? 'success' : progress.state === 'over' ? 'warning' : 'brand';
  return (
    <Block title="قيمة العقد">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Amount amount={progress.contractValue} className="text-xl font-bold text-fg" />
        <span className="text-sm font-semibold tabular-nums text-fg-subtle">
          <bdi dir="ltr">{progress.pct}%</bdi> محصّل
        </span>
      </div>
      <ProgressBar value={progress.pct} tone={tone} label={`المحصّل ${progress.pct}% من قيمة العقد`} />
      <dl className="grid grid-cols-2 gap-3 pt-1">
        <div className="min-w-0">
          <dt className="text-xs text-fg-muted">المحصّل</dt>
          <dd className="mt-0.5 text-md font-bold">
            <Amount amount={progress.collected} tone="success" />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-fg-muted">{progress.over > 0 ? 'زيادة عن العقد' : 'المتبقي للتحصيل'}</dt>
          <dd className="mt-0.5 text-md font-bold">
            {progress.over > 0 ? <Amount amount={progress.over} tone="warning" /> : <Amount amount={progress.remaining} />}
          </dd>
        </div>
      </dl>
    </Block>
  );
}

function NotesBlock({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false);
  const long = notes.length > NOTES_PREVIEW_CHARS || notes.split('\n').length > 3;
  return (
    <Block title="ملاحظات">
      <p className={cn('whitespace-pre-line break-words text-sm leading-relaxed text-fg', long && !open && 'line-clamp-3')}>{notes}</p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="-my-1 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-accent-ink focus:outline-none focus-visible:shadow-focus"
        >
          {open ? 'عرض أقل' : 'عرض المزيد'}
        </button>
      )}
    </Block>
  );
}

/**
 * The project side of a client, for the side column under the hero: status, how long the project has run
 * and what is left, how much of the contract value was collected (only for people who hold the payments),
 * the notes, and one-tap call, WhatsApp and map links.
 */
export function ClientDetailsCard({ client, caps, collected = 0, onEdit, today, className }: ClientDetailsCardProps) {
  const status = resolveClientStatus(client);
  const contract = caps.payments ? contractProgress(client.contractValue, collected) : null;
  const notes = client.notes?.trim();
  const dated = !!client.startDate || !!client.expectedEndDate;
  const bare = !dated && !contract && !notes;

  return (
    <Card padding="none" aria-labelledby="client-details-title" className={cn('[&_bdi]:whitespace-normal [&_bdi]:[overflow-wrap:anywhere] [&_dd>span]:whitespace-normal', className)}>
      <CardHeader className="items-center">
        <CardTitle id="client-details-title" className="min-w-0 flex-1">
          تفاصيل المشروع
        </CardTitle>
        <Badge tone={STATUS_TONE[status]} dot>
          {CLIENT_STATUS_LABEL[status]}
        </Badge>
        {onEdit && (
          <IconButton label="تعديل بيانات المشروع" onClick={onEdit} className="-me-2">
            <EditOutlined sx={{ fontSize: 20 }} />
          </IconButton>
        )}
      </CardHeader>

      {(client.phone || client.address) && <Block title="التواصل والموقع">
        <dl className="space-y-3 text-sm">
          {client.phone && <div className="space-y-1"><dt className="text-xs text-fg-muted">الهاتف</dt><dd><bdi dir="ltr" className="tabular-nums">{client.phone}</bdi></dd></div>}
          {client.address && <div className="space-y-1"><dt className="text-xs text-fg-muted">العنوان</dt><dd className="whitespace-pre-line break-words [overflow-wrap:anywhere]">{client.address}</dd></div>}
        </dl>
      </Block>}

      {bare ? (
        <div className="space-y-3 border-t border-border px-4 py-4">
          <p className="text-sm leading-relaxed text-fg-subtle">
            {status === 'completed'
              ? 'المشروع منتهٍ.'
              : caps.payments
                ? 'لم تُحدد مواعيد المشروع ولا قيمة العقد بعد.'
                : 'لم تُحدد مواعيد المشروع بعد.'}
          </p>
          {onEdit && (
            <Button variant="secondary" onClick={onEdit}>
              أضف تفاصيل المشروع
            </Button>
          )}
        </div>
      ) : (
        <>
          {dated && <ScheduleBlock client={client} today={today} />}
          {contract && <ContractBlock progress={contract} />}
          {notes && <NotesBlock notes={notes} />}
        </>
      )}

      <ContactActions
        phone={client.phone}
        address={client.address}
        className="border-t border-border px-4 py-4"
      />
    </Card>
  );
}
