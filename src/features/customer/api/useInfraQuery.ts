import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { api } from '@/services/api'

export interface DiscoveredContainer {
  name: string
  image: string
  ports: string
  last_seen: string | null
}

export interface DiscoveredHost {
  host_id: number
  hostname: string
  os: string
  arch: string
  node_exporter_port: number
  cadvisor_port: number
  first_seen: string | null
  last_seen: string | null
  containers: DiscoveredContainer[]
}

export interface InfraStatus {
  tenant_id: string
  hosts: DiscoveredHost[]
  agent_active: boolean
  container_count: number
}

export function useInfraQuery(customerCode: Ref<string>) {
  const { data, ...rest } = useQuery({
    queryKey: computed(() => ['infra', customerCode.value]),
    queryFn: async (): Promise<InfraStatus> => {
      const res = await api.get<InfraStatus>(`/api/v1/customers/${customerCode.value}/infra`)
      return res.data
    },
    enabled: computed(() => !!customerCode.value),
    refetchInterval: computed(() => (data.value?.agent_active ? false : 5000)),
  })

  return { data, ...rest }
}
