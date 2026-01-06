/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'hsl(var(--app-bg))',
          surface: 'hsl(var(--app-surface))',
          surface2: 'hsl(var(--app-surface-2))',
          border: 'hsl(var(--app-border))',
          text: 'hsl(var(--app-text))',
          muted: 'hsl(var(--app-muted))'
        },
        brand: {
          50: 'hsl(var(--brand-50))',
          100: 'hsl(var(--brand-100))',
          200: 'hsl(var(--brand-200))',
          300: 'hsl(var(--brand-300))',
          400: 'hsl(var(--brand-400))',
          500: 'hsl(var(--brand-500))',
          600: 'hsl(var(--brand-600))',
          700: 'hsl(var(--brand-700))'
        }
      },
      boxShadow: {
        app: '0 20px 60px rgba(0,0,0,.35)'
      }
    }
  },
  plugins: []
}
