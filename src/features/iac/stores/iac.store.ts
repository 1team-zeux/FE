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
  const topologyWorkflowId = ref<string | null>(null)
  const selectedTopologyId = ref<string | null>(null)
  const deployStatus = ref<DeployStatus>('idle')
  // 마지막 Terraform planId — 핸드오프 페이지에서 verify 조회 시 사용
  const lastPlanId = ref<string | null>(null)
  // 배포 모드 — 토폴로지 확정 시점에 결정 ('full' = 전체, 'minimal' = EC2 1개 테스트)
  const deployMode = ref<'full' | 'minimal'>('full')
  // 적용 타겟 — Apply 시점에 결정 ('dry_run' = 로컬 시뮬레이션, 'github' = PR + Atlantis)
  const deployTarget = ref<'dry_run' | 'github'>('dry_run')
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

  function setTopologyWorkflowId(id: string | null) {
    topologyWorkflowId.value = id
  }

  function setSelectedTopology(id: string) {
    selectedTopologyId.value = id
  }

  function setDeployStatus(status: DeployStatus) {
    deployStatus.value = status
  }

  function setLastPlanId(id: string | null) {
    lastPlanId.value = id
  }

  function setDeployMode(mode: 'full' | 'minimal') {
    deployMode.value = mode
  }

  function setDeployTarget(target: 'dry_run' | 'github') {
    deployTarget.value = target
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
    topologyWorkflowId.value = null
    selectedTopologyId.value = null
    deployStatus.value = 'idle'
    lastPlanId.value = null
    deployMode.value = 'full'
    deployTarget.value = 'dry_run'
    chatbotTriggers.value = []
    chatbotOpen.value = false
    pdfFiles.value = { sla: null, infra: null }
    activeFieldId.value = null
    activeDocumentId.value = 'doc1_contract'
  }

  return {
    uploadSessionId,
    bundleDraft,
    topologyWorkflowId,
    selectedTopologyId,
    deployStatus,
    lastPlanId,
    deployMode,
    deployTarget,
    chatbotTriggers,
    chatbotOpen,
    chatbotBadgeCount,
    activeFieldId,
    activeDocumentId,
    setUploadSession,
    setBundleDraft,
    setTopologyWorkflowId,
    setSelectedTopology,
    setDeployStatus,
    setLastPlanId,
    setDeployMode,
    setDeployTarget,
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
