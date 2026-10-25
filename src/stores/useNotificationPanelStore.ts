import { create } from 'zustand';

/**
 * UI state for the notification drawer (not persisted; single source for all bell buttons).
 */
export const useNotificationPanelStore = create<{
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
