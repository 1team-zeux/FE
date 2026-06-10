import { useMutation } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { adminRegister } from '@/features/auth/api/authApi'

export interface OnboardPayload {
  customer: {
    customer_name: string
    customer_code: string
    contact_email?: string
  }
  business_unit: {
    bu_name: string
    bu_code?: string
    application_name?: string
    manager_email?: string
    business_domain?: string
    subscription_tier?: string
    contract_start_date?: string
    contract_end_date?: string
  }
  requirements?: {
    csp?: string
    primary_region?: string
    multi_az_required?: boolean
    db_required?: boolean
    data_type?: string
    backup_required?: boolean
  }
  cost_constraints?: {
    monthly_budget?: number
    cost_priority?: string
    auto_scaling_required?: boolean
    max_compute_instance_count?: number
    max_storage_size_gb?: number
  }
  services: {
    service_name: string
    service_type?: string
    service_tier?: string
    criticality_score?: number
    environment?: string
    sla_target_availability?: number
    sla_target_latency_ms?: number
  }[]
  // 로그인 계정 정보 (auth-server로 별도 전송)
  loginEmail: string
  loginPassword: string
}

export interface OnboardResult {
  customer_id: number
  bu_id: number
  service_ids: number[]
  registration_token: string
  curl_command: string
}

async function doOnboard(payload: OnboardPayload): Promise<OnboardResult> {
  const { loginEmail, loginPassword, ...onboardData } = payload

  // 1. sla-agent-service 온보딩
  const res = await api.post<OnboardResult>('/api/v1/onboard', onboardData)

  // 2. auth-server 계정 생성
  await adminRegister({
    email: loginEmail,
    name: payload.customer.customer_name,
    password: loginPassword,
    customerCode: payload.customer.customer_code,
  })

  return res.data
}

export function useOnboardMutation() {
  return useMutation({ mutationFn: doOnboard })
}
