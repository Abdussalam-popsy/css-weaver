/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        'weaver-bg': '#1a1a1a',
        'weaver-panel': '#242424',
        'weaver-border': '#333333',
        'weaver-accent': '#22c55e',
        'weaver-accent-hover': '#16a34a',
      },
    },
  },
  plugins: [],
};
