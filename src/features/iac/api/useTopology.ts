import { useQuery, useMutation } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { computed, ref, watchEffect } from 'vue'
import { TopologyDraftSchema } from '../types/topology.schema'
import { useIacStore } from '../stores/iac.store'
import type { Ref } from 'vue'

const REVIEW_DONE_STATUSES = new Set(['PENDING_SELECTION', 'READY_FOR_REVIEW', 'COMPLETED'])

function mapTopology(t: Record<string, any>) {
  return TopologyDraftSchema.parse({
    topologyId: t.topology_id,
    label: t.display_name,
    summary: t.summary,
    estimatedMonthlyCost: t.cost_summary.estimated_monthly_cost_krw,
    slaSatisfaction: t.sla_summary,
    rationale: t.key_rationale,
    conceptNote: t.concept_note || undefined,
    nodes: t.diagram.nodes,
    edges: t.diagram.edges,
    groups: t.diagram.groups,
  })
}

const MAX_POLL_COUNT = 30 // 2초 × 30 = 최대 1분

export function useTopologySession(bundleId: Ref<string | null>) {
  const store = useIacStore()
  const workflowId = computed(() => store.topologyWorkflowId)
  const hasFailed = ref(false)
  let pollCount = 0

  const { mutate: createSession, isPending: isCreating } = useMutation({
    mutationFn: async (bid: string) => {
      const res = await api.post('/api/v1/topology-workflows/sessions', { bundle_id: bid })
      return res.data as { workflow_id: string }
    },
    onSuccess(data) {
      pollCount = 0
      hasFailed.value = false
      store.setTopologyWorkflowId(data.workflow_id)
    },
  })

  watchEffect(() => {
    if (bundleId.value && !workflowId.value && !isCreating.value && !hasFailed.value) {
      createSession(bundleId.value)
    }
  })

  const { data: workflowData } = useQuery({
    queryKey: ['topology-workflow', workflowId],
    queryFn: async () => {
      const id = workflowId.value
      if (!id) throw new Error('No workflow ID')
      const res = await api.get(`/api/v1/topology-workflows/sessions/${id}`)
      return res.data as {
        workflow_id: string
        status: string
        review_status: string | null
        topology_review_payload: { topologies: Record<string, any>[] } | null
      }
    },
    enabled: () => !!workflowId.value,
    retry: 2,
    refetchInterval: (query) => {
      if (query.state.status === 'error') {
        store.setTopologyWorkflowId(null)
        return false
      }
      const data = query.state.data as any
      const reviewStatus = data?.review_status
      const workflowStatus = data?.status

      if (reviewStatus && REVIEW_DONE_STATUSES.has(reviewStatus)) return false

      // BE는 review_status를 "FAILED"로 설정하지 않으므로 workflow status로 감지
      if (workflowStatus === 'FAILED') {
        hasFailed.value = true
        return false
      }

      pollCount++
      if (pollCount >= MAX_POLL_COUNT) {
        store.setTopologyWorkflowId(null)
        return false
      }
      return 2000
    },
  })

  const topologies = computed(() => {
    const raw = workflowData.value?.topology_review_payload?.topologies
    if (!raw?.length) return null
    return raw.map(mapTopology)
  })

  const isLoading = computed(
    () => !hasFailed.value && (isCreating.value || (!!workflowId.value && !topologies.value)),
  )

  function retrySession() {
    hasFailed.value = false
    store.setTopologyWorkflowId(null)
  }

  return { topologies, isLoading, hasFailed, retrySession }
}

export function useSelectTopology() {
  const store = useIacStore()
  const workflowId = computed(() => store.topologyWorkflowId)

  return useMutation({
    mutationFn: async (selectedTopologyId: string) => {
      const res = await api.post(
        `/api/v1/topology-workflows/sessions/${workflowId.value}/select`,
        { selected_topology_id: selectedTopologyId },
      )
      return res.data as { selected_topology_id: string }
    },
    onSuccess(data) {
      store.setSelectedTopology(data.selected_topology_id)
    },
  })
}
