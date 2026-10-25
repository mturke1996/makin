import dayjs from 'dayjs';
import type { Letter, LetterType } from '../../../types';

export const TYPE_LABEL: Record<LetterType, string> = {
  official: 'خطاب رسمي',
  offer: 'عرض سعر',
  entitlement: 'مستخلص',
};

export const TYPE_TONE: Record<LetterType, 'brand' | 'info' | 'warning'> = {
  official: 'brand',
  offer: 'info',
  entitlement: 'warning',
};

export const TYPE_ICON_CLASS: Record<LetterType, string> = {
  official: 'bg-accent-soft text-accent-ink',
  offer: 'bg-info-soft text-info-ink',
  entitlement: 'bg-warning-soft text-warning-ink',
};

export const GREETINGS = [
  'بسم الله الرحمن الرحيم\nالسلام عليكم ورحمة الله وبركاته\nتحية طيبة وبعد',
  'بسم الله الرحمن الرحيم\nالسلام عليكم ورحمة الله وبركاته',
  'السلام عليكم ورحمة الله وبركاته\nتحية طيبة وبعد',
  'تحية طيبة وبعد',
  'السلام عليكم ورحمة الله وبركاته',
];

export const CLOSINGS = [
  'وفي انتظار ردكم الكريم\nوتقبلوا فائق الاحترام والتقدير',
  'شاكرين لكم حسن تعاونكم\nوتقبلوا فائق الاحترام والتقدير',
  'نأمل أن ينال اهتمامكم ونتطلع للتعاون معكم\nوتقبلوا خالص الشكر والتقدير',
  'والله ولي التوفيق\nوتقبلوا فائق الاحترام والتقدير',
  'نرجو التكرم بالموافقة على ما ذكر أعلاه\nوتقبلوا وافر الاحترام والتقدير',
  'راجين من سيادتكم الاطلاع واتخاذ اللازم\nوالسلام عليكم ورحمة الله وبركاته',
];

export const createDefaultLetter = (): Partial<Letter> => ({
  type: 'official',
  refNumber: `ETL-${dayjs().format('YYYYMMDD')}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
  date: dayjs().format('YYYY-MM-DD'),
  recipientName: '',
  recipientTitle: '',
  recipientAddress: '',
  recipientPhone: '',
  clientId: '',
  subject: '',
  greeting: GREETINGS[0],
  bodyParagraphs: [''],
  notes: '',
  closing: CLOSINGS[0],
  signerName: '',
  signerTitle: 'المدير العام',
  showStamp: true,
});

/** Short one-line label for a multi-line preset in a select. */
export const presetLabel = (text: string) => text.split('\n').join(' · ');
