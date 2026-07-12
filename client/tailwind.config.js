/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0d0d',
        panel: '#141414',
        border: '#2a2a2a',
        accent: '#c9821a',
        ok: '#4caf50',
        info: '#2196f3',
        warn: '#e08b1c',
        danger: '#e05a5a'
      }
    }
  },
  plugins: []
};
