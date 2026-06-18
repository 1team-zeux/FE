import { useQuery } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { computed, unref } from 'vue'
import { api } from '@/services/api'
import { parseFinOpsRun } from '../utils/parseFinOpsRun'

export const useFinOpsRunQuery = (runId: MaybeRef<string | undefined>) => {
  const id = computed(() => unref(runId))

  return useQuery({
    queryKey: ['finops-run', id],
    queryFn: async () => {
      const rid = id.value
      if (!rid) throw new Error('run_id required')
      const { data } = await api.get(`/api/finops/runs/${rid}`)
      const run = parseFinOpsRun((data as { run?: unknown })?.run ?? data)
      if (!run) {
        throw new Error('FinOps run response could not be parsed')
      }
      return run
    },
    enabled: computed(() => Boolean(id.value)),
  })
}
