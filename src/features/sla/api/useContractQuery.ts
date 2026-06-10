import { useQuery } from '@tanstack/vue-query'
import { api } from '@/services/api'

export interface SlaObjective {
  category: string
  target_value: number
  measurement_window: string
}

export interface ContractData {
  customer: { customer_name: string; contact_email: string }
  business_unit: { bu_name: string; contract_start_date: string; contract_end_date: string; subscription_tier: string }
  sla_objectives: SlaObjective[]
  cost_policy: { monthly_budget: number | null; cost_priority: string; auto_scaling_required: boolean }
  infra_policy: { csp: string; primary_region: string; multi_az_required: boolean }
}

const DEMO_CONTRACT: ContractData = {
  customer: { customer_name: '고객사', contact_email: '' },
  business_unit: { bu_name: 'Business Unit', contract_start_date: '', contract_end_date: '', subscription_tier: 'Standard' },
  sla_objectives: [
    { category: 'availability', target_value: 99.9, measurement_window: '30d' },
    { category: 'latency_p95', target_value: 300, measurement_window: '5m' },
  ],
  cost_policy: { monthly_budget: null, cost_priority: 'Balanced', auto_scaling_required: true },
  infra_policy: { csp: 'AWS', primary_region: 'ap-northeast-2', multi_az_required: false },
}

async function fetchContract(tenantId: string): Promise<ContractData> {
  try {
    const res = await api.get<ContractData>(`/api/v1/tenants/${tenantId}/contract`)
    return res.data
  } catch {
    return DEMO_CONTRACT
  }
}

export function useContractQuery(tenantId: string) {
  return useQuery({
    queryKey: ['contract', tenantId],
    queryFn: () => fetchContract(tenantId),
    staleTime: 60_000,
  })
}
