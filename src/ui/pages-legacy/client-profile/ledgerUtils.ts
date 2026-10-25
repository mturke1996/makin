import dayjs from 'dayjs';

/** Latin digits regardless of the global dayjs locale. */
const en = (value: string | Date) => dayjs(value).locale('en');

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const isoDay = (value?: string | Date) => en(value ?? new Date()).format('YYYY-MM-DD');

/** «أكتوبر 2026» from a `YYYY-MM` key (no date parsing, so no timezone can move the month). */
export const monthKeyLabel = (key: string) => {
  const month = Number(key.slice(5, 7)) - 1;
  return MONTHS[month] ? `${MONTHS[month]} ${key.slice(0, 4)}` : key;
};

/** «اليوم»، «أمس» أو «الخميس، 15/10/2026». */
export const dayLabel = (value: string | Date) => {
  const d = en(value);
  const today = dayjs().locale('en');
  if (d.isSame(today, 'day')) return 'اليوم';
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'أمس';
  return `${WEEKDAYS[d.day()]}، ${d.format('DD/MM/YYYY')}`;
};
