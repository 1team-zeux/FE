import { api } from '@/services/api'

export interface OpsAssistantHit {
  chunk_id: string | null
  title: string | null
  distance: number | null
  domain: string | null
}

export interface OpsAssistantResponse {
  question: string
  answer: string | null
  hits: OpsAssistantHit[]
  llm_model?: string | null
  llm_error?: string | null
}

export async function queryOpsAssistant(question: string): Promise<OpsAssistantResponse> {
  const { data } = await api.post<OpsAssistantResponse>('/api/v1/assistant/query', {
    question,
    top_k: 5,
  })
  return data
}
