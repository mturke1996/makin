import dayjs from 'dayjs';
import type { Letter } from '../../../types';
import { TYPE_LABEL } from './letterPresets';

/** Live paper-style preview of the letter being edited. */
export function LetterPreview({ form }: { form: Partial<Letter> }) {
  const paragraphs = (form.bodyParagraphs || []).filter((p) => p.trim());
  return (
    <div className="rounded-lg border border-border bg-surface-panel p-5 text-sm leading-loose text-fg">
      <div className="flex items-baseline justify-between gap-3 text-xs text-fg-muted">
        <span>{TYPE_LABEL[form.type || 'official']}</span>
        <span>
          <bdi dir="ltr">{form.refNumber}</bdi>
          {form.date && (
            <>
              {' · '}
              <bdi dir="ltr">{dayjs(form.date).format('DD/MM/YYYY')}</bdi>
            </>
          )}
        </span>
      </div>

      <div className="mt-4">
        <p className="font-bold">{form.recipientName ? `السيد/ ${form.recipientName}` : 'السيد/ اسم المستلم'}</p>
        {form.recipientTitle && <p className="text-fg-subtle">{form.recipientTitle}</p>}
        {form.recipientAddress && <p className="text-fg-subtle">{form.recipientAddress}</p>}
      </div>

      <p className="mt-4 font-bold">
        الموضوع: {form.subject || <span className="font-normal text-fg-muted">موضوع الرسالة</span>}
      </p>

      <p className="mt-4 whitespace-pre-line">{form.greeting}</p>
      <div className="mt-2 space-y-2">
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))
        ) : (
          <p className="text-fg-muted">اكتب فقرات الرسالة لتظهر هنا.</p>
        )}
      </div>
      {form.notes?.trim() && <p className="mt-3 whitespace-pre-line text-fg-subtle">{form.notes}</p>}
      <p className="mt-4 whitespace-pre-line">{form.closing}</p>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="font-bold">{form.signerName || 'اسم الموقع'}</p>
          <p className="text-fg-subtle">{form.signerTitle}</p>
        </div>
        {form.showStamp !== false && (
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border-strong text-2xs text-fg-muted">
            الختم
          </span>
        )}
      </div>
    </div>
  );
}
