import { useQuery } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { computed, unref } from 'vue'
import { api } from '@/services/api'
import { formatZodIssues, parseFinOpsRunsResponse } from '../utils/parseFinOpsRun'
import { FinOpsRunsResponseSchema } from '../types/finops.schema'

export interface FinOpsRunsFilters {
  tenantId?: string
  serviceId?: string
  limit?: number
}

export const useFinOpsRunsQuery = (filters?: MaybeRef<FinOpsRunsFilters | undefined>) => {
  const f = computed(() => unref(filters))

  return useQuery({
    queryKey: ['finops-runs', f],
    queryFn: async () => {
      const { data } = await api.get('/api/finops/runs', {
        params: {
          tenant_id: f.value?.tenantId,
          service_id: f.value?.serviceId,
          limit: f.value?.limit ?? 50,
        },
      })
      const strict = FinOpsRunsResponseSchema.safeParse(data)
      if (strict.success) {
        return strict.data.runs
      }
      const relaxed = parseFinOpsRunsResponse(data)
      if (import.meta.env.DEV) {
        console.warn('[FinOps] runs parse used relaxed fallback', formatZodIssues(strict.error))
      }
      return relaxed
    },
    refetchInterval: 60_000,
  })
}
