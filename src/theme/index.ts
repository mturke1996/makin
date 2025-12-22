import { createTheme, ThemeOptions } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

export const createAppTheme = (mode: ThemeMode) => {
  const getDesignTokens = (mode: ThemeMode): ThemeOptions => ({
    direction: 'rtl',
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            // Light mode colors
            primary: {
              main: '#1976d2',
              light: '#42a5f5',
              dark: '#1565c0',
            },
            secondary: {
              main: '#9c27b0',
              light: '#ba68c8',
              dark: '#7b1fa2',
            },
            error: {
              main: '#f44336',
              light: '#e57373',
              dark: '#d32f2f',
            },
            warning: {
              main: '#ff9800',
              light: '#ffb74d',
              dark: '#f57c00',
            },
            success: {
              main: '#4caf50',
              light: '#81c784',
              dark: '#388e3c',
            },
            background: {
              default: '#f5f5f5',
              paper: '#ffffff',
            },
            text: {
              primary: '#1a1a1a',
              secondary: '#666666',
            },
          }
        : {
            // Dark mode colors
            primary: {
              main: '#90caf9',
              light: '#e3f2fd',
              dark: '#42a5f5',
            },
            secondary: {
              main: '#ce93d8',
              light: '#f3e5f5',
              dark: '#ab47bc',
            },
            error: {
              main: '#f44336',
              light: '#e57373',
              dark: '#d32f2f',
            },
            warning: {
              main: '#ffa726',
              light: '#ffb74d',
              dark: '#f57c00',
            },
            success: {
              main: '#66bb6a',
              light: '#81c784',
              dark: '#4caf50',
            },
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
            text: {
              primary: '#ffffff',
              secondary: '#b0b0b0',
            },
          }),
    },
    typography: {
      fontFamily: [
        'Cairo',
        'Roboto',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 24px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          contained: {
            '&:hover': {
              transform: 'translateY(-2px)',
              transition: 'transform 0.2s',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow:
              mode === 'light'
                ? '0 2px 8px rgba(0,0,0,0.08)'
                : '0 2px 8px rgba(0,0,0,0.3)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
          },
        },
      },
    },
  });

  return createTheme(getDesignTokens(mode));
};

