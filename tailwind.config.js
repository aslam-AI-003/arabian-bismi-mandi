/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#D4A44C',
          'gold-light': '#E8C97A',
          'gold-dark': '#B8862E',
          maroon: '#5C1A1B',
          burgundy: '#7A2829',
        },
        dark: {
          primary: '#1A0A0A',
          secondary: '#2D1515',
          tertiary: '#3D1A1A',
        },
        accent: {
          orange: '#FF6B35',
          amber: '#FFB347',
          warm: '#E8A555',
        },
        cream: '#FFF8E7',
        muted: '#B8A88A',
      },
      fontFamily: {
        primary: ['Poppins', 'sans-serif'],
        decorative: ['Playfair Display', 'serif'],
        arabic: ['Cairo', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #E8C97A, #D4A44C)',
        'gradient-dark': 'linear-gradient(180deg, #1A0A0A, #3D1A1A)',
        'gradient-card': 'linear-gradient(145deg, rgba(45,21,21,0.9), rgba(26,10,10,0.95))',
      },
      boxShadow: {
        gold: '0 4px 15px rgba(212, 164, 76, 0.4)',
        'gold-lg': '0 10px 30px rgba(212, 164, 76, 0.3)',
        glow: '0 0 20px rgba(212, 164, 76, 0.3)',
      },
    },
  },
  plugins: [],
}
