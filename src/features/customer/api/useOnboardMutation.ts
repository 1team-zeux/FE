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

  // 1. sla-agent-service 온보딩 — 이미 존재하면(409) 기존 고객 조회로 대체
  let onboardResult: OnboardResult
  try {
    const res = await api.post<OnboardResult>('/api/v1/onboard', {
      ...onboardData,
      customer: { ...onboardData.customer, login_email: loginEmail },
    })
    onboardResult = res.data
  } catch (err: any) {
    if (err.status === 409 || err.message?.includes('already exists')) {
      // 고객사는 이미 등록됨 — auth 계정만 생성하면 됨
      onboardResult = { customer_id: 0, bu_id: 0, service_ids: [], registration_token: '', curl_command: '' }
    } else {
      const detail = err.response?.data?.detail ?? err.message ?? '온보딩 API 오류'
      throw new Error(detail)
    }
  }

  // 2. auth-server 계정 생성 — 이미 있으면(409) 무시
  try {
    await adminRegister({
      email: loginEmail,
      name: payload.customer.customer_name,
      password: loginPassword,
      customerCode: payload.customer.customer_code,
    })
  } catch (err: any) {
    if (err.status !== 409 && !err.message?.includes('already exists')) {
      throw err
    }
  }

  return onboardResult
}

export function useOnboardMutation() {
  return useMutation({ mutationFn: doOnboard })
}
