/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        alma: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f472b6',
          400: '#f14298',
          500: '#ec268f', // Official Alma Magenta
          600: '#db1378',
          700: '#be0e65',
          800: '#9d0f54',
          900: '#831248',
          950: '#4e0427',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d4af37', // Champagne Gold
          600: '#b89025',
          700: '#8f6e1b',
        },
        obsidian: {
          950: '#070a10',
          900: '#0c111d',
          850: '#111827',
          800: '#161f33',
          700: '#1f293d',
        }
      },
      fontFamily: {
        vazir: ['Vazirmatn', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-alma': '0 0 35px -5px rgba(236, 38, 143, 0.35)',
        'glow-gold': '0 0 35px -5px rgba(212, 175, 55, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
