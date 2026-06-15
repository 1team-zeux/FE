import { onMounted, onUnmounted, ref } from 'vue'
import type { InspectorPanel } from '../utils/findingInspector'

export function useFinOpsFindingInspector() {
  const open = ref(false)
  const panel = ref<InspectorPanel>('observability')

  function openPanel(next: InspectorPanel) {
    panel.value = next
    open.value = true
  }

  function close() {
    open.value = false
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open.value) {
      close()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  })

  return { open, panel, openPanel, close }
}
