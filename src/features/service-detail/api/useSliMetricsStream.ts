import { ref, watch, onUnmounted, type Ref } from 'vue'
import { ServiceDetailSchema, type ServiceDetail } from '../types/metrics.schema'

export function useSliMetricsStream(svcId: string, tenantId: string, isLive: Ref<boolean>) {
  const data  = ref<ServiceDetail | null>(null)
  const error = ref<string | null>(null)
  let   es: EventSource | null = null

  function connect() {
    es?.close()
    const url = `/monitoring/api/v1/services/${encodeURIComponent(svcId)}/sli-metrics/stream?tenant_id=${encodeURIComponent(tenantId)}`
    es = new EventSource(url)

    es.onmessage = (e) => {
      try {
        data.value  = ServiceDetailSchema.parse(JSON.parse(e.data))
        error.value = null
      } catch (err) {
        // parse 실패는 기존 data 유지, error만 기록
        error.value = String(err)
      }
    }

    es.addEventListener('svc-error', (e: MessageEvent) => {
      error.value = e.data ?? 'Stream error'
    })

    es.onerror = () => {
      disconnect()
      if (!isLive.value) return
      // 데이터 이미 있으면 UI 유지한 채 조용히 재연결
      // 데이터 없으면 "연결 중..." 표시
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
