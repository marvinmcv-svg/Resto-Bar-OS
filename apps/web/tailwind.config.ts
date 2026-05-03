import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0a',
          secondary: '#141414',
          elevated: '#1a1a1a',
        },
        accent: {
          gold: '#c9a962',
          'gold-light': '#e5c98a',
          'gold-muted': '#8a7340',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        ui: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;