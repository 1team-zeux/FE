import { ref } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { api } from '@/services/api'
import { useIacStore } from '../stores/iac.store'
import type { Ref } from 'vue'

// select 엔드포인트가 비동기 워크플로우 완료 전 반환할 경우의 race 방지용 retry.
// 백엔드도 select를 동기로 만들었지만 방어층으로 충분한 여유 둔다 (45초 budget).
const GENERATE_RETRY_DELAY_MS = 1500
const GENERATE_MAX_ATTEMPTS = 30

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
  planOutput?: string  // `terraform plan` 콘솔 출력 형태 (변경점 diff)
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

export type DeployMode = 'full' | 'minimal'

export async function generateTerraformWithRetry(
  topologyId: string,
  workflowId: string | null,
  mode: DeployMode = 'full',
) {
  let lastError: unknown

  for (let attempt = 1; attempt <= GENERATE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await api.post<GenerateTerraformResponse>('/terraform/generate', {
        topologyId,
        workflow_id: workflowId,
        mode,
      })
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
    mutationFn: async (args: { topologyId: string; mode?: DeployMode }) => {
      return generateTerraformWithRetry(args.topologyId, store.topologyWorkflowId, args.mode ?? 'full')
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

export interface GithubProgress {
  phase: string
  detail: string
  pr_number?: number | null
  pr_url?: string | null
  status?: string | null
}

export function useTerraformApply() {
  const store = useIacStore()
  const resources = ref<ResourceStatus[]>([])
  const isStreaming = ref(false)
  const isApplyDone = ref(false)
  // GitHub 모드 진행 이벤트 로그
  const githubEvents = ref<GithubProgress[]>([])
  let eventSource: EventSource | null = null

  async function startApply(
    planId: string,
    initialResources: string[] = [],
    useGithub = false,
  ) {
    store.setDeployStatus('applying')
    isStreaming.value = true
    isApplyDone.value = false
    githubEvents.value = []
    resources.value = useGithub
      ? []
      : initialResources.map(resource => ({
          resource,
          status: 'pending' as const,
          detail: '대기 중',
        }))

    const qs = new URLSearchParams({ planId, useGithub: String(useGithub) }).toString()
    eventSource = new EventSource(`/terraform/apply/stream?${qs}`)

    eventSource.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      // GitHub 모드: phase 필드 존재
      if ('phase' in data) {
        githubEvents.value.push(data as GithubProgress)
        return
      }
      // dry_run 모드: resource 필드 존재
      const rs = data as ResourceStatus
      const idx = resources.value.findIndex((r) => r.resource === rs.resource)
      if (idx >= 0) {
        resources.value[idx] = rs
      } else {
        resources.value.push(rs)
      }
    }

    eventSource.addEventListener('done', () => {
      eventSource?.close()
      eventSource = null
      isStreaming.value = false
      isApplyDone.value = true
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

  return { resources, githubEvents, isStreaming, isApplyDone, startApply, stopApply }
}

export interface PingResult {
  resource: string
  endpoint: string
  status: 'ok' | 'fail'
  latencyMs: number
  detail: string
}

export interface HandoffInfo {
  loginUrl: string
  customerId: string
  initialPassword: string
  dbEndpoint?: string | null
  dbPassword?: string | null
  s3BucketName?: string | null
  bastionPublicIp?: string | null
  bastionSshPrivateKey?: string | null
  ecsClusterName?: string | null
  albDnsName?: string | null
}

export interface VerifyResult {
  verifyId: string
  overall: 'pass' | 'fail'
  pings: PingResult[]
  handoff?: HandoffInfo | null
}

export function useTerraformVerify(planId: Ref<string | null>) {
  const store = useIacStore()
  const { deployStatus } = storeToRefs(store)

  return useQuery({
    queryKey: ['terraform-verify', planId],
    queryFn: async () => {
      const res = await api.get(`/terraform/verify/${planId.value}`)
      return res.data as VerifyResult
    },
    // verifying/done 상태일 때만 발동 — generate 직후 의도치 않은 호출 방지
    enabled: () => !!planId.value && (deployStatus.value === 'verifying' || deployStatus.value === 'done'),
    retry: false,
  })
}
