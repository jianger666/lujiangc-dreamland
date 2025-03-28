import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      // 重置一下行高，noto sans sc在正常行高下，展示不全
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.625rem' }],
        lg: ['1.125rem', { lineHeight: '1.875rem' }],
        xl: ['1.25rem', { lineHeight: '2rem' }],
        '2xl': ['1.5rem', { lineHeight: '2.25rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.75rem' }],
        '4xl': ['2.25rem', { lineHeight: '3.375rem' }],
        '5xl': ['3rem', { lineHeight: '4.5rem' }],
        '6xl': ['4rem', { lineHeight: '6rem' }],
        '7xl': ['4.5rem', { lineHeight: '6.75rem' }],
        '8xl': ['6rem', { lineHeight: '8.5rem', letterSpacing: '-0.03em' }],
        '9xl': ['8rem', { lineHeight: '11rem', letterSpacing: '-0.04em' }],
      },
      // 标准间距规范
      spacing: {
        '2xs': '0.25rem', // 4px
        xs: '0.5rem', // 8px
        sm: '0.75rem', // 12px
        md: '1rem', // 16px
        lg: '1.5rem', // 24px
        xl: '2rem', // 32px
        '2xl': '2.5rem', // 40px
        '3xl': '3rem', // 48px
        '4xl': '4rem', // 64px
        '5xl': '5rem', // 80px
      },
      // 标准阴影规范
      boxShadow: {
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.15)',
        DEFAULT:
          '0 2px 5px 0 rgba(0, 0, 0, 0.2), 0 1px 3px 0 rgba(0, 0, 0, 0.15)',
        md: '0 5px 10px -1px rgba(0, 0, 0, 0.2), 0 3px 6px -1px rgba(0, 0, 0, 0.15)',
        lg: '0 12px 20px -3px rgba(0, 0, 0, 0.25), 0 6px 10px -2px rgba(0, 0, 0, 0.18)',
        xl: '0 25px 35px -5px rgba(0, 0, 0, 0.25), 0 12px 15px -5px rgba(0, 0, 0, 0.18)',
        '2xl': '0 30px 60px -12px rgba(0, 0, 0, 0.35)',
        inner: 'inset 0 3px 6px 0 rgba(0, 0, 0, 0.15)',
        'dark-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        dark: '0 2px 5px 0 rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'dark-md':
          '0 5px 10px -1px rgba(0, 0, 0, 0.4), 0 3px 6px -1px rgba(0, 0, 0, 0.3)',
        'dark-lg':
          '0 12px 20px -3px rgba(0, 0, 0, 0.4), 0 6px 10px -2px rgba(0, 0, 0, 0.3)',
        'dark-xl':
          '0 25px 35px -5px rgba(0, 0, 0, 0.4), 0 12px 15px -5px rgba(0, 0, 0, 0.3)',
        'dark-2xl': '0 30px 60px -12px rgba(0, 0, 0, 0.5)',
      },
      // z-index层级规范
      zIndex: {
        behind: '-1',
        base: '0',
        raised: '1',
        dropdown: '10',
        sticky: '20',
        overlay: '30',
        modal: '40',
        popover: '50',
        tooltip: '60',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)',
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
