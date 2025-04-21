/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PT Sans"', 'sans-serif'], // Add PT Sans as the default sans-serif font
        caption: ['"PT Sans Caption"', 'sans-serif'], // New caption font
      },
      colors: {
        primary: {
          50: '#e6fafd',
          100: '#ccf5fb',
          200: '#99ebf8',
          300: '#66e0f4',
          400: '#33d6f1',
          500: '#1FBEDD', // Your main color
          600: '#199bb1',
          700: '#147886',
          800: '#0e505a',
          900: '#07282d',
          950: '#041417',
          DEFAULT: '#1FBEDD', // Your main color
          dark: '#1FBEDD',
        },
      },
    },
  },
  plugins: [],
}