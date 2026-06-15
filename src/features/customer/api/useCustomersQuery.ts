import { useQuery } from '@tanstack/vue-query'
import { api } from '@/services/api'

export interface BusinessUnitSummary {
  bu_id: number
  bu_name: string
  subscription_tier: string | null
  business_domain: string | null
  contract_end_date: string | null
}

export interface CustomerSummary {
  customer_id: number
  customer_name: string
  customer_code: string
  contact_email: string | null
  login_email: string | null
  created_at: string | null
  agent_active: boolean
  container_count: number
  business_units: BusinessUnitSummary[]
}

async function fetchCustomers(): Promise<CustomerSummary[]> {
  try {
    const res = await api.get<CustomerSummary[]>('/api/v1/customers')
    return res.data
  } catch {
    return []
  }
}

export function useCustomersQuery() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  })
}
