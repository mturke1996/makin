import type { ReactNode } from 'react';
import { Delete, Edit, PictureAsPdf, Share } from '../../../design-system/icons';
import { Button, IconButton, ListGroup } from '../../../design-system/primitives';
import { cn } from '../../../design-system/primitives/cn';
import { RECORDS_BAR_OFFSET } from './records/RecordsFilterBar';

/**
 * Titled group of ledger rows (a month, a day, a phase): the title with how many records it holds, the
 * group total at the end, one hairline list. With `sticky` the heading stays under the search row of the
 * sheet while its rows scroll, so a long list always says which month it is in.
 */
export function LedgerGroup({
  title,
  count,
  trailing,
  note,
  sticky,
  children,
}: {
  title: ReactNode;
  /** «12 مصروفاً»: quiet, next to the title. */
  count?: ReactNode;
  trailing?: ReactNode;
  /** A line under the heading that belongs to the whole group (a phase budget). */
  note?: ReactNode;
  sticky?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <header
        className={cn(
          'flex min-h-11 items-center justify-between gap-3 px-1',
          sticky && `sticky ${RECORDS_BAR_OFFSET} z-[2] bg-surface-canvas`
        )}
      >
        <h3 className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-bold text-fg">{title}</span>
          {count && <span className="flex-none text-xs text-fg-muted">{count}</span>}
        </h3>
        {trailing && <span className="flex-none text-sm font-semibold tabular-nums text-fg-subtle">{trailing}</span>}
      </header>
      {note && <div className="px-1 pb-1 text-xs text-fg-muted">{note}</div>}
      <ListGroup className="mt-1">{children}</ListGroup>
    </section>
  );
}

interface LedgerRowProps {
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** One quiet line (a note). */
  note?: ReactNode;
  /** Chips under the text column (badges, who recorded it). */
  meta?: ReactNode;
  trailing: ReactNode;
  /** Full-width content under the row (quantity breakdown, progress). */
  extra?: ReactNode;
  /** Omitted for a row the person may only read: it is then plain content, not a button. */
  onOpen?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  /** Icon of the open button on large screens: a pencil, or an eye for a row that only opens read-only. */
  openIcon?: ReactNode;
  /** Extra desktop-only actions before edit / delete (an attachment link). */
  desktopActions?: ReactNode;
}

/**
 * One ledger entry: the whole row opens the edit sheet (where delete lives on phones);
 * from sm up an edit / delete pair of 44px buttons sits at the end. A row without `onOpen`
 * (the person may not change it) is plain content with no buttons.
 */
export function LedgerRow({
  leading,
  title,
  subtitle,
  note,
  meta,
  trailing,
  extra,
  onOpen,
  onDelete,
  editLabel = 'تعديل',
  deleteLabel = 'حذف',
  openIcon,
  desktopActions,
}: LedgerRowProps) {
  const below = meta || extra;
  const rowClass = cn(
    'flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 px-4 pt-3.5 text-start',
    below ? 'pb-2' : 'pb-3.5'
  );
  const content = (
    <>
      <span className="flex-none">{leading}</span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-base font-semibold leading-snug text-fg">{title}</span>
        {subtitle && <span className="mt-0.5 line-clamp-2 break-words text-xs text-fg-muted">{subtitle}</span>}
        {note && <span className="mt-0.5 line-clamp-2 break-words text-xs text-fg-subtle">{note}</span>}
      </span>
      <span className="flex-none text-end">{trailing}</span>
    </>
  );
  return (
    <div className={cn(onOpen && 'transition-colors duration-fast ease-out hover:bg-surface-hover')}>
      <div className="flex items-stretch">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className={cn(rowClass, 'focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]')}
          >
            {content}
          </button>
        ) : (
          <div className={rowClass}>{content}</div>
        )}
        {(onOpen || onDelete || desktopActions) && (
          <div className="hidden items-center gap-1 pe-3 sm:flex">
            {desktopActions}
            {onOpen && (
              <IconButton label={editLabel} onClick={onOpen}>
                {openIcon ?? <Edit sx={{ fontSize: 20 }} />}
              </IconButton>
            )}
            {onDelete && (
              <IconButton label={deleteLabel} onClick={onDelete} className="hover:bg-danger-soft hover:text-danger-ink">
                <Delete sx={{ fontSize: 20 }} />
              </IconButton>
            )}
          </div>
        )}
      </div>
      {below && (
        <div className="space-y-2 px-4 pb-3.5">
          {meta && <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 ps-14">{meta}</div>}
          {extra}
        </div>
      )}
    </div>
  );
}

/** Quiet pair under a module's records: the statement as a PDF, or shared. */
export function PdfActions({
  loading,
  onDownload,
  onShare,
  downloadLabel = 'كشف PDF',
  shareLabel = 'مشاركة',
}: {
  loading: boolean;
  onDownload: () => void;
  onShare: () => void;
  downloadLabel?: string;
  shareLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant="outline"
        loading={loading}
        leftIcon={<PictureAsPdf sx={{ fontSize: 20 }} />}
        onClick={onDownload}
      >
        {downloadLabel}
      </Button>
      <Button variant="outline" disabled={loading} leftIcon={<Share sx={{ fontSize: 20 }} />} onClick={onShare}>
        {shareLabel}
      </Button>
    </div>
  );
}
