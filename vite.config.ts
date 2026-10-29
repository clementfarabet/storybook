import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    proxy: {
      '/storybook/api': {
        target: 'http://127.0.0.1:8794',
        changeOrigin: true,
      },
    },
  },
})
