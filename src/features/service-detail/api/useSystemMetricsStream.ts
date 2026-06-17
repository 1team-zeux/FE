import { ref, watch, onUnmounted, type Ref } from 'vue'
import { SystemMetricsSchema, type SystemMetrics } from '../types/metrics.schema'

export function useSystemMetricsStream(svcId: string, tenantId: string, isLive: Ref<boolean>) {
  const data  = ref<SystemMetrics | null>(null)
  const error = ref<string | null>(null)
  let   es: EventSource | null = null

  function connect() {
    es?.close()
    const url = `/monitoring/api/v1/services/${encodeURIComponent(svcId)}/system-metrics/stream?tenant_id=${encodeURIComponent(tenantId)}`
    es = new EventSource(url)

    es.onmessage = (e) => {
      try {
        data.value  = SystemMetricsSchema.parse(JSON.parse(e.data))
        error.value = null
      } catch (err) {
        error.value = String(err)
      }
    }

    es.addEventListener('svc-error', (e: MessageEvent) => {
      error.value = e.data ?? 'Stream error'
    })

    es.onerror = () => {
      disconnect()
      if (!isLive.value) return
      if (!data.value) error.value = '연결 중...'
      setTimeout(() => {
        if (isLive.value) connect()
      }, 3_000)
    }
  }

  function disconnect() {
    es?.close()
    es = null
  }

  watch(isLive, (live) => (live ? connect() : disconnect()), { immediate: true })
  onUnmounted(() => disconnect())

  return { data, error }
}
