
import { useQuery } from '@tanstack/vue-query'
import { api } from '@/services/api'

export interface Tenant {
  id: string
  tenant_id: string
  aws_region: string
  created_at: string
}

async function fetchTenants(): Promise<Tenant[]> {
  try {
    const res = await api.get<Tenant[]>('/tenants')
    return res.data
  } catch {
    return []
  }
}

export function useTenantsQuery() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
  })
}
