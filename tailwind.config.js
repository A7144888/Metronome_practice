/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        md: {
          bg:                    '#FFFBFE',
          fg:                    '#1C1B1F',
          primary:               '#6750A4',
          'on-primary':          '#FFFFFF',
          'primary-container':   '#EADDFF',
          'secondary-container': '#E8DEF8',
          'on-secondary-container': '#1D192B',
          tertiary:              '#7D5260',
          'on-tertiary':         '#FFFFFF',
          surface:               '#F3EDF7',
          'surface-low':         '#E7E0EC',
          'surface-high':        '#ECE6F0',
          outline:               '#79747E',
          'on-surface-variant':  '#49454F',
          error:                 '#B3261E',
          'on-error':            '#FFFFFF',
        },
      },
      fontFamily: {
        sans:    ['Roboto', 'sans-serif'],
        display: ['Roboto', 'sans-serif'],
      },
      borderRadius: {
        xs:      '8px',
        sm:      '12px',
        DEFAULT: '16px',
        md:      '16px',
        lg:      '24px',
        xl:      '28px',
        '2xl':   '32px',
        '3xl':   '48px',
        full:    '9999px',
      },
      boxShadow: {
        'md3-1': '0 1px 3px 1px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.08)',
        'md3-2': '0 2px 6px 2px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.08)',
        'md3-3': '0 4px 8px 3px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.08)',
        'md3-4': '0 6px 10px 4px rgba(0,0,0,0.07), 0 2px 3px rgba(0,0,0,0.08)',
        glow:    '0 0 40px rgba(103, 80, 164, 0.3)',
        'glow-sm': '0 0 15px rgba(103, 80, 164, 0.4)',
      },
      animation: {
        'pulse-fast': 'pulse 0.3s ease-in-out',
        'beat-flash': 'beatFlash 0.15s ease-out',
      },
      keyframes: {
        beatFlash: {
          '0%':   { opacity: '1', transform: 'scale(1.05)' },
          '100%': { opacity: '0.7', transform: 'scale(1)' },
        },
      },
      transitionTimingFunction: {
        'md3': 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
}
