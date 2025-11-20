/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        belims: {
          blue: '#322783', // New Belims Deep Blue
          light: '#4a3fc2', // Slightly lighter for hover states/accents
          accent: '#e40613', // New Belims Red
          gray: '#f4f6f8', // Light background
          text: '#333333'
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        heading: ['"Inter"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}