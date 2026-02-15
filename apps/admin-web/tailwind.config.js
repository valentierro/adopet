/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
