/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#ffffff',
        coral: '#E8694A',
        'coral-dark': '#C95233',
        'coral-light': '#FDEEE9',
        'coral-soft': '#FDF5F3',
        ink: '#1A1A1A',
        muted: '#6B7280',
        border: '#E5E7EB',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
