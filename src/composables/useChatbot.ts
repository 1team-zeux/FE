import { useIacStore } from '@/features/iac/stores/iac.store'
import type { ChatbotTrigger } from '@/features/iac/stores/iac.store'
import { computed } from 'vue'

export function useChatbot() {
  const store = useIacStore()

  const isOpen = computed(() => store.chatbotOpen)
  const badgeCount = computed(() => store.chatbotBadgeCount)

  function open() {
    store.openChatbot()
  }

  function close() {
    if (store.chatbotOpen) store.toggleChatbot()
  }

  function toggle() {
    store.toggleChatbot()
  }

  function addTrigger(trigger: ChatbotTrigger) {
    store.addChatbotTrigger(trigger)
    if (trigger.priority === 'P0') {
      store.openChatbot()
    }
  }

  function clearTriggers() {
    store.clearChatbotTriggers()
  }

  return { isOpen, badgeCount, open, close, toggle, addTrigger, clearTriggers }
}
