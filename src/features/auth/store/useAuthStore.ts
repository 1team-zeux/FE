import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi } from '../api/authApi'

interface AuthUser {
  email: string
  name: string
  role: 'ADMIN' | 'CUSTOMER'
  customerCode: string
}

const TOKEN_KEY = 'zeux_token'
const USER_KEY = 'zeux_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<AuthUser | null>(
    (() => {
      try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') } catch { return null }
    })()
  )

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function login(email: string, password: string) {
    const res = await loginApi(email, password)
    token.value = res.access_token
    user.value = {
      email: res.user.email,
      name: res.user.name,
      role: res.user.role as 'ADMIN' | 'CUSTOMER',
      customerCode: res.user.customer_code,
    }
    localStorage.setItem(TOKEN_KEY, res.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return { token, user, isAuthenticated, isAdmin, login, logout }
})
