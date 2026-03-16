/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "primary-hover": "rgb(var(--color-primary) / <alpha-value>)",
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--color-surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--color-surface-3) / <alpha-value>)",
        "surface-4": "rgb(var(--color-surface-4) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        "on-primary": "rgb(var(--color-on-primary) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
        "tone-critical": "rgb(var(--tone-critical) / <alpha-value>)",
        "tone-high": "rgb(var(--tone-high) / <alpha-value>)",
        "tone-medium": "rgb(var(--tone-medium) / <alpha-value>)",
        "tone-low": "rgb(var(--tone-low) / <alpha-value>)",
        "tone-info": "rgb(var(--tone-info) / <alpha-value>)",
        "tone-success": "rgb(var(--tone-success) / <alpha-value>)",
        "tone-warning": "rgb(var(--tone-warning) / <alpha-value>)",
        "tone-neutral": "rgb(var(--tone-neutral) / <alpha-value>)",
        // Map white to theme foreground so existing text-white adapts to light/dark.
        white: "rgb(var(--color-foreground) / <alpha-value>)"
      },
      animation: {
        'blob': 'blob 7s infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
