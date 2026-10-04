/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        ink: {
          50: '#f5f6f8',
          100: '#e7e9ee',
          200: '#c8ccd5',
          300: '#9aa1b0',
          400: '#6d7587',
          500: '#4a5163',
          600: '#2f3545',
          700: '#1f2533',
          800: '#161b27',
          900: '#0e121b',
          950: '#0a0d14',
        },
        ember: {
          50: '#fff4ec',
          100: '#ffe6d0',
          200: '#ffc79c',
          300: '#ff9d5e',
          400: '#ff7a2e',
          500: '#f25a0e',
          600: '#d04303',
          700: '#a23104',
          800: '#80290d',
          900: '#69240f',
        },
        brand: {
          DEFAULT: '#f25a0e',
          50: '#fff4ec',
          500: '#f25a0e',
          600: '#d04303',
        },
      },
      letterSpacing: {
        'tightest-': '-0.04em',
        'tighter-': '-0.025em',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(242,90,14,0.35), 0 8px 32px -8px rgba(242,90,14,0.25)',
        ridge: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
