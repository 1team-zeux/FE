import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIacStore } from '../stores/iac.store'

describe('useIacStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('초기 상태가 올바르다', () => {
    const store = useIacStore()
    expect(store.uploadSessionId).toBeNull()
    expect(store.bundleDraft).toBeNull()
    expect(store.selectedTopologyId).toBeNull()
    expect(store.deployStatus).toBe('idle')
    expect(store.chatbotTriggers).toEqual([])
    expect(store.chatbotOpen).toBe(false)
  })

  it('setUploadSession: sessionId 저장', () => {
    const store = useIacStore()
    store.setUploadSession('sess-001')
    expect(store.uploadSessionId).toBe('sess-001')
  })

  it('addChatbotTrigger: 트리거 추가 및 배지 카운트', () => {
    const store = useIacStore()
    store.addChatbotTrigger({ fieldId: 'f1', priority: 'P0', reason: '추정값' })
    store.addChatbotTrigger({ fieldId: 'f2', priority: 'P1', reason: '모호' })
    expect(store.chatbotTriggers).toHaveLength(2)
    expect(store.chatbotBadgeCount).toBe(2)
  })

  it('clearChatbotTriggers: 트리거 초기화', () => {
    const store = useIacStore()
    store.addChatbotTrigger({ fieldId: 'f1', priority: 'P0', reason: '추정값' })
    store.clearChatbotTriggers()
    expect(store.chatbotTriggers).toHaveLength(0)
    expect(store.chatbotBadgeCount).toBe(0)
  })

  it('toggleChatbot: open 상태 토글', () => {
    const store = useIacStore()
    expect(store.chatbotOpen).toBe(false)
    store.toggleChatbot()
    expect(store.chatbotOpen).toBe(true)
    store.toggleChatbot()
    expect(store.chatbotOpen).toBe(false)
  })

  it('setSelectedTopology: 토폴로지 ID 저장', () => {
    const store = useIacStore()
    store.setSelectedTopology('topo-002')
    expect(store.selectedTopologyId).toBe('topo-002')
  })

  it('setDeployStatus: 상태 전환', () => {
    const store = useIacStore()
    const statuses = ['generating', 'planning', 'applying', 'verifying', 'done'] as const
    for (const s of statuses) {
      store.setDeployStatus(s)
      expect(store.deployStatus).toBe(s)
    }
  })
})
