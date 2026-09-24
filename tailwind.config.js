/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: '#0f1115',
          panel: '#161920',
          subpanel: '#1b1f28',
          border: '#272d3b',
          trackBg: '#12151c',
          trackAlt: '#141821',
          rulerBg: '#181c25',
          textMuted: '#7f8a9f',
          textMain: '#e2e8f0',
          accent: '#3b82f6',
          playhead: '#ef4444',
          snapGuide: '#eab308',
        }
      }
    },
  },
  plugins: [],
}
