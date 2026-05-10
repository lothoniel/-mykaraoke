/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#faf8fc',
        lavender: '#c8b6db',
        'lavender-dark': '#9b7fbf',
        'lavender-light': '#e8daf5',
        'lavender-soft': '#f0e6fd',
        ink: '#333',
        muted: '#999',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
