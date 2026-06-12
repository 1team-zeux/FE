import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const AUTH_URL    = env.AUTH_SERVER_URL    ?? 'http://localhost:8081'
  const SLA_URL     = env.SLA_AGENT_URL      ?? 'http://localhost:8090'
  const MONITOR_URL = env.MONITORING_API_URL ?? 'http://localhost:8091'
  const GATEWAY_URL = env.API_GATEWAY_URL    ?? 'http://localhost:8080'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/auth':           { target: AUTH_URL,    changeOrigin: true },
        '/api/v1':         { target: SLA_URL,     changeOrigin: true },
        '/tenants':        { target: SLA_URL,     changeOrigin: true },
        '/api/finops':     { target: SLA_URL,     changeOrigin: true },
        '/api/rca':        { target: SLA_URL,     changeOrigin: true },
        '/monitoring': {
          target: MONITOR_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/monitoring/, ''),
        },
        '/terraform':      { target: GATEWAY_URL, changeOrigin: true },
        '/sla-bundles':    { target: GATEWAY_URL, changeOrigin: true },
        '/topologies':     { target: GATEWAY_URL, changeOrigin: true },
        '/upload-sessions':{ target: GATEWAY_URL, changeOrigin: true },
      },
    },
  }
})
