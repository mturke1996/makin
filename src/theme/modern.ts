import { createTheme, ThemeOptions } from '@mui/material/styles';
import type { ThemeMode } from './index';

declare module '@mui/material/styles' {
  interface PaletteColor {
    gradient?: string;
  }
  interface SimplePaletteColorOptions {
    gradient?: string;
  }
  interface TypeBackground {
    glass?: string;
    subtle?: string;
  }
}

// Premium Fintech Palette (Deep Navy + Neon Accents)
const premiumColors = {
  light: {
    primary: {
      main: '#2563EB', // Royal Blue
      light: '#60A5FA',
      dark: '#1E40AF',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    },
    secondary: {
      main: '#7C3AED', // Violet
      light: '#A78BFA',
      dark: '#5B21B6',
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
    },
    background: {
      default: '#F8FAFC', // Slate 50
      paper: '#FFFFFF',
      glass: 'rgba(255, 255, 255, 0.7)',
      subtle: '#F1F5F9',
    },
    text: {
      primary: '#0F172A', // Slate 900
      secondary: '#64748B', // Slate 500
    },
    action: {
      active: '#2563EB',
      hover: 'rgba(37, 99, 235, 0.08)',
    }
  },
  dark: {
    primary: {
      main: '#3B82F6', // Blue 500
      light: '#60A5FA',
      dark: '#2563EB',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    },
    secondary: {
      main: '#C084FC', // Purple 400
      light: '#E9D5FF',
      dark: '#A855F7',
      gradient: 'linear-gradient(135deg, #C084FC 0%, #A855F7 100%)',
    },
    background: {
      default: '#0B1121', // Deep Midnight (Almost Black)
      paper: '#151E32', // Dark Blue-Gray
      glass: 'rgba(21, 30, 50, 0.6)',
      subtle: '#1E293B',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
    action: {
      active: '#3B82F6',
      hover: 'rgba(59, 130, 246, 0.15)',
    }
  },
};

export const createModernTheme = (mode: ThemeMode) => {
  const colors = mode === 'light' ? premiumColors.light : premiumColors.dark;

  const getDesignTokens = (mode: ThemeMode): ThemeOptions => ({
    direction: 'rtl',
    palette: {
      mode,
      primary: colors.primary,
      secondary: colors.secondary,
      background: colors.background,
      text: colors.text,
    },
    typography: {
      fontFamily: '"Cairo", "Plus Jakarta Sans", "Inter", sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.3 },
      h3: { fontWeight: 700, lineHeight: 1.3 },
      h6: { fontWeight: 700 },
      button: { 
        fontWeight: 700, 
        letterSpacing: '0.02em',
        borderRadius: 12 
      },
    },
    shape: {
      borderRadius: 24,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: colors.background.default,
            backgroundImage: mode === 'dark' 
              ? 'radial-gradient(circle at 50% 0%, #172033 0%, #0B1121 100%)' 
              : 'radial-gradient(circle at 50% 0%, #EFF6FF 0%, #F8FAFC 100%)',
            minHeight: '100vh',
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { 
              background: mode === 'dark' ? '#334155' : '#CBD5E1', 
              borderRadius: '10px' 
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: colors.background.glass,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'}`,
            boxShadow: mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(37, 99, 235, 0.05)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: mode === 'dark'
                ? '0 12px 40px rgba(0, 0, 0, 0.6)'
                : '0 12px 40px rgba(37, 99, 235, 0.12)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            padding: '12px 24px',
            borderRadius: 16,
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease-in-out',
            gap: '12px',
            '&:hover': {
              transform: 'scale(1.02)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            },
          },
          containedPrimary: {
            background: colors.primary.gradient,
            border: '1px solid rgba(255,255,255,0.1)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            background: colors.background.subtle,
            border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            '&:hover': {
              background: colors.action.hover,
              transform: 'rotate(10deg)',
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },
    },
  });

  return createTheme(getDesignTokens(mode));
};
