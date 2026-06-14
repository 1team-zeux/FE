import { useMutation } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { useIacStore } from '../stores/iac.store'
import { useRouter } from 'vue-router'

interface UploadSessionResponse {
  uploadSessionId: string
}

export function useUploadSession() {
  const store = useIacStore()
  const router = useRouter()

  return useMutation({
    mutationFn: async (files: { sla: File; infra: File }) => {
      const formData = new FormData()
      formData.append('slaFile', files.sla)
      formData.append('infraFile', files.infra)
      const res = await api.post<UploadSessionResponse>('/upload-sessions', formData, {
        headers: { 'Content-Type': false },
      })
      return { uploadSessionId: res.data.uploadSessionId, files }
    },
    onSuccess(data) {
      store.setPdfFiles(data.files)
      store.setUploadSession(data.uploadSessionId)
      router.push('/iac/2')
    },
  })
}
