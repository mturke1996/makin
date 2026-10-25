import type { ElementType } from 'react';
import { AccountBalanceWallet, Assignment, Engineering, Flag, Payments, ReceiptLong, RequestQuote } from '@mui/icons-material';
import type { ActivityKind } from '../../../../core/finance/clientActivity';

interface KindMeta {
  Icon: ElementType;
  /** Soft tile behind the icon. */
  tile: string;
  /** Readable ink for the kind's name. */
  ink: string;
}

/** Look of each record kind: money in is success, money out is danger, the rest stays calm. */
export const KIND_META: Record<ActivityKind, KindMeta> = {
  payment: { Icon: Payments, tile: 'bg-success-soft text-success-ink', ink: 'text-success-ink' },
  expense: { Icon: ReceiptLong, tile: 'bg-danger-soft text-danger-ink', ink: 'text-danger-ink' },
  worker: { Icon: Engineering, tile: 'bg-info-soft text-info-ink', ink: 'text-info-ink' },
  debt: { Icon: RequestQuote, tile: 'bg-warning-soft text-warning-ink', ink: 'text-warning-ink' },
  custody: { Icon: AccountBalanceWallet, tile: 'bg-warning-soft text-warning-ink', ink: 'text-warning-ink' },
  siteReport: { Icon: Assignment, tile: 'bg-surface-sunken text-fg-subtle', ink: 'text-fg-subtle' },
  phase: { Icon: Flag, tile: 'bg-accent-soft text-accent-ink', ink: 'text-accent-ink' },
};
