import { createTheme, ThemeOptions } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

// Modern color palette with vibrant gradients
// Premium Engineering & Construction Palette
const modernColors = {
  light: {
    primary: {
      main: '#0f172a', // Slate 900 - Trust, Authority, Engineering
      light: '#334155', // Slate 700
      dark: '#020617', // Slate 950
      gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', // Sleek dark gradient
    },
    secondary: {
      main: '#b45309', // Amber 700 - Construction, Industrial
      light: '#d97706', // Amber 600
      dark: '#78350f', // Amber 900
      gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', // Golden/Bronze industrial feel
    },
    success: {
      main: '#059669', // Emerald 600
      light: '#10b981',
      dark: '#047857',
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    },
    warning: {
      main: '#eab308', // Yellow 500 - Safety
      light: '#facc15',
      dark: '#ca8a04',
      gradient: 'linear-gradient(135deg, #eab308 0%, #facc15 100%)',
    },
    error: {
      main: '#be123c', // Rose 700
      light: '#e11d48',
      dark: '#9f1239',
      gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
    },
    info: {
      main: '#0369a1', // Sky 700
      light: '#0ea5e9',
      dark: '#075985',
      gradient: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
    },
    background: {
      default: '#f8fafc', // Slate 50
      paper: '#ffffff',
      glass: 'rgba(255, 255, 255, 0.8)',
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
  },
  dark: {
    primary: {
      main: '#f8fafc', // Slate 50 - Contrast for dark mode
      light: '#ffffff',
      dark: '#cbd5e1',
      gradient: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)',
    },
    secondary: {
      main: '#f59e0b', // Amber 500
      light: '#fbbf24',
      dark: '#d97706',
      gradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    },
    warning: {
      main: '#fbbf24',
      light: '#fcd34d',
      dark: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #fcd34d 100%)',
    },
    error: {
      main: '#f87171',
      light: '#fca5a5',
      dark: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #fca5a5 100%)',
    },
    info: {
      main: '#38bdf8',
      light: '#7dd3fc',
      dark: '#0284c7',
      gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    },
    background: {
      default: '#020617', // Slate 950
      paper: '#0f172a', // Slate 900
      glass: 'rgba(15, 23, 42, 0.7)',
      gradient: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
  },
};

import { createModernTheme } from './modern';
export * from './modern';

export const createAppTheme = (mode: ThemeMode) => {
  return createModernTheme(mode);
};

