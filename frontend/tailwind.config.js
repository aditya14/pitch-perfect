/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff6347', // Light mode primary (e.g., tomato)
          dark: '#e5533c',    // Dark mode primary variant
        },
      },
    },
  },
  plugins: [],
}