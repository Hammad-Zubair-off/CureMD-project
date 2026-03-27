import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    host: true,

    proxy: {
      '/api': {
        target: 'http://localhost:80',
        // target: process.env.NGINX_HOST
        //   ? `http://${process.env.NGINX_HOST}:80`
        //   : 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
