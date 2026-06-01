import { useQuery, useMutation } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { z } from 'zod'
import { TopologyDraftSchema } from '../types/topology.schema'
import { useIacStore } from '../stores/iac.store'
import type { Ref } from 'vue'

const TopologiesResponseSchema = z.object({
  topologies: z.array(TopologyDraftSchema),
})

export function useTopologyCandidates(bundleId: Ref<string | null>) {
  return useQuery({
    queryKey: ['topologies', bundleId],
    queryFn: async () => {
      const res = await api.get(`/topologies/${bundleId.value}`)
      return TopologiesResponseSchema.parse(res.data).topologies
    },
    enabled: () => !!bundleId.value,
  })
}

export function useApproveTopology() {
  const store = useIacStore()
  return useMutation({
    mutationFn: async (topologyId: string) => {
      const res = await api.post(`/topologies/${topologyId}/approve`)
      return res.data as { topologyId: string; approved: true }
    },
    onSuccess(data) {
      store.setSelectedTopology(data.topologyId)
    },
  })
}
