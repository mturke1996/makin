import { Amount, Badge, ListGroup, Section } from '../../../../design-system/primitives';
import type { Worker } from '../../../../types';
import { subtractMoney } from '../../../../core/finance/money';
import { formatDay } from './format';

export function AgreementHistory({ worker }: { worker: Worker }) {
  const revisions = worker.agreementHistory ?? [];
  return (
    <Section title="سجل الاتفاق" description="تعديلات موثقة بسببها ومن سجّلها. لا تُنشئ مصروفاً جديداً.">
      {revisions.length === 0 ? (
        <p className="rounded-md bg-surface-sunken p-4 text-sm leading-relaxed text-fg-subtle">هذا اتفاق سابق لبدء توثيق السجل. تظهر قيمته الحالية أعلاه، ولم تُحفظ تواريخ تعديلاته القديمة.</p>
      ) : (
        <ListGroup>
          {[...revisions].reverse().map((revision, reverseIndex) => {
            const index = revisions.length - reverseIndex - 1;
            const previous = revisions[index - 1];
            const change = previous ? subtractMoney(revision.totalAmount, previous.totalAmount) : 0;
            return (
              <article key={revision.id} className="space-y-2 px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={revision.kind === 'baseline' ? 'neutral' : 'info'}>{revision.kind === 'created' ? 'اتفاق أول' : revision.kind === 'baseline' ? 'بيانات افتتاحية' : 'تعديل اتفاق'}</Badge>
                  <Amount amount={revision.totalAmount} className="text-base font-bold" />
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-fg">{revision.reason}</p>
                {previous && change !== 0 && <p className="text-xs text-fg-subtle">{change > 0 ? 'زيادة الاتفاق' : 'تخفيض الاتفاق'} <Amount amount={Math.abs(change)} /></p>}
                <p className="text-xs text-fg-muted">سُجل في {formatDay(revision.recordedAt)}{revision.recordedByName ? `، بواسطة ${revision.recordedByName}` : ''}</p>
                {revision.kind === 'baseline' && <p className="text-xs text-fg-muted">تاريخ التسجيل أعلاه بداية التوثيق، وتاريخ الاتفاق الأصلي غير معروف.</p>}
                {revision.agreementItems.length > 0 && <details className="text-sm"><summary className="flex min-h-11 cursor-pointer items-center text-accent-ink">بنود هذه النسخة ({revision.agreementItems.length})</summary><ul className="space-y-2 pb-2 text-fg-subtle">{revision.agreementItems.map((item) => <li key={item.id} className="break-words">{item.title}: <bdi dir="ltr">{item.quantity} × {item.unitPrice}</bdi>{item.unit ? ` (${item.unit})` : ''}{item.note ? `، ${item.note}` : ''}</li>)}</ul></details>}
              </article>
            );
          })}
        </ListGroup>
      )}
    </Section>
  );
}
