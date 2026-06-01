import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfidenceBadge from '../ConfidenceBadge.vue'

describe('ConfidenceBadge', () => {
  it('확실 — 초록 스타일', () => {
    const w = mount(ConfidenceBadge, { props: { confidence: '확실' } })
    expect(w.classes()).toContain('bg-green-100')
    expect(w.text()).toBe('확실')
  })
  it('모호 — 노랑 스타일', () => {
    const w = mount(ConfidenceBadge, { props: { confidence: '모호' } })
    expect(w.classes()).toContain('bg-yellow-100')
  })
  it('추정 — 빨강 스타일', () => {
    const w = mount(ConfidenceBadge, { props: { confidence: '추정' } })
    expect(w.classes()).toContain('bg-red-100')
  })
  it('확정 — 브랜드 스타일', () => {
    const w = mount(ConfidenceBadge, { props: { confidence: '확정' } })
    expect(w.classes()).toContain('bg-brand-subtle')
  })
})
