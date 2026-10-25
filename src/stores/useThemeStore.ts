import { create } from 'zustand';
import type { ThemeMode } from '../config/brand.types';

/**
 * Theme mode store. Persists to localStorage and syncs `data-theme` on <html>
 * so Tailwind `dark:` utilities and CSS variables switch in unison.
 */

function applyToDocument(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
}

function initialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('theme-mode') as ThemeMode | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return 'light';
}

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const initial = initialMode();
applyToDocument(initial);

export const useThemeStore = create<ThemeState>((set) => ({
  mode: initial,
  toggleTheme: () =>
    set((s) => {
      const next: ThemeMode = s.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', next);
      applyToDocument(next);
      return { mode: next };
    }),
  setTheme: (mode) => {
    localStorage.setItem('theme-mode', mode);
    applyToDocument(mode);
    set({ mode });
  },
}));
