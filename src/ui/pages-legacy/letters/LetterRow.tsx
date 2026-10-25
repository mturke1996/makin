import { DeleteOutline, DescriptionOutlined, EditOutlined, ExpandMore, PictureAsPdfOutlined, ShareOutlined } from '@mui/icons-material';
import dayjs from 'dayjs';
import { Badge, Button, cn } from '../../../design-system/primitives';
import type { Letter } from '../../../types';
import { TYPE_ICON_CLASS, TYPE_LABEL, TYPE_TONE } from './letterPresets';

interface LetterRowProps {
  letter: Letter;
  expanded: boolean;
  busy: boolean;
  onToggle: () => void;
  /** Omitted when this user may not change letters (`letters.manage`). */
  onEdit?: () => void;
  /** Omitted when this user may not delete letters. */
  onDelete?: () => void;
  onDownload: () => void;
  onShare: () => void;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}

/** A letter in the list; expands in place to show details and actions. */
export function LetterRow({ letter, expanded, busy, onToggle, onEdit, onDelete, onDownload, onShare }: LetterRowProps) {
  const panelId = `letter-${letter.id}`;
  const hasDetails = letter.recipientTitle || letter.recipientPhone || letter.recipientAddress;
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
          <DescriptionOutlined sx={{ fontSize: 22 }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-snug text-fg">{letter.subject}</span>
          <span className="mt-0.5 block truncate text-xs text-fg-muted">
            {letter.recipientName} · <bdi dir="ltr">{dayjs(letter.date).format('DD/MM/YYYY')}</bdi>
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={TYPE_TONE[letter.type]}>{TYPE_LABEL[letter.type]}</Badge>
            <span className="text-xs text-fg-muted">
              <bdi dir="ltr">{letter.refNumber}</bdi>
            </span>
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
              </dl>
            )}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button
                variant="secondary"
                disabled={busy}
                leftIcon={<PictureAsPdfOutlined sx={{ fontSize: 20 }} />}
                onClick={onDownload}
              >
                تحميل PDF
              </Button>
              <Button variant="outline" disabled={busy} leftIcon={<ShareOutlined sx={{ fontSize: 20 }} />} onClick={onShare}>
                مشاركة
              </Button>
              {onEdit && (
                <Button variant="outline" leftIcon={<EditOutlined sx={{ fontSize: 20 }} />} onClick={onEdit}>
                  تعديل
                </Button>
              )}
              {onDelete && (
                <Button variant="danger-soft" leftIcon={<DeleteOutline sx={{ fontSize: 20 }} />} onClick={onDelete}>
                  حذف
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
