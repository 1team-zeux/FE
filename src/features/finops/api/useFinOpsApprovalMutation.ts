import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { FinOpsRunDetailResponseSchema } from '../types/finops.schema'

export interface FinOpsApprovalInput {
  runId: string
  action: 'approve' | 'reject'
  reviewer?: string
  comment?: string
}

export const useFinOpsApprovalMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ runId, action, reviewer, comment }: FinOpsApprovalInput) => {
      const path = action === 'approve' ? 'approve' : 'reject'
      const { data } = await api.post(`/finops/runs/${runId}/${path}`, {
        reviewer: reviewer ?? null,
        comment: comment ?? null,
      })
      const parsed = data as { run: unknown }
      return FinOpsRunDetailResponseSchema.parse({ storage: 'mariadb', run: parsed.run }).run
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finops-runs'] })
      queryClient.invalidateQueries({ queryKey: ['finops-run', variables.runId] })
    },
  })
}
