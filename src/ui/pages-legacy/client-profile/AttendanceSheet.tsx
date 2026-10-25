import { useMemo, useState } from 'react';
import { ArrowBack, ArrowForward, CalendarToday, Groups } from '../../../design-system/icons';
import { Avatar, Button, EmptyState, ListGroup, Sheet } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import {
  ATTENDANCE_LABEL,
  ATTENDANCE_STATUSES,
  attendanceOfDay,
  isDay,
  shiftDay,
  summarizeAttendance,
} from '../../../core/finance/workerAttendance';
import { formatDayText } from '../../../core/finance/clientRecords';
import type { AttendanceStatus, Client, Worker, WorkerAttendance } from '../../../types';
import { isoDay } from './ledgerUtils';

const TONE: Record<AttendanceStatus, string> = {
  present: 'border-transparent bg-success text-white',
  half: 'border-transparent bg-warning text-white',
  absent: 'border-transparent bg-danger text-white',
};

interface AttendanceSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  /** The project's workers still on the job. */
  workers: Worker[];
  records: WorkerAttendance[];
  /** Marking needs `workers.manage`; without it the day is only read. */
  canMark: boolean;
  /** `null` clears the mark. */
  onMark?: (worker: Worker, day: string, status: AttendanceStatus | null) => void;
  loading?: boolean;
}

/** The day's roll call: one row per worker, one tap to mark him present, half a day or absent. */
export function AttendanceSheet({ open, onClose, client, workers, records, canMark, onMark, loading }: AttendanceSheetProps) {
  const [day, setDay] = useState(() => isoDay());
  const today = isoDay();
  const ofDay = useMemo(() => attendanceOfDay(records, day), [records, day]);
  const summary = useMemo(() => summarizeAttendance([...ofDay.values()]), [ofDay]);
  const unmarked = workers.filter((w) => !ofDay.has(w.id));

  const go = (delta: number) => setDay((d) => shiftDay(d, delta));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="الحضور اليومي"
      subtitle={client?.name}
      maxWidth="md"
      headerExtras={
        <div className="flex items-center gap-2">
          <button type="button" aria-label="اليوم السابق" onClick={() => go(-1)} className="grid size-11 flex-none place-items-center rounded-md border border-border bg-surface-panel text-fg-subtle hover:text-fg focus:outline-none focus-visible:shadow-focus">
            <ArrowForward sx={{ fontSize: 20 }} className="ltr:rotate-180" />
          </button>
          <label className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface-panel px-3 text-sm font-semibold text-fg">
            <CalendarToday sx={{ fontSize: 18 }} aria-hidden />
            <input
              type="date"
              aria-label="اليوم"
              value={day}
              max={today}
              onChange={(e) => isDay(e.target.value) && setDay(e.target.value)}
              className="min-w-0 bg-transparent text-center tabular-nums focus:outline-none"
            />
          </label>
          <button type="button" aria-label="اليوم التالي" disabled={day >= today} onClick={() => go(1)} className="grid size-11 flex-none place-items-center rounded-md border border-border bg-surface-panel text-fg-subtle hover:text-fg focus:outline-none focus-visible:shadow-focus disabled:opacity-40">
            <ArrowBack sx={{ fontSize: 20 }} className="ltr:rotate-180" />
          </button>
        </div>
      }
      footer={
        canMark && unmarked.length > 0 ? (
          <Button block variant="outline" onClick={() => unmarked.forEach((w) => onMark?.(w, day, 'present'))}>
            تعليم الباقين حاضرين ({unmarked.length})
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4 p-4 pb-8 lg:p-6">
        {workers.length === 0 ? (
          <EmptyState
            Icon={Groups}
            title="لا عمال على هذا المشروع"
            description={loading ? 'جارٍ التحميل…' : 'أضف العمال من قسم «العمال» ثم سجّل حضورهم هنا كل يوم.'}
          />
        ) : (
          <>
            <p className="text-sm text-fg-subtle" aria-live="polite">
              {formatDayText(day)}
              {day === today ? ' · اليوم' : ''}
              <span className="mx-1.5" aria-hidden>·</span>
              حاضر <b className="tabular-nums text-fg">{summary.present}</b>
              {' '}· نصف يوم <b className="tabular-nums text-fg">{summary.half}</b>
              {' '}· غائب <b className="tabular-nums text-fg">{summary.absent}</b>
              {unmarked.length > 0 && <> · لم يُسجَّل <b className="tabular-nums text-fg">{unmarked.length}</b></>}
            </p>
            <ListGroup>
              {workers.map((w) => {
                const current = ofDay.get(w.id)?.status;
                return (
                  <div key={w.id} className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={w.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-fg">{w.name}</p>
                        {w.jobType && <p className="truncate text-xs text-fg-muted">{w.jobType}</p>}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label={`حضور ${w.name}`}>
                      {ATTENDANCE_STATUSES.map((status) => {
                        const selected = current === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            aria-pressed={selected}
                            disabled={!canMark}
                            onClick={() => onMark?.(w, day, selected ? null : status)}
                            className={cn(
                              'min-h-11 rounded-md border text-sm font-semibold transition-colors duration-fast active:scale-[0.97] focus:outline-none focus-visible:shadow-focus disabled:cursor-default',
                              selected ? TONE[status] : 'border-border bg-surface-panel text-fg-subtle hover:border-border-strong hover:text-fg',
                              !canMark && !selected && 'opacity-60',
                            )}
                          >
                            {ATTENDANCE_LABEL[status]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </ListGroup>
            {!canMark && <p className="text-xs text-fg-muted">تسجيل الحضور يحتاج صلاحية إدارة العمال.</p>}
          </>
        )}
      </div>
    </Sheet>
  );
}
