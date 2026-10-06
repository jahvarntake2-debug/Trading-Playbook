import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 20px 45px rgba(15, 23, 42, 0.12)',
      },
      colors: {
        canvas: '#ffffff',
        ink: '#111827',
        primary: '#3b82f6',
        secondary: '#10b981',
        accent: '#f59e0b',
        muted: '#f3f4f6',
        line: '#e5e7eb',
      },
    },
  },
  plugins: [],
};

export default config;
