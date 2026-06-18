import { ref, type Ref } from 'vue'

/** Page context sent to Ops Assistant for hybrid RAG + live API answers. */
export interface AssistantPageContext {
  source: 'finops'
  tenant_id?: string
  service_id?: string
  run_id?: string
  resource_id?: string
}

const pageContext: Ref<AssistantPageContext | null> = ref(null)

export function useAssistantPageContext() {
  return pageContext
}

export function setAssistantPageContext(ctx: AssistantPageContext | null) {
  pageContext.value = ctx
}

export function clearAssistantPageContext() {
  pageContext.value = null
}
