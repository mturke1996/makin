/** @type {import('tailwindcss').Config} */
const tone = (name) => ({
  DEFAULT: `var(--brand-${name})`,
  soft: `var(--${name}-soft)`,
  ink: `var(--${name}-ink)`,
});

export default {
  // Hover styles only where a pointer can really hover: on a tablet or phone a tap would otherwise leave the
  // row or button looking hovered until the next tap.
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: ['class', "[data-theme='dark']"],
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    // Compact product geometry, informed by linda-shop-main.
    borderRadius: {
      none: '0',
      xs: '4px',
      sm: '6px',
      DEFAULT: '8px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      '2xl': '20px',
      '3xl': '24px',
      full: '9999px',
    },
    // Arabic script must never be letter-spaced (breaks cursive joins).
    letterSpacing: {
      tighter: '0',
      tight: '0',
      normal: '0',
      wide: '0.01em',
      wider: '0.02em',
      widest: '0.04em',
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand-primary-rgb) / <alpha-value>)',
          primary: 'var(--brand-primary)',
          'primary-hover': 'var(--brand-primary-hover)',
          'primary-soft': 'var(--brand-primary-soft)',
          secondary: 'var(--brand-secondary)',
          success: 'var(--brand-success)',
          warning: 'var(--brand-warning)',
          danger: 'var(--brand-danger)',
          info: 'var(--brand-info)',
        },
        // Semantic tones: bg-success-soft text-success-ink, text-danger-ink …
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          ink: 'var(--accent-ink)',
          on: 'var(--on-accent)',
        },
        success: tone('success'),
        warning: { ...tone('warning'), on: 'var(--on-warning)' },
        danger: tone('danger'),
        info: tone('info'),
        surface: {
          canvas: 'var(--surface-canvas)',
          panel: 'var(--surface-panel)',
          raised: 'var(--surface-raised)',
          sunken: 'var(--surface-sunken)',
          hover: 'var(--surface-hover)',
          scrim: 'var(--surface-scrim)',
        },
        border: {
          DEFAULT: 'var(--surface-border)',
          strong: 'var(--surface-border-strong)',
        },
        fg: {
          DEFAULT: 'var(--text-primary)',
          subtle: 'var(--text-secondary)',
          muted: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
      },
      fontFamily: {
        sans: ['var(--brand-font-sans)'],
        mono: ['var(--brand-font-mono)'],
        arabic: ['var(--brand-font-arabic)'],
      },
      spacing: {
        0.5: '2px', 1: '4px', 2: '8px', 3: '12px', 4: '16px',
        5: '20px', 6: '24px', 7: '28px', 8: '32px', 10: '40px',
        12: '48px', 14: '56px', 16: '64px', 18: '72px', 20: '80px',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        brand: 'var(--shadow-brand)',
        focus: 'var(--brand-focus-ring)',
      },
      // Fixed product scale (ratio ≈ 1.2). Nothing under 12px.
      fontSize: {
        '3xs': ['0.6875rem', { lineHeight: '1rem' }],  // Linda's timestamps and stat hints only
        '2xs': ['0.75rem', { lineHeight: '1.5' }],     // 12 — captions
        xs: ['0.8125rem', { lineHeight: '1.6' }],      // 13 — metadata
        sm: ['0.875rem', { lineHeight: '1.65' }],      // 14 — labels and controls
        base: ['0.875rem', { lineHeight: '1.65' }],    // 14 — body, like the reference
        md: ['1rem', { lineHeight: '1.6' }],          // 16
        lg: ['1.125rem', { lineHeight: '1.5' }],      // 18
        xl: ['1.25rem', { lineHeight: '1.4' }],       // 20
        '2xl': ['1.5rem', { lineHeight: '1.3' }],     // 24
        '3xl': ['1.875rem', { lineHeight: '1.25' }],  // 30
        '4xl': ['2.5rem', { lineHeight: '1.15' }],    // 40
        '5xl': ['3rem', { lineHeight: '1.1' }],       // 48
      },
      transitionDuration: {
        instant: '90ms',
        fast: '140ms',
        base: '200ms',
        slow: '280ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      minHeight: { touch: '44px', control: '48px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
};
