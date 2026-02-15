/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'police-blue': {
          DEFAULT: '#0A1F44',
          dark: '#08142B',
          light: '#0D2A5C',
        },
        'police-red': {
          DEFAULT: '#B11226',
          accent: '#E63946',
          dark: '#8A0E1C',
        },
        'gray-light': '#F1F5F9',
      },
    },
  },
  plugins: [],
};
