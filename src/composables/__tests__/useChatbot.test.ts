import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatbot } from '../useChatbot'

describe('useChatbot', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('초기 상태: 닫힘, 배지 0', () => {
    const { isOpen, badgeCount } = useChatbot()
    expect(isOpen.value).toBe(false)
    expect(badgeCount.value).toBe(0)
  })

  it('open/close 제어', () => {
    const { isOpen, open, close } = useChatbot()
    open()
    expect(isOpen.value).toBe(true)
    close()
    expect(isOpen.value).toBe(false)
  })

  it('addTrigger: 배지 카운트 증가 + 자동 오픈 (P0)', () => {
    const { badgeCount, isOpen, addTrigger } = useChatbot()
    addTrigger({ fieldId: 'f1', priority: 'P0', reason: '추정값' })
    expect(badgeCount.value).toBe(1)
    expect(isOpen.value).toBe(true)
  })

  it('addTrigger: P1은 자동 오픈 안 함', () => {
    const { isOpen, addTrigger } = useChatbot()
    addTrigger({ fieldId: 'f2', priority: 'P1', reason: '모호' })
    expect(isOpen.value).toBe(false)
  })

  it('clearTriggers: 배지 초기화', () => {
    const { badgeCount, clearTriggers, addTrigger } = useChatbot()
    addTrigger({ fieldId: 'f1', priority: 'P1', reason: '모호' })
    clearTriggers()
    expect(badgeCount.value).toBe(0)
  })
})
