import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El navegador (PC o celular) solo habla con Vite; Vite reenvía /api y /health
// al backend. Así el mismo código funciona en localhost y a través del túnel
// HTTPS, sin CORS y sin editar el .env entre pruebas.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                        // accesible desde otros dispositivos
    allowedHosts: ['.devtunnels.ms'],  // permite el túnel de VS Code
    proxy: {
      '/api':    { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})