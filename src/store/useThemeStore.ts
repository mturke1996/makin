import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '../theme';

interface ThemeState {
  mode: ThemeMode;
  designSystem: 'classic' | 'modern';
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  setDesignSystem: (system: 'classic' | 'modern') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      designSystem: 'modern',

      toggleTheme: () =>
        set((state) => ({
          mode: state.mode === 'light' ? 'dark' : 'light',
        })),

      setTheme: (mode: ThemeMode) =>
        set({ mode }),

      setDesignSystem: (system: 'classic' | 'modern') =>
        set({ designSystem: system }),
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({
        mode: state.mode,
        designSystem: state.designSystem,
      }),
    }
  )
);

