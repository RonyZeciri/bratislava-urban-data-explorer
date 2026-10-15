import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { readFrontendConfig } from './src/config/parseConfig.ts'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  // Rovnaké pravidlá ako v prehliadači; neplatná konfigurácia zastaví aj build.
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NODE_ENV'])
  if (command === 'build' && env.NODE_ENV !== 'production') {
    throw new Error('Produkčný build vyžaduje NODE_ENV=production; odstráň vývojové prepisovanie NODE_ENV.')
  }
  readFrontendConfig(env, command === 'build' || process.env.NODE_ENV === 'production')
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
