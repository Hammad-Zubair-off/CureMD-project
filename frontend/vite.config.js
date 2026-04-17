import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const gatewayHost = process.env.NGINX_HOST || 'localhost'
const gatewayPort = process.env.NGINX_PORT || '80'
const gatewayTarget = `http://${gatewayHost}:${gatewayPort}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    host: true,

    proxy: {
      '/api': {
        target: gatewayTarget,
        //target: 'http://localhost:80',
        // target: `http://${gatewayHost}:80`,
        // target: process.env.NGINX_HOST
        //   ? `http://${process.env.NGINX_HOST}:80`
        //   : 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
