import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useAiSuggestions } from '../composables/useAiSuggestions'
import type { AiSuggestion } from '../../types/sla-bundle.schema'

const makeSuggestions = (): AiSuggestion[] => [
  { value: '500', reason: '업계 기준' },
  { value: '800', reason: '보수적 수치' },
]

describe('useAiSuggestions', () => {
  it('suggestions 없으면 openSuggestions 호출해도 열리지 않음', () => {
    const suggestions = ref<AiSuggestion[] | undefined>(undefined)
    const containerRef = ref<HTMLElement | null>(null)
    const editValue = ref('')
    const { showSuggestions, openSuggestions } = useAiSuggestions(suggestions, containerRef, editValue)
    openSuggestions()
    expect(showSuggestions.value).toBe(false)
  })

  it('suggestions 있으면 openSuggestions 시 열림', () => {
    const suggestions = ref<AiSuggestion[] | undefined>(makeSuggestions())
    const containerRef = ref<HTMLElement | null>(null)
    const editValue = ref('')
    const { showSuggestions, openSuggestions } = useAiSuggestions(suggestions, containerRef, editValue)
    openSuggestions()
    expect(showSuggestions.value).toBe(true)
  })

  it('applySuggestion — editValue 반영 후 패널 닫힘', () => {
    const suggestions = ref<AiSuggestion[] | undefined>(makeSuggestions())
    const containerRef = ref<HTMLElement | null>(null)
    const editValue = ref('')
    const { showSuggestions, openSuggestions, applySuggestion } = useAiSuggestions(suggestions, containerRef, editValue)
    openSuggestions()
    applySuggestion('500')
    expect(editValue.value).toBe('500')
    expect(showSuggestions.value).toBe(false)
  })

  it('빈 배열이면 openSuggestions 호출해도 열리지 않음', () => {
    const suggestions = ref<AiSuggestion[] | undefined>([])
    const containerRef = ref<HTMLElement | null>(null)
    const editValue = ref('')
    const { showSuggestions, openSuggestions } = useAiSuggestions(suggestions, containerRef, editValue)
    openSuggestions()
    expect(showSuggestions.value).toBe(false)
  })

  it('패널 열릴 때 document click 리스너 등록, 닫힐 때 제거', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const suggestions = ref<AiSuggestion[] | undefined>([{ value: '500', reason: '기준' }])
    const containerRef = ref<HTMLElement | null>(null)
    const editValue = ref('')
    const { openSuggestions, applySuggestion } = useAiSuggestions(suggestions, containerRef, editValue)
    openSuggestions()
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))
    applySuggestion('500')
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('containerRef 바깥 클릭 시 패널 닫힘', () => {
    const suggestions = ref<AiSuggestion[] | undefined>([{ value: '500', reason: '기준' }])
    const container = document.createElement('div')
    const containerRef = ref<HTMLElement | null>(container)
    const editValue = ref('')
    const { showSuggestions, openSuggestions } = useAiSuggestions(suggestions, containerRef, editValue)
    openSuggestions()
    expect(showSuggestions.value).toBe(true)
    // simulate outside click
    const outsideEl = document.createElement('div')
    container.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // Click event on document (outside container)
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'target', { value: outsideEl })
    document.dispatchEvent(clickEvent)
    expect(showSuggestions.value).toBe(false)
  })
})
