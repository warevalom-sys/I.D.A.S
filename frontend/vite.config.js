import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El navegador (PC o celular) solo habla con Vite; Vite reenvia /api y /health
// al backend. Asi el mismo codigo funciona en 127.0.0.1 y a traves del tunel
// HTTPS, sin CORS y sin editar el .env entre pruebas.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                        // accesible desde otros dispositivos
    allowedHosts: ['.devtunnels.ms'],  // permite el tunel de VS Code
    proxy: {
      '/api':    { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  // Pruebas con Vitest (npm test): navegador simulado, solo la carpeta tests/
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{js,jsx}'],
  },
})
