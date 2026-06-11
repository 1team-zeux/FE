import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FormField from '../FormField.vue'

// Mock PdfEvidenceViewer to avoid pdfjs-dist DOMMatrix error in jsdom
vi.mock('../PdfEvidenceViewer.vue', () => ({
  default: { template: '<div data-testid="pdf-viewer-mock" />' },
}))

const baseProps = {
  fieldId: 'f1',
  label: '가용성 목표',
  value: '99.9%',
  confidence: '모호' as const,
  required: true,
}

describe('FormField', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('라벨과 값이 렌더링된다', () => {
    // confidence='확정'이면 읽기 전용 div에 값이 텍스트로 표시됨
    const w = mount(FormField, { props: { ...baseProps, confidence: '확정' as const } })
    expect(w.text()).toContain('가용성 목표')
    expect(w.text()).toContain('99.9%')
  })

  it('수용 버튼 클릭 시 confirm emit', async () => {
    const w = mount(FormField, { props: baseProps })
    await w.find('[data-testid="accept-btn"]').trigger('click')
    expect(w.emitted('confirm')).toBeTruthy()
    expect(w.emitted('confirm')![0]).toEqual(['f1', '99.9%'])
  })

  it('확실 confidence에서 수정 버튼 클릭 시 입력 활성화', async () => {
    const w = mount(FormField, { props: { ...baseProps, confidence: '확실' as const } })
    expect(w.find('[data-testid="edit-btn"]').exists()).toBe(true)
    await w.find('[data-testid="edit-btn"]').trigger('click')
    expect(w.find('input').exists()).toBe(true)
  })

  it('확정 상태에서 수용/수정 버튼 숨김', () => {
    const w = mount(FormField, { props: { ...baseProps, confidence: '확정' as const } })
    expect(w.find('[data-testid="accept-btn"]').exists()).toBe(false)
    expect(w.find('[data-testid="edit-btn"]').exists()).toBe(false)
  })
})
