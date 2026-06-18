import { useQuery } from '@tanstack/vue-query'
import type { MaybeRef } from 'vue'
import { computed, unref } from 'vue'
import { api } from '@/services/api'
import { toFinOpsServiceSlug } from '../utils/serviceSlug'

export interface FinOpsTenantServiceOption {
  serviceId: string
  serviceName: string
}

async function fetchTenantServices(tenantId: string): Promise<FinOpsTenantServiceOption[]> {
  const { data } = await api.get(`/api/v1/tenants/${encodeURIComponent(tenantId)}/services`)
  const cards: Array<{ service_name?: string }> = data?.services ?? []
  return cards
    .map((card) => {
      const serviceName = String(card.service_name ?? '').trim()
      if (!serviceName) return null
      return {
        serviceId: toFinOpsServiceSlug(serviceName),
        serviceName,
      }
    })
    .filter((row): row is FinOpsTenantServiceOption => row !== null)
}

export function useFinOpsTenantServicesQuery(tenantId: MaybeRef<string | undefined>) {
  const tenant = computed(() => unref(tenantId)?.trim() ?? '')

  return useQuery({
    queryKey: ['finops-tenant-services', tenant],
    queryFn: () => fetchTenantServices(tenant.value),
    enabled: computed(() => tenant.value.length > 0),
    staleTime: 60_000,
  })
}
