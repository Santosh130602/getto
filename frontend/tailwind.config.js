/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#effcf9', 100: '#d3f8f0', 200: '#a9eee1', 400: '#4fd1b9', 500: '#2fb7a3', 600: '#259a9a', 700: '#2a7f9c', 800: '#2f6b88' },
      },
      fontFamily: { sans: ['Outfit', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
