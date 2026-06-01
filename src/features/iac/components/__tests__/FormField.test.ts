import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormField from '../FormField.vue'

const baseProps = {
  fieldId: 'f1',
  label: '가용성 목표',
  value: '99.9%',
  confidence: '모호' as const,
  required: true,
}

describe('FormField', () => {
  it('라벨과 값이 렌더링된다', () => {
    const w = mount(FormField, { props: baseProps })
    expect(w.text()).toContain('가용성 목표')
    expect(w.text()).toContain('99.9%')
  })

  it('수용 버튼 클릭 시 confirm emit', async () => {
    const w = mount(FormField, { props: baseProps })
    await w.find('[data-testid="accept-btn"]').trigger('click')
    expect(w.emitted('confirm')).toBeTruthy()
    expect(w.emitted('confirm')![0]).toEqual(['f1', '99.9%'])
  })

  it('수정 버튼 클릭 시 입력 활성화', async () => {
    const w = mount(FormField, { props: baseProps })
    await w.find('[data-testid="edit-btn"]').trigger('click')
    expect(w.find('input').exists()).toBe(true)
  })

  it('확정 상태에서 수용/수정 버튼 숨김', () => {
    const w = mount(FormField, { props: { ...baseProps, confidence: '확정' } })
    expect(w.find('[data-testid="accept-btn"]').exists()).toBe(false)
    expect(w.find('[data-testid="edit-btn"]').exists()).toBe(false)
  })
})
