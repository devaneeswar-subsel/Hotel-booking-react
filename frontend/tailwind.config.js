/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
  extend: {
    colors: {
      navy: "#0F1923",
      gold: "#C9A84C",
    },
    fontFamily: {
      display: ["'Playfair Display'", "serif"],
    },
  },
},
  plugins: [],
}