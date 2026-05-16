/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F5F1FF',
        sidebar: '#FDFBFF',
        surface: '#FFFFFF',
        'surface-2': '#EBE4FF',
        border: 'rgba(100, 60, 180, 0.09)',
        text: '#1C0840',
        'text-2': '#7060A0',
        accent: 'var(--accent)',
        'accent-strong': 'var(--accent-strong)',
        'accent-text': '#1C0840',
        success: '#16A34A',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 10px rgba(100, 60, 180, 0.05)',
        elevated: '0 2px 12px rgba(100, 60, 180, 0.07)',
        glow: '0 0 0 3px #fff, 0 0 0 5px rgba(200, 241, 53, 0.33)',
      },
    },
  },
  plugins: [],
}
