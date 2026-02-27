/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b7fc7',
          600: '#7c6fb8',
          700: '#6d5fa3',
          800: '#5a4d87',
          900: '#4a3f6f',
        },
        primary: {
          light: '#e8e4f3',
          DEFAULT: '#8b7fc7',
          dark: '#6d5fa3',
        }
      }
    },
  },
  plugins: [],
}
