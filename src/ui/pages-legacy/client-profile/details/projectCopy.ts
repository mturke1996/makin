import type { ProjectTimeline } from '../../../../core/finance/clientProject';

/** «يوم واحد»، «يومان»، «5 أيام»، «23 يوماً». */
export function daysPhrase(n: number): string {
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومان';
  return `${n} ${n >= 3 && n <= 10 ? 'أيام' : 'يوماً'}`;
}

export type TimelineTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

export interface TimelineCopy {
  /** The line that matters. */
  title: string;
  /** A second, quieter line. */
  detail?: string;
  tone: TimelineTone;
}

/** Days left at or below this get a warning tone. */
const SOON_DAYS = 7;

/** What the project card says about where the project stands. */
export function describeTimeline(t: ProjectTimeline): TimelineCopy {
  switch (t.kind) {
    case 'completed':
      return {
        title: 'المشروع منتهٍ',
        detail: t.plannedDays != null && t.plannedDays > 0 ? `المدة المخططة ${daysPhrase(t.plannedDays)}` : undefined,
        tone: 'success',
      };
    case 'unscheduled':
      return { title: 'لم تُحدد مواعيد المشروع', tone: 'neutral' };
    case 'upcoming':
      return { title: `يبدأ بعد ${daysPhrase(t.daysToStart ?? 0)}`, tone: 'info' };
    case 'due_today':
      return { title: 'التسليم المتوقع اليوم', tone: 'warning' };
    case 'late':
      return {
        title: `متأخر ${daysPhrase(t.daysLate ?? 0)}`,
        detail: 'عن موعد التسليم المتوقع',
        tone: 'danger',
      };
    case 'running': {
      const since =
        t.daysSinceStart == null ? null : t.daysSinceStart === 0 ? 'بدأ المشروع اليوم' : `بدأ منذ ${daysPhrase(t.daysSinceStart)}`;
      if (t.daysLeft == null) return { title: since ?? 'المشروع جارٍ', tone: 'neutral' };
      const left = `متبقٍ ${daysPhrase(t.daysLeft)} على التسليم`;
      const tone: TimelineTone = t.daysLeft <= SOON_DAYS ? 'warning' : 'neutral';
      return since ? { title: left, detail: since, tone } : { title: left, tone };
    }
  }
}
