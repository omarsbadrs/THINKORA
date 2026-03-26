import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Map to CSS variables from the original design
        layout: 'var(--bg-layout)',
        container: 'var(--bg-container)',
        elevated: 'var(--bg-elevated)',
        card: 'var(--bg-card)',
        'card-hover': 'var(--bg-card-hover)',
        sidebar: 'var(--bg-sidebar)',
        primary: 'var(--color-primary)',
        'primary-bg': 'var(--color-primary-bg)',
        'primary-border': 'var(--color-primary-border)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease',
        'slide-up': 'slideUp 0.6s var(--ease-out)',
        'scale-in': 'scaleIn 0.4s var(--ease-out)',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
