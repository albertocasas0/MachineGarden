/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta sección 2.2 — se reemplaza fácil cambiando estas vars.
        jg: {
          primario:    '#2F5233',
          secundario:  '#4C7A3F',
          fondoSuave:  '#E8F0E3',
          tierra:      '#6B4A2F',
          exito:       '#3A9B4C',
          alerta:      '#D9A400',
          error:       '#C0392B',
          texto:       '#3A3A3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
      },
      minHeight: { 'mobile-tap': '44px' },
    },
  },
  plugins: [],
};
