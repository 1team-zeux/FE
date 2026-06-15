import { useQuery } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { computed, unref } from 'vue'
import { api } from '@/services/api'
import { FinOpsRunDetailResponseSchema } from '../types/finops.schema'

export const useFinOpsRunQuery = (runId: MaybeRef<string | undefined>) => {
  const id = computed(() => unref(runId))

  return useQuery({
    queryKey: ['finops-run', id],
    queryFn: async () => {
      const rid = id.value
      if (!rid) throw new Error('run_id required')
      const { data } = await api.get(`/api/finops/runs/${rid}`)
      return FinOpsRunDetailResponseSchema.parse(data).run
    },
    enabled: computed(() => Boolean(id.value)),
  })
}
