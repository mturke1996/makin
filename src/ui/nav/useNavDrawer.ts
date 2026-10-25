import { create } from 'zustand';

/**
 * Whether the phone drawer is open. The top bar owns the drawer; the bottom bar flips this flag
 * when a person has so few destinations that the bar needs a "menu" button to reach two.
 */
export const useNavDrawer = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
