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
    const message = err.response?.data?.message ?? err.response?.data?.detail ?? err.message
    const error = new Error(message) as any
    error.status = err.response?.status
    return Promise.reject(error)
  },
)
