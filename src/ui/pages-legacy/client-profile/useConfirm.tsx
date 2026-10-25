import { useCallback, useState } from 'react';
import { ConfirmModal, type ConfirmRequest } from './workers/ConfirmModal';

/** Pause between closing one layer and acting on the next, so the Back-button history stays in order. */
const SETTLE_MS = 280;

/**
 * One confirmation dialog for every delete on the client page. `ask` shows what is about to be
 * deleted; the dialog stays open (and the store toasts the error) if the delete fails.
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const ask = useCallback((next: ConfirmRequest) => {
    setRequest(next);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  const run = async () => {
    if (!request || busy) return;
    setBusy(true);
    try {
      await request.onConfirm();
      setOpen(false);
      if (request.afterClose) window.setTimeout(request.afterClose, SETTLE_MS);
    } catch {
      /* the store shows the error */
    } finally {
      setBusy(false);
    }
  };

  const modal = <ConfirmModal open={open} request={request} busy={busy} onClose={close} onConfirm={run} />;
  return { ask, modal, isOpen: open };
}
