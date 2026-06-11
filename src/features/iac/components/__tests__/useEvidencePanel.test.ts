import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useEvidencePanel } from '../composables/useEvidencePanel'

describe('useEvidencePanel', () => {
  it('source=system_rule이면 canShowPanel true', () => {
    const { canShowPanel } = useEvidencePanel(
      ref('system_rule'),
      ref(undefined),
      ref({ sla: null, infra: null }),
    )
    expect(canShowPanel.value).toBe(true)
  })

  it('doc1_contract이고 evidence 없으면 canShowPanel false', () => {
    const { canShowPanel } = useEvidencePanel(
      ref('doc1_contract'),
      ref(undefined),
      ref({ sla: null, infra: null }),
    )
    expect(canShowPanel.value).toBe(false)
  })

  it('doc1_contract이고 evidence.page 있으면 canShowPanel true', () => {
    const { canShowPanel } = useEvidencePanel(
      ref('doc1_contract'),
      ref({ documentId: 'doc1_contract', page: 2, snippet: '조항' }),
      ref({ sla: null, infra: null }),
    )
    expect(canShowPanel.value).toBe(true)
  })

  it('llm_recommendation이면 canShowPanel false', () => {
    const { canShowPanel } = useEvidencePanel(
      ref('llm_recommendation'),
      ref({ documentId: 'doc1_contract', page: 1, snippet: '조항' }),
      ref({ sla: null, infra: null }),
    )
    expect(canShowPanel.value).toBe(false)
  })

  it('togglePin 두 번 호출하면 열렸다 닫힘', () => {
    const source = ref<'system_rule'>('system_rule')
    const { canShowPanel, showPanel, pinnedByClick, togglePin } = useEvidencePanel(
      source,
      ref(undefined),
      ref({ sla: null, infra: null }),
    )
    expect(canShowPanel.value).toBe(true)
    togglePin()
    expect(pinnedByClick.value).toBe(true)
    expect(showPanel.value).toBe(true)
    togglePin()
    expect(pinnedByClick.value).toBe(false)
    expect(showPanel.value).toBe(false)
  })

  it('doc1_contract일 때 evidencePdfFile은 pdfFiles.sla 반환', () => {
    const slaFile = new File([''], 'sla.pdf')
    const { evidencePdfFile } = useEvidencePanel(
      ref('doc1_contract'),
      ref({ documentId: 'doc1_contract', page: 1 }),
      ref({ sla: slaFile, infra: null }),
    )
    expect(evidencePdfFile.value).toBe(slaFile)
  })
})
