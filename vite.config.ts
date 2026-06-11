import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      // auth-server (8081) — login, admin register, introspect
      '/auth': { target: 'http://localhost:8081', changeOrigin: true },
      // sla-agent-service (8090) — onboard API, contract, tenants
      '/api/v1': { target: 'http://localhost:8090', changeOrigin: true },
      '/tenants': { target: 'http://localhost:8090', changeOrigin: true },
      // FinOps agent (sla-agent-service legacy port or dedicated)
      '/api/finops': {
        target: process.env.VITE_FINOPS_API_URL ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // monitoring-api (8091) — Prometheus/Tempo/Loki stateless 쿼리
      '/monitoring': { target: 'http://localhost:8091', changeOrigin: true },
      // aiops-service (via api-gateway 8080) — IaC, terraform, sla-bundles
      '/terraform': { target: 'http://localhost:8080', changeOrigin: true },
      '/sla-bundles': { target: 'http://localhost:8080', changeOrigin: true },
      '/topologies': { target: 'http://localhost:8080', changeOrigin: true },
      '/upload-sessions': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
