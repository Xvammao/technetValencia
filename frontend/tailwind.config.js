/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecf5ff',
          100: '#d7e8ff',
          200: '#a9ccff',
          300: '#7aaeFF',
          400: '#4c91ff',
          500: '#1e74ff',
          600: '#145cd6',
          700: '#0f46a3',
          800: '#08306f',
          900: '#03193a',
        },
      },
    },
  },
  plugins: [],
};
