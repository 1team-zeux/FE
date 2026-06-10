import { api } from '@/services/api'

export interface LoginResponse {
  access_token: string
  token_type: string
  user: {
    email: string
    name: string
    role: string
    customer_code: string
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { email, password })
  return res.data
}

export async function adminRegister(params: {
  email: string
  name: string
  password: string
  customerCode?: string
}): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/admin/register', {
    email: params.email,
    name: params.name,
    password: params.password,
    customer_code: params.customerCode ?? null,
  })
  return res.data
}
