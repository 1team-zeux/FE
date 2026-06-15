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
      // 1. Clear store state before new upload
      store.reset()

      const formData = new FormData()
      formData.append('slaFile', files.sla)
      formData.append('infraFile', files.infra)
      const res = await api.post<UploadSessionResponse>('/upload-sessions', formData, {
        headers: { 'Content-Type': false },
      })
      
      // 2. Set files and session ID
      store.setPdfFiles(files)
      store.setUploadSession(res.data.uploadSessionId)
      
      return { uploadSessionId: res.data.uploadSessionId, files }
    },
    onSuccess() {
      // 3. Navigate only after state is committed
      router.push('/iac/2')
    },
  })
}
