import { ref } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { useIacStore } from '../stores/iac.store'
import type { Ref } from 'vue'

export interface ResourceStatus {
  resource: string
  status: 'pending' | 'in_progress' | 'complete' | 'error'
  detail: string
}

export interface PlanItem {
  resource: string
  changeType: 'add' | 'change' | 'destroy'
  riskLevel: 'low' | 'medium' | 'high'
  slaImpact: string
  estimatedCost: string
}

export interface PlanResult {
  planId: string
  summary: { add: number; change: number; destroy: number }
  riskLevel: string
  items: PlanItem[]
}

export function useGenerateTerraform() {
  const store = useIacStore()
  return useMutation({
    mutationFn: async (topologyId: string) => {
      const res = await api.post<{ planId: string; hclPreview: string }>('/terraform/generate', { topologyId })
      return res.data
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

    eventSource = new EventSource(`/api/terraform/apply/stream?planId=${planId}`)

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
