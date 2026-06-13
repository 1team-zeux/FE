import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const slaAgentTarget = process.env.VITE_SLA_AGENT_URL ?? 'http://localhost:8090'

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
      '/api/v1': { target: slaAgentTarget, changeOrigin: true },
      '/tenants': { target: slaAgentTarget, changeOrigin: true },
      // FinOps agent (sla-agent-service legacy port or dedicated)
      '/api/finops': {
        target: process.env.VITE_FINOPS_API_URL ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // RCA read API (sla-agent-service)
      '/api/rca': {
        target: slaAgentTarget,
        changeOrigin: true,
      },
      // monitoring-api (8091) — /monitoring prefix strip 후 전달
      '/monitoring': {
        target: 'http://localhost:8091',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/monitoring/, ''),
      },
      // Local dev compatibility: gateway 없이 sla-agent-service가 직접 처리
      '/terraform': { target: slaAgentTarget, changeOrigin: true },
      '/api/terraform': { target: slaAgentTarget, changeOrigin: true },
      // sla-agent-service (8090) — Service bundle workflow
      '/sla-bundles': { target: slaAgentTarget, changeOrigin: true },
      '/topologies': { target: slaAgentTarget, changeOrigin: true },
      '/api/topologies': { target: slaAgentTarget, changeOrigin: true },
      '/upload-sessions': { target: slaAgentTarget, changeOrigin: true },
    },
  },
})
