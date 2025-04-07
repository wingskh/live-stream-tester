import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [
    solidPlugin(),
    tailwindcss(),
  ],
  css: {
    postcss: {
      plugins: [
        autoprefixer,
      ],
    },
  },
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})
