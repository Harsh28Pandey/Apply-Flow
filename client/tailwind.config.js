/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316', // Main Primary Orange
          600: '#EA580C', // Deep Orange
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        brand: {
          orange: '#F97316',
          darkOrange: '#EA580C',
          amber: '#F59E0B',
          light: '#FFF9F5',
          surface: '#FFFFFF',
          border: '#FED7AA',
        },
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        success: {
          50: '#F0FDF4',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        danger: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        info: {
          50: '#F0F9FF',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(249, 115, 22, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 25px -3px rgba(249, 115, 22, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
        'orange-glow': '0 4px 20px -2px rgba(249, 115, 22, 0.35)',
      },
    },
  },
  plugins: [],
}
