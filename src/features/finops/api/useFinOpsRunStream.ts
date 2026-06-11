import { onUnmounted, ref } from 'vue'

export interface FinOpsStreamDone {
  skipped?: boolean
  run_id?: string
  batch_id?: string
  tenant_id?: string
  service_id?: string
  status?: string
  eligible_count?: number
  error?: string
}

export interface UseFinOpsRunStreamOptions {
  tenantId?: string
  teamId?: string
  serviceId?: string
  force?: boolean
}

export function useFinOpsRunStream() {
  const lines = ref<string[]>([])
  const isStreaming = ref(false)
  const isDone = ref(false)
  const error = ref<string | null>(null)
  const donePayload = ref<FinOpsStreamDone | null>(null)

  let eventSource: EventSource | null = null

  function stop() {
    eventSource?.close()
    eventSource = null
    isStreaming.value = false
  }

  function appendLine(line: string) {
    lines.value = [...lines.value, line]
  }

  function start(opts: UseFinOpsRunStreamOptions = {}) {
    stop()
    lines.value = []
    isDone.value = false
    error.value = null
    donePayload.value = null
    isStreaming.value = true

    const params = new URLSearchParams({
      tenant_id: opts.tenantId ?? 'demo-tenant',
      team_id: opts.teamId ?? 'demo-team',
      service_id: opts.serviceId ?? 'api-gateway',
      force: String(opts.force ?? false),
      persist: import.meta.env.VITE_FINOPS_STREAM_PERSIST ?? 'true',
    })

    eventSource = new EventSource(`/api/finops/run/stream?${params}`)

    eventSource.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { type?: string; line?: string }
        if (data.type === 'line' && data.line) {
          appendLine(data.line)
        }
      } catch {
        appendLine(e.data)
      }
    }

    eventSource.addEventListener('done', (e: Event) => {
      const msg = e as MessageEvent
      try {
        donePayload.value = JSON.parse(msg.data) as FinOpsStreamDone
      } catch {
        donePayload.value = {}
      }
      isDone.value = true
      isStreaming.value = false
      eventSource?.close()
      eventSource = null
    })

    eventSource.onerror = () => {
      if (!isDone.value) {
        error.value = 'FinOps stream 연결 실패'
      }
      isStreaming.value = false
      eventSource?.close()
      eventSource = null
    }
  }

  onUnmounted(stop)

  return { lines, isStreaming, isDone, error, donePayload, start, stop, appendLine }
}
