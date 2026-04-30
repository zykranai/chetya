/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        chetya: {
          bg: '#0d0d10',
          panel: '#16161c',
          border: '#2a2a32',
          gold: '#c9a227',
          cream: '#f5e6c8',
          muted: '#8a8580',
        },
      },
    },
  },
  plugins: [],
};
