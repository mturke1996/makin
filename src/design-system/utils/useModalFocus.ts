import { useLayoutEffect, type RefObject } from 'react';
import { activateModalFocus } from './modalFocus';

export function useModalFocus(open: boolean, root: RefObject<HTMLDivElement>, panel: RefObject<HTMLDivElement>) {
  useLayoutEffect(() => {
    if (open && root.current && panel.current) return activateModalFocus(root.current, panel.current);
  }, [open, root, panel]);
}
