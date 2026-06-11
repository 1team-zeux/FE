import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { ConfidenceLevel } from '../../types/sla-bundle.schema'

const SUGGESTION_CLOSE_DELAY_MS = 210

/**
 * props must be the component's reactive props proxy (or a reactive() object)
 * for the confidence watch to trigger.
 */
export function useFieldEdit(
  props: { value: string | number | null; confidence: ConfidenceLevel; fieldId: string },
  emit: (event: 'confirm', fieldId: string, value: string | number | null) => void,
  showSuggestions: Ref<boolean>,
) {
  const isEditing = ref(props.confidence === '모호' || props.confidence === '추정')
  const editValue = ref<string>(String(props.value ?? ''))

  watch(() => props.confidence, (c) => {
    if (c === '확실' || c === '확정') {
      isEditing.value = false
    } else if (c === '모호' || c === '추정') {
      editValue.value = String(props.value ?? '')
      isEditing.value = true
    }
  })

  function acceptValue() {
    if (showSuggestions.value) {
      showSuggestions.value = false
      setTimeout(() => emit('confirm', props.fieldId, editValue.value), SUGGESTION_CLOSE_DELAY_MS)
    } else {
      emit('confirm', props.fieldId, editValue.value)
    }
  }

  function startEdit() {
    editValue.value = String(props.value ?? '')
    isEditing.value = true
  }

  function submitEdit() {
    isEditing.value = false
    emit('confirm', props.fieldId, editValue.value)
  }

  return { isEditing, editValue, acceptValue, startEdit, submitEdit }
}
