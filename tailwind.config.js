/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        text: 'var(--text)',
        text2: 'var(--text2)',
        danger: 'var(--danger)',
        warning: 'var(--warning)'
      },
      fontFamily: { mono: ['Fira Code', 'monospace'] }
    }
  },
  plugins: []
}