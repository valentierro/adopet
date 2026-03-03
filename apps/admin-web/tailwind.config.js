/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
      },
      colors: {
        adopet: {
          primary: '#0D9488',
          'primary-dark': '#0F766E',
          orange: '#D97706',
          'orange-light': '#F59E0B',
          accent: '#E11D48',
          background: '#E5EDEA',
          surface: '#D4E2DD',
          header: '#C8DAD4',
          card: '#FFFFFF',
          'text-primary': '#1C1917',
          'text-secondary': '#57534E',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
