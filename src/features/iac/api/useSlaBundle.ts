import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { SLABundleSchema } from '../types/sla-bundle.schema'
import type { Ref } from 'vue'

export function useSlaBundleDraft(sessionId: Ref<string | null>) {
  return useQuery({
    queryKey: ['sla-bundle-draft', sessionId],
    queryFn: async () => {
      const res = await api.get(`/sla-bundles/draft/${sessionId.value}`)
      return SLABundleSchema.parse(res.data)
    },
    enabled: () => !!sessionId.value,
  })
}

export function useConfirmField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bundleId, fieldId, value }: { bundleId: string; fieldId: string; value: string | number | null }) => {
      const res = await api.patch(`/sla-bundles/draft/${bundleId}/fields`, { fieldId, value })
      return SLABundleSchema.parse(res.data)
    },
    onSuccess(data) {
      queryClient.setQueryData(['sla-bundle-draft', data.uploadSessionId], data)
    },
  })
}

export function useSaveSlaBundle() {
  return useMutation({
    mutationFn: async (bundleId: string) => {
      const res = await api.post('/sla-bundles', { bundleId })
      return res.data as { bundleId: string }
    },
  })
}
