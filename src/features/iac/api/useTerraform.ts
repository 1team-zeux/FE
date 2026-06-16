import { ref } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { useIacStore } from '../stores/iac.store'
import type { Ref } from 'vue'

const GENERATE_RETRY_DELAY_MS = 500
const GENERATE_MAX_ATTEMPTS = 6

export interface ResourceStatus {
  resource: string
  status: 'pending' | 'in_progress' | 'complete' | 'error'
  detail: string
}

export interface PlanItem {
  address: string
  type: string
  actions: Array<'create' | 'update' | 'delete' | 'replace' | 'no-op'>
}

export interface PlanResult {
  planId: string
  summary: { add: number; change: number; destroy: number }
  items: PlanItem[]
}

type GenerateTerraformResponse = { planId: string; hclPreview: string }
type ApiErrorLike = Error & { status?: number }

function sleep(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms))
}

export function isApprovedTopologyPendingError(error: unknown) {
  if (!(error instanceof Error)) return false
  const status = (error as ApiErrorLike).status
  return status === 404 && error.message.includes('Approved topology not found')
}

export async function generateTerraformWithRetry(topologyId: string) {
  let lastError: unknown

  for (let attempt = 1; attempt <= GENERATE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await api.post<GenerateTerraformResponse>('/terraform/generate', { topologyId })
      return res.data
    } catch (error) {
      lastError = error
      if (!isApprovedTopologyPendingError(error) || attempt === GENERATE_MAX_ATTEMPTS) {
        throw error
      }
      await sleep(GENERATE_RETRY_DELAY_MS)
    }
  }

  throw lastError ?? new Error('Terraform generate failed')
}

export function useGenerateTerraform() {
  const store = useIacStore()
  return useMutation({
    mutationFn: async (topologyId: string) => {
      return generateTerraformWithRetry(topologyId)
    },
    onMutate() { store.setDeployStatus('generating') },
    onSuccess() { store.setDeployStatus('planning') },
    onError() { store.setDeployStatus('error') },
  })
}

export function useTerraformPlan() {
  return useMutation({
    mutationFn: async (planId: string) => {
      const res = await api.post<PlanResult>('/terraform/plan', { planId })
      return res.data
    },
  })
}

export function useTerraformApply() {
  const store = useIacStore()
  const resources = ref<ResourceStatus[]>([])
  const isStreaming = ref(false)
  const isApplyDone = ref(false)
  let eventSource: EventSource | null = null

  async function startApply(planId: string, initialResources: string[] = []) {
    store.setDeployStatus('applying')
    isStreaming.value = true
    isApplyDone.value = false
    resources.value = initialResources.map(resource => ({
      resource,
      status: 'pending' as const,
      detail: '대기 중',
    }))

    eventSource = new EventSource(`/terraform/apply/stream?planId=${planId}`)

    eventSource.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as ResourceStatus
      const idx = resources.value.findIndex((r) => r.resource === data.resource)
      if (idx >= 0) {
        resources.value[idx] = data
      } else {
        resources.value.push(data)
      }
    }

    eventSource.addEventListener('done', () => {
      eventSource?.close()
      eventSource = null
      isStreaming.value = false
      isApplyDone.value = true
      // 자동 검증 전환 없음 — 운영자가 "검증 시작" 버튼으로 직접 진행
    })

    eventSource.onerror = () => {
      eventSource?.close()
      eventSource = null
      isStreaming.value = false
      store.setDeployStatus('error')
    }
  }

  function stopApply() {
    eventSource?.close()
    eventSource = null
    isStreaming.value = false
    store.setDeployStatus('idle')
  }

  return { resources, isStreaming, isApplyDone, startApply, stopApply }
}

export interface PingResult {
  resource: string
  endpoint: string
  status: 'ok' | 'fail'
  latencyMs: number
  detail: string
}

export interface VerifyResult {
  verifyId: string
  overall: 'pass' | 'fail'
  pings: PingResult[]
}

export function useTerraformVerify(planId: Ref<string | null>) {
  return useQuery({
    queryKey: ['terraform-verify', planId],
    queryFn: async () => {
      const res = await api.get(`/terraform/verify/${planId.value}`)
      return res.data as VerifyResult
    },
    enabled: () => !!planId.value,
  })
}
