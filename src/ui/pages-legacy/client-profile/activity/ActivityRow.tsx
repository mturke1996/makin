import { Amount } from '../../../../design-system/primitives';
import { cn } from '../../../../design-system/primitives/cn';
import { ACTIVITY_KIND_LABEL, formatDayDMY, type ActivityItem } from '../../../../core/finance/clientActivity';
import { KIND_META } from './kindMeta';

/** The row's money: received is +, spent is −, custody and debts are plain facts, not cash movement. */
function RowAmount({ item }: { item: ActivityItem }) {
  if (item.amount == null) return null;
  if (item.flow === 'in') return <Amount amount={item.amount} tone="success" showSign className="text-md font-bold" />;
  if (item.flow === 'out') return <Amount amount={-item.amount} tone="danger" className="text-md font-bold" />;
  return <Amount amount={item.amount} tone="neutral" className="text-md font-bold" />;
}

interface ActivityRowProps {
  item: ActivityItem;
  /** Who recorded it; hidden when it would only say "you". */
  showBy: boolean;
  onOpen: () => void;
}

/** One entry of the feed. The whole row opens its record. */
export function ActivityRow({ item, showBy, onOpen }: ActivityRowProps) {
  const meta = KIND_META[item.kind];
  const kindLabel = ACTIVITY_KIND_LABEL[item.kind];
  const lead = item.title.startsWith(kindLabel) ? null : kindLabel;
  const second = [item.detail].filter(Boolean).join(' · ');
  const third = [showBy && item.by ? `بواسطة ${item.by}` : '', item.note].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        // Wraps instead of squeezing: at large font sizes the amount drops under the text, not the text into a sliver.
        'flex min-h-[4.5rem] w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-start',
        'transition-colors duration-fast ease-out hover:bg-surface-hover active:bg-surface-hover',
        'focus:outline-none focus-visible:shadow-[inset_var(--brand-focus-ring)]'
      )}
    >
      <span className={cn('grid size-11 flex-none place-items-center rounded-full', meta.tile)}>
        <meta.Icon sx={{ fontSize: 22 }} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 basis-32">
        <span className="line-clamp-2 text-base font-semibold leading-snug text-fg [overflow-wrap:anywhere]">
          {item.title}
        </span>
        {(lead || second) && (
          <span className="mt-0.5 block text-xs text-fg-muted [overflow-wrap:anywhere]">
            {lead && <span className={cn('font-semibold', meta.ink)}>{lead}</span>}
            {lead && second && ' · '}
            {second}
          </span>
        )}
        {third && <span className="mt-0.5 line-clamp-1 text-xs text-fg-subtle">{third}</span>}
      </span>
      <span className="ms-auto flex-none text-end">
        <RowAmount item={item} />
        <span className="block text-xs tabular-nums text-fg-muted">
          <bdi dir="ltr">{formatDayDMY(item.day)}</bdi>
        </span>
      </span>
    </button>
  );
}
