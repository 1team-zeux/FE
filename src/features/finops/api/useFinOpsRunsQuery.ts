import { useQuery } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { computed, unref } from 'vue'
import { type z } from 'zod'
import { api } from '@/services/api'
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
      const result = FinOpsRunsResponseSchema.safeParse(data)
      if (!result.success) {
        console.error('[FinOps] runs parse error', result.error.format())
        // 파싱 실패 시 스키마 검증을 건너뛰고 원본 배열 반환
        return (data?.runs ?? []) as z.infer<typeof FinOpsRunsResponseSchema>['runs']
      }
      return result.data.runs
    },
    refetchInterval: 60_000,
  })
}
