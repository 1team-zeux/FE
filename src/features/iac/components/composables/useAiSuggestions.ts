import { ref, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { AiSuggestion } from '../../types/sla-bundle.schema'

export function useAiSuggestions(
  suggestions: Ref<AiSuggestion[] | undefined>,
  containerRef: Ref<HTMLElement | null>,
  editValue: Ref<string>,
) {
  const showSuggestions = ref(false)

  function openSuggestions() {
    if (suggestions.value?.length) showSuggestions.value = true
  }

  function applySuggestion(val: string) {
    editValue.value = val
    showSuggestions.value = false
  }

  function handleClickOutside(e: MouseEvent) {
    if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
      showSuggestions.value = false
    }
  }

  watch(showSuggestions, (v) => {
    if (v) document.addEventListener('click', handleClickOutside)
    else document.removeEventListener('click', handleClickOutside)
  }, { flush: 'sync' })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })

  function onSuggestEnter(el: Element) {
    const e = el as HTMLElement
    e.style.height = '0'
    e.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      e.style.transition = 'height 0.25s cubic-bezier(0.4,0,0.2,1)'
      e.style.height = e.scrollHeight + 'px'
    })
  }

  function onSuggestAfterEnter(el: Element) {
    const e = el as HTMLElement
    e.style.height = ''
    e.style.overflow = ''
    e.style.transition = ''
  }

  function onSuggestLeave(el: Element) {
    const e = el as HTMLElement
    const h = e.getBoundingClientRect().height
    e.style.height = h + 'px'
    e.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      e.style.transition = 'height 0.2s cubic-bezier(0.4,0,0.2,1)'
      e.style.height = '0'
    })
  }

  function onSuggestAfterLeave(el: Element) {
    const e = el as HTMLElement
    e.style.height = ''
    e.style.overflow = ''
    e.style.transition = ''
  }

  return {
    showSuggestions,
    openSuggestions,
    applySuggestion,
    onSuggestEnter,
    onSuggestAfterEnter,
    onSuggestLeave,
    onSuggestAfterLeave,
  }
}
