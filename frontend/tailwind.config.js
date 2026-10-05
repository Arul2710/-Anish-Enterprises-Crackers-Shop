/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand ramp: gold #D4AF37 carries highlights, buttons, icons and borders, while
        // green #006400 carries the primary backgrounds, headings and key UI. The token
        // names are kept from the previous palette so no component had to be touched.
        ink: '#0b1f0b',
        charcoal: '#002b00',
        ember: '#D4AF37',
        // The old palette referenced emberDark on hover but never defined it, so no rule
        // was generated and the hover state silently did nothing.
        emberDark: '#8a6d1f',
        flame: '#8a6d1f',
        marigold: '#D4AF37',
        secondary: '#D4AF37',
        secondarySoft: '#fbf6e8',
        cream: '#ffffff',
        mist: '#ffffff',
        tint: '#ffffff',
        tintEdge: '#e8dcbc',
        // White on #D4AF37 measures 2.1:1, so anything sitting on gold takes this instead.
        onGold: '#002b00',

        // Catalog surface tokens
        navy: '#006400',
        navySoft: '#004d00',
        navyMute: '#3f6b3f',
        line: '#eae7dd',
        lineSoft: '#f6f8f4',
        panel: '#fbfdfa',
        royal: '#006400',
        royalDark: '#004d00',
        royalSoft: '#e8f3e8',
        success: '#006400',
        successSoft: '#e8f3e8',
        gold: '#D4AF37',
        goldSoft: '#fdf9ee',
        goldEdge: '#e8dcbc',
        goldBright: '#D4AF37',
        price: '#0b1f0b',
        priceSoft: '#f2f7f0',

        // Flat gold ramp for chips, swatches and tone maps
        goldSurface: '#fbf6e8',
        goldWash: '#fdf9ee',
        // Gold too light to read on white, so text uses these two darker steps instead.
        goldInk: '#6b5215',
        goldDeep: '#8a6d1f',
        goldLine: '#e8dcbc',
        goldDot: '#b8860b',
      },
      boxShadow: {
        soft: '0 20px 60px rgba(212, 175, 55, 0.14)',
        glow: '0 0 0 1px rgba(212, 175, 55, 0.20), 0 18px 50px rgba(212, 175, 55, 0.20)',
        card: '0 1px 2px rgba(11, 31, 11, 0.04), 0 8px 24px rgba(11, 31, 11, 0.05)',
        'card-hover': '0 2px 4px rgba(11, 31, 11, 0.05), 0 18px 40px rgba(11, 31, 11, 0.10)',
        panel: '0 1px 2px rgba(11, 31, 11, 0.04), 0 12px 32px rgba(11, 31, 11, 0.06)',
        bar: '0 -6px 24px rgba(11, 31, 11, 0.10)',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        widest: '0.22em',
      },
      keyframes: {
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-in': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 220ms ease-out both',
        'sheet-in': 'sheet-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
