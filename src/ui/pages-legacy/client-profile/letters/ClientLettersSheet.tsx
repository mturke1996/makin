import { createElement, useEffect, useMemo, useState } from 'react';
import {
  Add,
  DescriptionOutlined,
  ExpandMore,
  OpenInNew,
  PictureAsPdfOutlined,
  ShareOutlined,
} from '../../../../design-system/icons';
import { Badge, Button, EmptyState, ListGroup, Segmented, Sheet, Skeleton } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import { downloadPdf, sharePdf } from '../../../../features/pdf/pdfService';
import { LetterPDF } from '../../../../features/pdf/LetterPDF';
import type { Client, Letter, LetterType } from '../../../../types';
import { TYPE_ICON_CLASS, TYPE_LABEL, TYPE_TONE } from '../../letters/letterPresets';
import { extrasCountPhrase } from '../extrasCopy';
import { formatDay } from '../workers/format';
import { countLettersByType } from './clientLetters';

export interface ClientLettersSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  /** The client's letters (`useClientExtras().clientLetters`), newest first. */
  letters: Letter[];
  /** The data is still loading and there is nothing to show yet. */
  loading?: boolean;
  /** Opens the letters page on this letter (where it can be edited or deleted). */
  onOpenLetter: (letter: Letter) => void;
  /** Starts a new letter for this client. Leave out without `letters.manage`. */
  onCreate?: () => void;
}

type Filter = 'all' | LetterType;

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="flex-none text-xs text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-end text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}

function LetterItem({
  letter,
  clientName,
  expanded,
  busy,
  onToggle,
  onDownload,
  onShare,
  onOpen,
}: {
  letter: Letter;
  /** The recipient is not repeated when it is the client itself. */
  clientName: string;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onDownload: () => void;
  onShare: () => void;
  onOpen: () => void;
}) {
  const panelId = `client-letter-${letter.id}`;
  const hasDetails = letter.recipientTitle || letter.recipientPhone || letter.recipientAddress || letter.signerName;
  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          'flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3.5 text-start',
          'transition-colors duration-fast ease-out hover:bg-surface-hover active:bg-surface-hover',
          'focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]'
        )}
      >
        <span className={cn('flex h-11 w-11 flex-none items-center justify-center rounded-lg', TYPE_ICON_CLASS[letter.type])}>
          <DescriptionOutlined sx={{ fontSize: 22 }} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-snug text-fg [overflow-wrap:anywhere]">{letter.subject}</span>
          <span className="mt-0.5 block text-xs text-fg-muted">
            <bdi dir="ltr" className="tabular-nums">{formatDay(letter.date)}</bdi>
            {letter.recipientName && letter.recipientName !== clientName && <> · {letter.recipientName}</>}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={TYPE_TONE[letter.type]}>{TYPE_LABEL[letter.type]}</Badge>
            {letter.refNumber && (
              <span className="text-xs text-fg-muted">
                <bdi>{letter.refNumber}</bdi>
              </span>
            )}
          </span>
        </span>
        <ExpandMore
          sx={{ fontSize: 22 }}
          className={cn('flex-none text-fg-muted transition-transform duration-base ease-out', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        className="grid"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          visibility: expanded ? 'visible' : 'hidden',
          transition: expanded
            ? 'grid-template-rows 200ms var(--ease-out), visibility 0s'
            : 'grid-template-rows 200ms var(--ease-out), visibility 0s linear 200ms',
        }}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 px-4 pb-4 pt-1">
            {hasDetails && (
              <dl className="space-y-2 rounded-md bg-surface-sunken p-3.5">
                {letter.recipientTitle && <Detail label="الصفة">{letter.recipientTitle}</Detail>}
                {letter.recipientPhone && (
                  <Detail label="الهاتف">
                    <bdi dir="ltr">{letter.recipientPhone}</bdi>
                  </Detail>
                )}
                {letter.recipientAddress && <Detail label="العنوان">{letter.recipientAddress}</Detail>}
                {letter.signerName && (
                  <Detail label="الموقّع">
                    {letter.signerName}
                    {letter.signerTitle && <span className="text-fg-muted"> · {letter.signerTitle}</span>}
                  </Detail>
                )}
              </dl>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" disabled={busy} leftIcon={<PictureAsPdfOutlined sx={{ fontSize: 20 }} />} onClick={onDownload}>
                تحميل PDF
              </Button>
              <Button variant="outline" disabled={busy} leftIcon={<ShareOutlined sx={{ fontSize: 20 }} />} onClick={onShare}>
                مشاركة
              </Button>
              <Button variant="ghost" className="col-span-2" leftIcon={<OpenInNew sx={{ fontSize: 20 }} className="rtl-flip" />} onClick={onOpen}>
                فتح في صفحة الرسائل
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LettersSkeleton() {
  return (
    <ListGroup aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3.5">
          <Skeleton width={44} height={44} className="rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton height={15} width="60%" />
            <Skeleton height={11} width="40%" />
            <Skeleton height={24} width={80} pill />
          </div>
        </div>
      ))}
    </ListGroup>
  );
}

/**
 * The client's letters (official letters, offers, entitlement statements). A row opens in place with the
 * recipient and the PDF actions of the letters page; the letters page itself is one tap away for editing.
 */
export function ClientLettersSheet({ open, onClose, client, letters, loading, onOpenLetter, onCreate }: ClientLettersSheetProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A sheet that was closed opens fresh next time.
  useEffect(() => {
    if (!open) {
      setFilter('all');
      setExpandedId(null);
    }
  }, [open]);

  const counts = useMemo(() => countLettersByType(letters), [letters]);
  const present = counts.filter((c) => c.count > 0);
  const active: Filter = filter !== 'all' && !present.some((c) => c.type === filter) ? 'all' : filter;
  const visible = active === 'all' ? letters : letters.filter((l) => l.type === active);

  const withBusy = async (run: () => Promise<void>) => {
    setBusy(true);
    try {
      await run();
    } catch {
      /* the PDF service already showed the error */
    } finally {
      setBusy(false);
    }
  };
  const fileName = (l: Letter) => `${TYPE_LABEL[l.type]}-${l.refNumber}`;
  const download = (l: Letter) => withBusy(() => downloadPdf(createElement(LetterPDF, { letter: l }), fileName(l)));
  const share = (l: Letter) =>
    withBusy(() =>
      sharePdf(createElement(LetterPDF, { letter: l }), fileName(l), {
        title: `${TYPE_LABEL[l.type]} - ${l.subject}`,
        text: `مرفق: ${TYPE_LABEL[l.type]} - ${l.subject}`,
      }),
    );

  const showSkeleton = !!loading && letters.length === 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="الرسائل"
      subtitle={letters.length > 0 ? `${client.name} · ${extrasCountPhrase('letters', letters.length)}` : client.name}
      maxWidth="md"
      footer={
        onCreate ? (
          <Button block leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={onCreate}>
            رسالة جديدة
          </Button>
        ) : undefined
      }
    >
      <div className="min-h-[40vh] space-y-4 px-4 pb-8 pt-4 lg:px-6">
        {showSkeleton ? (
          <LettersSkeleton />
        ) : letters.length === 0 ? (
          <EmptyState
            Icon={DescriptionOutlined}
            title="لا توجد رسائل لهذا العميل"
            description={
              onCreate
                ? 'اكتب خطاباً رسمياً أو عرض سعر أو مستخلصاً موجهاً لهذا العميل، وصدّره PDF بترويسة شركتك.'
                : 'الخطابات والعروض والمستخلصات الموجهة لهذا العميل تظهر هنا عند كتابتها.'
            }
          />
        ) : (
          <>
            {present.length > 1 && (
              <Segmented<Filter>
                layout="scroll"
                aria-label="تصفية الرسائل حسب النوع"
                value={active}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'الكل', count: letters.length },
                  ...present.map((c) => ({ value: c.type as Filter, label: TYPE_LABEL[c.type], count: c.count })),
                ]}
              />
            )}
            <ListGroup>
              {visible.map((letter) => (
                <LetterItem
                  key={letter.id}
                  letter={letter}
                  clientName={client.name}
                  expanded={expandedId === letter.id}
                  busy={busy}
                  onToggle={() => setExpandedId(expandedId === letter.id ? null : letter.id)}
                  onDownload={() => download(letter)}
                  onShare={() => share(letter)}
                  onOpen={() => onOpenLetter(letter)}
                />
              ))}
            </ListGroup>
          </>
        )}
      </div>
    </Sheet>
  );
}
