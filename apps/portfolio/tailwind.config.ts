import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5B4FE8',
          dark: '#4338CA',
          soft: '#EEEDFC',
          glow: '#8B83F0',
        },
        ink: {
          DEFAULT: '#111827',
          muted: '#6B7280',
          faint: '#9CA3AF',
        },
        canvas: {
          DEFAULT: '#FAFAF8',
          warm: '#F5F3EF',
        },
      },
      fontFamily: {
        display: ['var(--font-bricolage)', 'system-ui', 'sans-serif'],
        body: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        phone: '44px',
        screen: '36px',
      },
      boxShadow: {
        phone: '0 50px 100px -20px rgba(17, 24, 39, 0.25), 0 30px 60px -30px rgba(91, 79, 232, 0.35)',
        card: '0 1px 2px rgba(17,24,39,0.04), 0 8px 24px rgba(17,24,39,0.06)',
        glow: '0 0 80px rgba(91, 79, 232, 0.15)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
