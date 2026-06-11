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
})
