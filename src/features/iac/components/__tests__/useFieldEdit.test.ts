import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useFieldEdit } from '../composables/useFieldEdit'

describe('useFieldEdit', () => {
  it('모호/추정 confidence면 편집 모드로 시작', () => {
    const emit = vi.fn()
    const showSuggestions = ref(false)
    const { isEditing } = useFieldEdit(
      { value: '99.9', confidence: '추정', fieldId: 'f1' },
      emit,
      showSuggestions,
    )
    expect(isEditing.value).toBe(true)
  })

  it('확실 confidence면 읽기 모드로 시작', () => {
    const emit = vi.fn()
    const showSuggestions = ref(false)
    const { isEditing } = useFieldEdit(
      { value: '99.9', confidence: '확실', fieldId: 'f1' },
      emit,
      showSuggestions,
    )
    expect(isEditing.value).toBe(false)
  })

  it('submitEdit 호출 시 confirm emit + 편집 모드 종료', () => {
    const emit = vi.fn()
    const showSuggestions = ref(false)
    const { editValue, submitEdit, isEditing } = useFieldEdit(
      { value: '99.9', confidence: '확실', fieldId: 'f1' },
      emit,
      showSuggestions,
    )
    editValue.value = '99.5'
    submitEdit()
    expect(emit).toHaveBeenCalledWith('confirm', 'f1', '99.5')
    expect(isEditing.value).toBe(false)
  })

  it('acceptValue — suggestions 열려있으면 닫고 210ms 후 emit', async () => {
    vi.useFakeTimers()
    const emit = vi.fn()
    const showSuggestions = ref(true)
    const { editValue, acceptValue } = useFieldEdit(
      { value: null, confidence: '추정', fieldId: 'f1' },
      emit,
      showSuggestions,
    )
    editValue.value = '500'
    acceptValue()
    expect(showSuggestions.value).toBe(false)
    expect(emit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(210)
    expect(emit).toHaveBeenCalledWith('confirm', 'f1', '500')
    vi.useRealTimers()
  })

  it('acceptValue — suggestions 닫혀있으면 즉시 emit', () => {
    const emit = vi.fn()
    const showSuggestions = ref(false)
    const { editValue, acceptValue } = useFieldEdit(
      { value: null, confidence: '추정', fieldId: 'f1' },
      emit,
      showSuggestions,
    )
    editValue.value = '800'
    acceptValue()
    expect(emit).toHaveBeenCalledWith('confirm', 'f1', '800')
  })

  it('acceptValue — isEditing false 상태에서도 editValue emit', () => {
    const emit = vi.fn()
    const showSuggestions = ref(false)
    const { editValue, acceptValue } = useFieldEdit(
      { value: '원본', confidence: '확실', fieldId: 'f1' },
      emit,
      showSuggestions,
    )
    editValue.value = '수정됨'
    acceptValue()
    expect(emit).toHaveBeenCalledWith('confirm', 'f1', '수정됨')
  })

  it('startEdit — editValue를 prop value로 초기화', () => {
    const emit = vi.fn()
    const showSuggestions = ref(false)
    const { editValue, startEdit } = useFieldEdit(
      { value: 42, confidence: '확실', fieldId: 'f1' },
      emit,
      showSuggestions,
    )
    editValue.value = '999'
    startEdit()
    expect(editValue.value).toBe('42')
  })
})
