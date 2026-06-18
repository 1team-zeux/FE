import { api } from '@/services/api'
import type { AssistantPageContext } from '../assistantContext'

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
  live_context_used?: boolean
  live_context?: Record<string, unknown> | null
}

export async function queryOpsAssistant(
  question: string,
  pageContext?: AssistantPageContext | null,
): Promise<OpsAssistantResponse> {
  const { data } = await api.post<OpsAssistantResponse>('/api/v1/assistant/query', {
    question,
    top_k: 5,
    domain: pageContext?.source === 'finops' ? 'finops' : undefined,
    context: pageContext ?? undefined,
  })
  return data
}
