import { ChevronRight, EditOutlined } from '../../../design-system/icons';
import { Amount, Avatar, Badge, IconButton, cn } from '../../../design-system/primitives';
import type { Client } from '../../../types';
import { hasDeficit, type ClientFigure } from './clientFigures';

const EPS = 0.0005;

/** The single decision figure for a client: deficit to collect, surplus, or settled. */
function ClientFigureCell({ figure, inline }: { figure: ClientFigure; inline?: boolean }) {
  if (!figure.active) return <span className="text-xs text-fg-muted">بلا حركة</span>;
  const deficit = hasDeficit(figure);
  if (!deficit && figure.remaining <= EPS) {
    return (
      <Badge tone="success" dot>
        مسدد
      </Badge>
    );
  }
  return (
    <span className={cn('flex', inline ? 'items-baseline gap-1.5' : 'flex-col items-end')}>
      <Amount
        amount={deficit ? figure.required : figure.remaining}
        tone={deficit ? 'danger' : 'success'}
        className="text-md font-bold"
      />
      <span className="text-2xs text-fg-muted">{deficit ? 'عجز' : 'فائض'}</span>
    </span>
  );
}

interface ClientRowProps {
  client: Client;
  /**
   * The account figure. Absent when the person does not hold all the data it is made of: the row then
   * shows identity only (no figure, no agreed percentage), never a number built from part of it.
   */
  figure?: ClientFigure;
  onOpen: () => void;
  /** Absent when the person may not edit clients. */
  onEdit?: () => void;
}

/**
 * One client: identity on the start side, one decision figure on the end side.
 * On phones the figure drops to the last line so the name keeps its full width.
 */
export function ClientRow({ client, figure, onOpen, onEdit }: ClientRowProps) {
  const company = client.type === 'company';
  const hasPercent = !!figure && !!client.profitPercentage;
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-start',
          'transition-colors duration-fast ease-out hover:bg-surface-hover active:bg-surface-hover',
          'focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]'
        )}
      >
        <Avatar name={client.name} shape={company ? 'entity' : 'person'} className="flex-none" />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-snug text-fg">{client.name}</span>
          <span className="mt-0.5 block text-xs text-fg-muted">
            {company ? 'شركة' : 'فرد'} · <bdi dir="ltr">{client.phone}</bdi>
          </span>
          {figure && (
            <span className={cn('mt-1.5 flex items-center gap-2', !hasPercent && 'sm:hidden')}>
              {hasPercent && (
                <Badge tone="brand">
                  نسبة <bdi dir="ltr">{client.profitPercentage}%</bdi>
                </Badge>
              )}
              <span className="ms-auto sm:hidden">
                <ClientFigureCell figure={figure} inline />
              </span>
            </span>
          )}
        </span>
        {figure && (
          <span className="hidden flex-none text-end sm:block">
            <ClientFigureCell figure={figure} />
          </span>
        )}
        <ChevronRight sx={{ fontSize: 20 }} className="flex-none text-fg-muted rtl-flip" aria-hidden />
      </button>
      {/* Desktop shortcut; on phones editing lives in the client profile. */}
      {onEdit && (
        <IconButton label={`تعديل ${client.name}`} onClick={onEdit} className="me-3 hidden lg:inline-flex">
          <EditOutlined sx={{ fontSize: 20 }} />
        </IconButton>
      )}
    </div>
  );
}
