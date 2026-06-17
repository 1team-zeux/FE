import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const AUTH_URL = env.AUTH_SERVER_URL ?? 'http://localhost:8081'
  const SLA_URL = env.SLA_AGENT_URL ?? 'http://localhost:8090'
  const FINOPS_URL = env.VITE_FINOPS_API_URL ?? SLA_URL
  const MONITOR_URL = env.MONITORING_API_URL ?? 'http://localhost:8091'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/auth': { target: AUTH_URL, changeOrigin: true },
        '/api/v1': { target: SLA_URL, changeOrigin: true },
        '/tenants': { target: SLA_URL, changeOrigin: true },
        '/api/finops': { target: FINOPS_URL, changeOrigin: true },
        '/api/rca': { target: SLA_URL, changeOrigin: true },
        '/monitoring': {
          target: MONITOR_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/monitoring/, ''),
        },
        '/terraform': { target: SLA_URL, changeOrigin: true },
        '/api/terraform': { target: SLA_URL, changeOrigin: true },
        '/sla-bundles': { target: SLA_URL, changeOrigin: true },
        '/topologies': { target: SLA_URL, changeOrigin: true },
        '/api/topologies': { target: SLA_URL, changeOrigin: true },
        '/upload-sessions': { target: SLA_URL, changeOrigin: true },
      },
    },
  }
})
