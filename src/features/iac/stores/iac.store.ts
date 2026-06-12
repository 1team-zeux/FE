import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SLABundle } from '../types/sla-bundle.schema'

export type DeployStatus = 'idle' | 'generating' | 'planning' | 'applying' | 'verifying' | 'done' | 'error'

export interface ChatbotTrigger {
  fieldId: string
  priority: 'P0' | 'P1' | 'P2'
  reason: string
}

export const useIacStore = defineStore('iac', () => {
  const uploadSessionId = ref<string | null>(null)
  const bundleDraft = ref<SLABundle | null>(null)
  const selectedTopologyId = ref<string | null>(null)
  const deployStatus = ref<DeployStatus>('idle')
  const chatbotTriggers = ref<ChatbotTrigger[]>([])
  const chatbotOpen = ref(false)
  const pdfFiles = ref<{ sla: File | null; infra: File | null }>({ sla: null, infra: null })

  // Active state for PDF viewer interaction
  const activeFieldId = ref<string | null>(null)
  const activeDocumentId = ref<'doc1_contract' | 'doc2_infra'>('doc1_contract')

  const chatbotBadgeCount = computed(() => chatbotTriggers.value.length)

  function setUploadSession(id: string) {
    uploadSessionId.value = id
  }

  function setBundleDraft(bundle: SLABundle) {
    bundleDraft.value = bundle
  }

  function setSelectedTopology(id: string) {
    selectedTopologyId.value = id
  }

  function setDeployStatus(status: DeployStatus) {
    deployStatus.value = status
  }

  function addChatbotTrigger(trigger: ChatbotTrigger) {
    chatbotTriggers.value.push(trigger)
  }

  function clearChatbotTriggers() {
    chatbotTriggers.value = []
  }

  function toggleChatbot() {
    chatbotOpen.value = !chatbotOpen.value
  }

  function openChatbot() {
    chatbotOpen.value = true
  }

  function setPdfFiles(files: { sla: File; infra: File }) {
    pdfFiles.value = files
  }

  function setActiveField(fieldId: string | null, documentId?: 'doc1_contract' | 'doc2_infra') {
    activeFieldId.value = fieldId
    if (documentId) {
      activeDocumentId.value = documentId
    }
  }

  function setActiveDocument(documentId: 'doc1_contract' | 'doc2_infra') {
    activeDocumentId.value = documentId
  }

  function reset() {
    uploadSessionId.value = null
    bundleDraft.value = null
    selectedTopologyId.value = null
    deployStatus.value = 'idle'
    chatbotTriggers.value = []
    chatbotOpen.value = false
    pdfFiles.value = { sla: null, infra: null }
    activeFieldId.value = null
    activeDocumentId.value = 'doc1_contract'
  }

  return {
    uploadSessionId,
    bundleDraft,
    selectedTopologyId,
    deployStatus,
    chatbotTriggers,
    chatbotOpen,
    chatbotBadgeCount,
    activeFieldId,
    activeDocumentId,
    setUploadSession,
    setBundleDraft,
    setSelectedTopology,
    setDeployStatus,
    addChatbotTrigger,
    clearChatbotTriggers,
    toggleChatbot,
    openChatbot,
    pdfFiles,
    setPdfFiles,
    setActiveField,
    setActiveDocument,
    reset,
  }
})
