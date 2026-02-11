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
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern':
          'radial-gradient(circle at 20% 80%, rgba(13, 148, 136, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(217, 119, 6, 0.06) 0%, transparent 50%)',
      },
    },
  },
  plugins: [],
};
