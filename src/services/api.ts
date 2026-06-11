import axios from 'axios'

export const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 180000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zeux_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('zeux_token')
      localStorage.removeItem('zeux_user')
      window.location.href = '/login'
      return Promise.reject(err)
    }
    const message = err.response?.data?.message ?? err.response?.data?.detail ?? err.message
    return Promise.reject(new Error(message))
  },
)
