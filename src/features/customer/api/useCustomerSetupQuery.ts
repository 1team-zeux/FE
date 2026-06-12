import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/features/auth/store/useAuthStore'

interface CustomerSetup {
  customer_code: string
  bu_name: string
  registration_token: string
  curl_command: string
}

export function useCustomerSetupQuery() {
  const auth = useAuthStore()
  const customerCode = computed(() => auth.user?.customerCode ?? '')

  return useQuery({
    queryKey: ['customer-setup', customerCode],
    queryFn: async () => {
      const res = await api.get<CustomerSetup>(`/api/v1/customers/${customerCode.value}/setup`)
      return res.data
    },
    enabled: computed(() => !!customerCode.value),
  })
}
