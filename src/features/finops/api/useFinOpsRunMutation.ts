import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/services/api'

export interface TriggerFinOpsRunInput {
  tenantId?: string
  teamId?: string
  serviceId?: string
  force?: boolean
}

export const useFinOpsRunMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TriggerFinOpsRunInput) => {
      const { data } = await api.post('/finops/run', null, {
        params: {
          tenant_id: input.tenantId ?? 'demo-tenant',
          team_id: input.teamId ?? 'demo-team',
          service_id: input.serviceId ?? 'api-gateway',
          force: input.force ?? false,
        },
      })
      return data as { run_id?: string; status?: string; skipped?: boolean }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finops-runs'] })
    },
  })
}
