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
        // Bubblepop (mobile-only) palette
        'bb-bg': '#FFF1F4',
        'bb-bg-2': '#FFE2EA',
        'bb-bg-soft': '#FFF8FA',
        'bb-surface': '#FFFFFF',
        'bb-ink': '#3A1740',
        'bb-ink-2': '#9C6E92',
        'bb-ink-3': '#C8AEC2',
        'bb-primary': '#FF7AB6',
        'bb-mint': '#7FDDD2',
        'bb-yellow': '#FFD93D',
        'bb-sky': '#A5D8FF',
        'bb-lilac': '#D5B3FF',
        'bb-cream': '#FFF4D6',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        // Bubblepop "Sweet" preset
        lilita: ['"Lilita One"', '"Quicksand"', 'system-ui', 'sans-serif'],
        quicksand: ['"Quicksand"', 'system-ui', 'sans-serif'],
        shadows: ['"Shadows Into Light"', 'cursive'],
      },
      boxShadow: {
        card: '0 2px 10px rgba(100, 60, 180, 0.05)',
        elevated: '0 2px 12px rgba(100, 60, 180, 0.07)',
        glow: '0 0 0 3px #fff, 0 0 0 5px rgba(200, 241, 53, 0.33)',
        // Bubblepop hard-offset shadow scale (static — color-derived shadows
        // are computed inline since Tailwind can't darken dynamically).
        'bb-card': '0 2px 0 rgba(58,23,64,0.06)',
        'bb-row': '0 2px 0 rgba(58,23,64,0.08)',
      },
    },
  },
  plugins: [],
}
