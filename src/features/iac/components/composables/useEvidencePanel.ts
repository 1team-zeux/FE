import { ref, computed, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { SourceType, Evidence } from '../../types/sla-bundle.schema'

interface OverlayPos {
  top: number
  left: number
}

export function useEvidencePanel(
  source: Ref<SourceType | undefined>,
  evidence: Ref<Evidence | undefined>,
  pdfFiles: Ref<{ sla: File | null; infra: File | null }>,
) {
  const pinnedByClick = ref(false)
  const overlayPos = ref<OverlayPos | null>(null)
  const triggerRef = ref<HTMLElement | null>(null)
  const panelRef = ref<HTMLElement | null>(null)

  const evidencePdfFile = computed(() => {
    if (!evidence.value?.documentId) return null
    if (evidence.value.documentId === 'doc1_contract') return pdfFiles.value.sla
    return pdfFiles.value.infra
  })

  const canShowPanel = computed(() => {
    if (source.value === 'system_rule') return true
    if (source.value === 'doc1_contract' || source.value === 'doc2_infra') {
      return !!(evidence.value && (evidence.value.page || evidence.value.snippet))
    }
    return false
  })

  const showPanel = computed(() => canShowPanel.value && pinnedByClick.value)

  function updateOverlayPos() {
    if (!triggerRef.value) return
    const rect = triggerRef.value.getBoundingClientRect()
    overlayPos.value = { top: rect.bottom + 8, left: rect.left }
  }

  function togglePin() {
    if (!pinnedByClick.value) {
      updateOverlayPos()
      pinnedByClick.value = true
    } else {
      pinnedByClick.value = false
      overlayPos.value = null
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as Node
    const inPanel = panelRef.value?.contains(target) ?? false
    const inTrigger = triggerRef.value?.contains(target) ?? false
    if (!inPanel && !inTrigger) {
      pinnedByClick.value = false
      overlayPos.value = null
    }
  }

  watch(pinnedByClick, (v) => {
    if (v) document.addEventListener('click', handleClickOutside)
    else document.removeEventListener('click', handleClickOutside)
  }, { flush: 'sync' })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })

  return {
    pinnedByClick,
    overlayPos,
    triggerRef,
    panelRef,
    evidencePdfFile,
    canShowPanel,
    showPanel,
    togglePin,
  }
}
