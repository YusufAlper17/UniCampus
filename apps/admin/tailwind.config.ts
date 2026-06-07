import type { Config } from 'tailwindcss';

// Renkler design token'larıyla hizalı (packages/ui/src/tokens.ts).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#5B4FE8',
        'primary-dark': '#4338CA',
        accent: '#F59E0B',
        success: '#10B981',
        danger: '#EF4444',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};

export default config;
