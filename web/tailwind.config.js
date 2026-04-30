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
          surface: '#121218',
          panel: '#16161c',
          border: '#2a2a32',
          gold: '#c9a227',
          cream: '#f5e6c8',
          muted: '#8a8580',
          bubble: {
            user: '#2f3f52',
            assistant: '#1e1e26',
          },
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        composer: '0 0 0 1px rgba(255, 255, 255, 0.06), 0 12px 48px rgba(0, 0, 0, 0.45)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out forwards',
        'fade-in-fast': 'fade-in-fast 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};
