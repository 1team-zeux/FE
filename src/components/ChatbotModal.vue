<script setup lang="ts">
import { ref } from 'vue'
import { useChatbot } from '@/composables/useChatbot'

defineProps<{
  mode?: 'floating' | 'panel'
}>()

const { isOpen, badgeCount, toggle, clearTriggers } = useChatbot()

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([
  { role: 'assistant', content: '안녕하세요! IaC 온보딩을 도와드리겠습니다. 궁금한 점을 물어보세요.' },
])
const inputText = ref('')

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  setTimeout(() => {
    messages.value.push({ role: 'assistant', content: '확인했습니다. 해당 필드를 검토해 드리겠습니다.' })
  }, 600)
}

function handleOpen() {
  toggle()
  if (!isOpen.value) clearTriggers()
}
</script>

<template>
  <div class="fixed bottom-6 left-6 z-50">
    <button
      @click="handleOpen"
      class="w-12 h-12 rounded-full btn-brand shadow-lg flex items-center justify-center relative"
      aria-label="챗봇 열기"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
      </svg>
      <span
        v-if="badgeCount > 0"
        class="absolute -top-1 -right-1 w-5 h-5 bg-status-critical text-white text-xs rounded-full flex items-center justify-center font-bold"
      >{{ badgeCount }}</span>
    </button>

    <Transition name="slide-up">
      <div
        v-if="isOpen"
        class="absolute bottom-14 left-0 w-72 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        <div class="btn-brand px-4 py-3 flex items-center justify-between">
          <span class="text-white font-semibold text-sm">ZeuX AI 어시스턴트</span>
          <button @click="handleOpen" class="text-white/80 hover:text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="h-64 overflow-y-auto p-3 space-y-3 bg-bg-muted">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="flex"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[80%] px-3 py-2 rounded-lg text-sm"
              :class="msg.role === 'user'
                ? 'bg-brand text-white'
                : 'bg-bg-card text-text-primary border border-border'"
            >{{ msg.content }}</div>
          </div>
        </div>

        <div class="p-3 border-t border-border flex gap-2">
          <input
            v-model="inputText"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="메시지를 입력하세요..."
            class="flex-1 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-brand bg-bg-card text-text-primary"
          />
          <button @click="sendMessage" class="btn-brand px-3 py-2 rounded-lg text-sm">전송</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.2s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(8px); }
</style>
