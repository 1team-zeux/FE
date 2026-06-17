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
      const result = FinOpsRunDetailResponseSchema.safeParse(data)
      if (!result.success) {
        console.error('[FinOps] run detail parse error', result.error.format())
        return data?.run ?? data
      }
      return result.data.run
    },
    enabled: computed(() => Boolean(id.value)),
  })
}
