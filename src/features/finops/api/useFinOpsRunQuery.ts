import { useQuery } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { computed, unref } from 'vue'
import { api } from '@/services/api'
import { FinOpsRunDetailResponseSchema } from '../types/finops.schema'
import { formatZodIssues, parseFinOpsRun } from '../utils/parseFinOpsRun'

export const useFinOpsRunQuery = (runId: MaybeRef<string | undefined>) => {
  const id = computed(() => unref(runId))

  return useQuery({
    queryKey: ['finops-run', id],
    queryFn: async () => {
      const rid = id.value
      if (!rid) throw new Error('run_id required')
      const { data } = await api.get(`/api/finops/runs/${rid}`)
      const strict = FinOpsRunDetailResponseSchema.safeParse(data)
      if (strict.success) {
        return strict.data.run
      }
      const relaxed = parseFinOpsRun((data as { run?: unknown })?.run ?? data)
      if (relaxed) {
        if (import.meta.env.DEV) {
          console.warn('[FinOps] run detail parse used relaxed fallback', formatZodIssues(strict.error))
        }
        return relaxed
      }
      throw new Error('FinOps run response could not be parsed')
    },
    enabled: computed(() => Boolean(id.value)),
  })
}
