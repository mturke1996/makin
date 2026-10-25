import { ReactNode, useRef } from 'react';
import { Check, Delete, Edit } from '@mui/icons-material';
import {
  Button,
  IconButton,
  ListGroup,
  Modal,
  Skeleton,
  cn,
} from '../../../design-system/primitives';

/* ─────────────────────────────────────────────────────────────────────────
   Sticky group (month / day) + hairline list
   Sticky offset clears the mobile TopBar (56px + hairline + safe area); from lg
   up there is no top bar and the page itself scrolls inside the shell.
───────────────────────────────────────────────────────────────────────── */
const STICKY_TOP = 'top-[calc(57px+var(--sa-top,0px))] lg:top-0';

export function StickyGroup({
  title,
  trailing,
  children,
}: {
  title: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <header
        className={cn(
          'sticky z-[5] -mx-4 flex min-h-11 items-center justify-between gap-3 bg-surface-canvas px-5',
          'sm:-mx-6 sm:px-7 lg:-mx-8 lg:px-9',
          STICKY_TOP
        )}
      >
        <h2 className="truncate text-sm font-semibold text-fg-subtle">{title}</h2>
        {trailing && <span className="flex-none text-xs text-fg-muted">{trailing}</span>}
      </header>
      <ListGroup>{children}</ListGroup>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Row: one big button (opens the edit sheet) + 44px action pair from sm up.
   On phones the delete lives inside the edit sheet, so the row keeps its width.
───────────────────────────────────────────────────────────────────────── */
interface MoneyRowProps {
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** One quiet line (note, address…). */
  note?: ReactNode;
  meta?: ReactNode;
  trailing: ReactNode;
  /** Omitted for a read-only row (no edit button, nothing to press). */
  onOpen?: () => void;
  onDelete?: () => void;
  /** Extra desktop-only actions rendered before edit/delete (e.g. attachment link). */
  desktopActions?: ReactNode;
  editLabel?: string;
  deleteLabel?: string;
  /** The desktop button that opens the row. A pencil by default; pass an eye for a row that opens read-only. */
  openIcon?: ReactNode;
}

export function MoneyRow({
  leading, title, subtitle, note, meta, trailing, onOpen, onDelete, desktopActions,
  editLabel = 'تعديل', deleteLabel = 'حذف', openIcon,
}: MoneyRowProps) {
  const body = (
    <>
      <span className="flex-none">{leading}</span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-base font-semibold leading-snug text-fg">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-xs text-fg-muted">{subtitle}</span>}
        {note && <span className="mt-0.5 block truncate text-xs text-fg-subtle">{note}</span>}
        {meta && <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</span>}
      </span>
      <span className="flex-none text-end">{trailing}</span>
    </>
  );
  const bodyClass = 'flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-start';
  return (
    <div className="flex items-stretch transition-colors duration-fast ease-out hover:bg-surface-hover">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className={cn(bodyClass, 'focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]')}
        >
          {body}
        </button>
      ) : (
        <div className={bodyClass}>{body}</div>
      )}
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
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Destructive confirmation (names what will be deleted)
───────────────────────────────────────────────────────────────────────── */
export function ConfirmDeleteModal({
  open, title, description, confirmLabel = 'حذف', loading, onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  // Keep the last text while the modal animates out so it never flashes empty.
  const last = useRef({ title, description });
  if (open) last.current = { title, description };
  return (
    <Modal open={open} onClose={onClose} title={last.current.title} description={last.current.description} maxWidth="sm">
      <div className="flex gap-3">
        <Button variant="outline" block onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button variant="danger" block loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Form kit (inside <Sheet>)
───────────────────────────────────────────────────────────────────────── */
/** Panel-colored body so the filled (sunken) fields read clearly. */
export function FormBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-surface-panel px-4 py-5 lg:px-6">
      <div className="space-y-7">{children}</div>
    </div>
  );
}

export function FormSection({
  title,
  hint,
  action,
  children,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
        <div className="min-w-0">
          <h3 className="text-md font-bold leading-tight text-fg">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function FormFooter({
  onSave, saving, saveLabel, onDelete, deleteLabel = 'حذف',
}: {
  onSave: () => void;
  saving?: boolean;
  saveLabel: string;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {onDelete && (
        <Button variant="danger-soft" className="shrink-0" onClick={onDelete} disabled={saving} leftIcon={<Delete sx={{ fontSize: 20 }} />}>
          {deleteLabel}
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <Button block loading={saving} onClick={onSave}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

/** Radio-style picker with an unmistakable selected state. */
export function ChoiceGrid<T extends string>({
  options, value, onChange, label, className,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex h-14 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold',
              'transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-out active:scale-[0.98]',
              'focus:outline-none focus-visible:shadow-focus',
              active
                ? 'border-[color:var(--accent)] bg-accent-soft text-accent-ink shadow-[0_0_0_1px_var(--accent)]'
                : 'border-border bg-surface-panel text-fg-subtle hover:border-border-strong hover:text-fg'
            )}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
            {active && (
              <Check aria-hidden sx={{ fontSize: 16 }} className="absolute end-2 top-2 text-accent-ink" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Loading
───────────────────────────────────────────────────────────────────────── */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="جارٍ التحميل"
      className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-panel"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3.5">
          <Skeleton circle width={44} height={44} />
          <div className="flex-1 space-y-2">
            <Skeleton height={14} width={`${60 - (i % 3) * 10}%`} />
            <Skeleton height={11} width={`${36 + (i % 2) * 8}%`} />
          </div>
          <Skeleton height={18} width={76} />
        </div>
      ))}
    </div>
  );
}

export function FigureStripSkeleton() {
  return (
    <div role="status" aria-label="جارٍ التحميل" className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-surface-panel sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2.5 px-4 py-4">
          <Skeleton height={11} width="50%" />
          <Skeleton height={22} width="70%" />
        </div>
      ))}
    </div>
  );
}
