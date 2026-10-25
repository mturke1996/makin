import { useMemo, useState } from 'react';
import { Add, AccountBalanceWallet } from '@mui/icons-material';
import { Button, EmptyState, Segmented, Sheet } from '../../../design-system/primitives';
import type { Client, UserBalance } from '../../../types';
import { chargedCustody, summarizeClientCustody } from '../../../core/finance/clientCustody';
import { formatCurrencyDisplay } from '../../../core/utils-formatters';
import { CustodyCard, CustodyTotals, UserCustodyHeader, custodyCount, expensesCount } from './custody';
import type { UserBalancesSummary } from './types';

interface BalancesSheetProps {
  open: boolean;
  onClose: () => void;
  client: Client;
  /** Custody movements of this client, newest first (their count is the sheet's subtitle). */
  clientUserBalances: UserBalance[];
  /** Custody per user with every custody and its expenses (built by `buildClientCustody`). */
  userBalancesSummary: UserBalancesSummary;
  /** Omitted when this person may not manage custody (`custody.manage`): the sheet is then read-only. `userId` is the holder on screen. */
  onAdd?: (userId?: string) => void;
  onEdit?: (balance: UserBalance) => void;
  onDelete?: (balance: UserBalance) => void;
}

/**
 * Custody given on this client. Every custody (one deposit) is a card with its own figures: amount, spent,
 * what is left, any deficit deducted from it or moved on to the next, and the expenses charged to it.
 * With several holders a chip row picks whose custody is on screen.
 */
export function BalancesSheet({
  open,
  onClose,
  client,
  clientUserBalances,
  userBalancesSummary,
  onAdd,
  onEdit,
  onDelete,
}: BalancesSheetProps) {
  const holders = useMemo(() => Object.values(userBalancesSummary), [userBalancesSummary]);
  const [picked, setPicked] = useState<string | null>(null);
  // A pick that no longer exists (its last custody was deleted) falls back to the first holder.
  const current = holders.find((h) => h.key === picked) ?? holders[0];

  const totals = useMemo(() => summarizeClientCustody(holders), [holders]);

  const charged = current && current.exact ? chargedCustody(current.custodies) : undefined;
  const several = holders.length > 1;
  const manage = !!onEdit || !!onDelete;
  const empty = holders.length === 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="العهد"
      subtitle={client?.name ? `${client.name} · ${custodyCount(clientUserBalances.length)}` : custodyCount(clientUserBalances.length)}
      maxWidth="md"
      footer={
        onAdd ? (
          <Button block leftIcon={<Add sx={{ fontSize: 20 }} />} onClick={() => onAdd(current?.userId)}>
            إيداع عهدة
          </Button>
        ) : undefined
      }
    >
      <div className="min-h-[30vh] space-y-4 px-4 pb-8 pt-4 lg:px-6">
        {empty ? (
          <EmptyState
            Icon={AccountBalanceWallet}
            title="لا توجد عهد على هذا المشروع"
            description={
              onAdd
                ? 'العهدة مبلغ يُسلَّم لموظف ليصرف منه على المشروع، وتُخصم مصروفاته منه تلقائياً. اضغط إيداع عهدة لتسجيل أول مبلغ.'
                : 'لا توجد عهدة مسلَّمة لك على هذا المشروع.'
            }
          />
        ) : (
          <>
            <CustodyTotals totals={totals} />

            {several && (
              <div className="sticky top-0 z-10 -mx-4 bg-surface-canvas px-4 py-2 lg:-mx-6 lg:px-6">
                <Segmented
                  layout="scroll"
                  aria-label="صاحب العهدة"
                  value={current.key}
                  onChange={setPicked}
                  options={holders.map((h) => ({
                    value: h.key,
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        {h.exact && h.deficit > 0 && <span aria-hidden className="size-2 rounded-full bg-danger" />}
                        {h.name}
                        {h.exact && h.deficit > 0 && <span className="sr-only">، عليه عجز</span>}
                      </span>
                    ),
                  }))}
                />
              </div>
            )}

            <section aria-label={`عهدة ${current.name}`} role={several ? 'tabpanel' : undefined} className="space-y-4">
              <UserCustodyHeader info={current} withFigures={several && current.custodies.length > 1} />

              <div className="space-y-3">
                {[...current.custodies].reverse().map((row) => (
                  <CustodyCard
                    key={row.id}
                    row={row}
                    defaultOpen={current.custodies.length === 1}
                    isCurrent={current.exact && current.custodies.length > 1 && charged?.id === row.id}
                    onEdit={onEdit ? () => onEdit(row.source) : undefined}
                    onDelete={onDelete ? () => onDelete(row.source) : undefined}
                  />
                ))}
              </div>

              {current.exact && current.beforeCustody.count > 0 && (
                <p className="rounded-md bg-surface-sunken px-3 py-2.5 text-sm leading-relaxed text-fg-subtle">
                  مصروفات سبقت أول عهدة فلا تُحتسب عليها: {expensesCount(current.beforeCustody.count)} بمبلغ{' '}
                  {formatCurrencyDisplay(current.beforeCustody.amount)}
                </p>
              )}

              {manage && current.custodies.length > 0 && (
                <p className="px-1 text-xs text-fg-muted">
                  حذف عهدة أو تعديل مبلغها يعيد توزيع المصروفات على عهد {current.name} من جديد.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </Sheet>
  );
}
