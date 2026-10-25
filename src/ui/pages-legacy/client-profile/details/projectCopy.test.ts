import { describe, expect, it } from 'vitest';
import { projectTimeline } from '../../../../core/finance/clientProject';
import { daysPhrase, describeTimeline } from './projectCopy';

const TODAY = '2026-10-24';
const copy = (c: Parameters<typeof projectTimeline>[0]) => describeTimeline(projectTimeline(c, TODAY));

describe('daysPhrase', () => {
  it('uses the right Arabic form for the number', () => {
    expect(daysPhrase(1)).toBe('يوم واحد');
    expect(daysPhrase(2)).toBe('يومان');
    expect(daysPhrase(3)).toBe('3 أيام');
    expect(daysPhrase(10)).toBe('10 أيام');
    expect(daysPhrase(11)).toBe('11 يوماً');
    expect(daysPhrase(30)).toBe('30 يوماً');
    expect(daysPhrase(0)).toBe('0 يوماً');
  });
});

describe('describeTimeline', () => {
  it('has no schedule', () => {
    expect(copy({})).toEqual({ title: 'لم تُحدد مواعيد المشروع', tone: 'neutral' });
  });

  it('a finished project', () => {
    expect(copy({ status: 'completed' })).toMatchObject({ title: 'المشروع منتهٍ', tone: 'success', detail: undefined });
    expect(copy({ status: 'completed', startDate: '2026-01-01', expectedEndDate: '2026-02-01' }).detail).toBe('المدة المخططة 31 يوماً');
  });

  it('one that starts later', () => {
    expect(copy({ startDate: '2026-10-26' })).toEqual({ title: 'يبدأ بعد يومان', tone: 'info' });
  });

  it('a running project with an end date leads with what is left', () => {
    expect(copy({ startDate: '2026-10-04', expectedEndDate: '2026-12-03' })).toEqual({
      title: 'متبقٍ 40 يوماً على التسليم',
      detail: 'بدأ منذ 20 يوماً',
      tone: 'neutral',
    });
  });

  it('warns in the last week', () => {
    expect(copy({ startDate: '2026-10-04', expectedEndDate: '2026-10-29' }).tone).toBe('warning');
    expect(copy({ startDate: '2026-10-04', expectedEndDate: '2026-10-31' }).tone).toBe('warning');
    expect(copy({ startDate: '2026-10-04', expectedEndDate: '2026-11-01' }).tone).toBe('neutral');
  });

  it('a running project without an end date counts from the start', () => {
    expect(copy({ startDate: '2026-10-14' })).toEqual({ title: 'بدأ منذ 10 أيام', tone: 'neutral' });
    expect(copy({ startDate: TODAY }).title).toBe('بدأ المشروع اليوم');
  });

  it('the day it is due and after', () => {
    expect(copy({ expectedEndDate: TODAY })).toEqual({ title: 'التسليم المتوقع اليوم', tone: 'warning' });
    expect(copy({ expectedEndDate: '2026-10-21' })).toEqual({
      title: 'متأخر 3 أيام',
      detail: 'عن موعد التسليم المتوقع',
      tone: 'danger',
    });
    expect(copy({ expectedEndDate: '2026-10-23' }).title).toBe('متأخر يوم واحد');
  });

  it('only an end date, still running', () => {
    expect(copy({ expectedEndDate: '2026-10-30' })).toEqual({ title: 'متبقٍ 6 أيام على التسليم', tone: 'warning' });
  });
});
