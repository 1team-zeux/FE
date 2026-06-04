<script setup lang="ts">
import { ref, nextTick } from 'vue'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([
  { role: 'assistant', content: '안녕하세요! 궁금한 점을 물어보세요.' },
])
const inputText = ref('')
const scrollEl = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  await scrollToBottom()
  setTimeout(async () => {
    messages.value.push({ role: 'assistant', content: '확인했습니다. 검토해 드리겠습니다.' })
    await scrollToBottom()
  }, 600)
}
</script>

<template>
  <div class="flex flex-col h-full bg-bg-card border-l border-border">
    <!-- 헤더 -->
    <div class="btn-brand px-4 py-3 flex items-center gap-2 shrink-0">
      <svg class="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
      </svg>
      <span class="text-white font-semibold text-sm">ZeuX AI 어시스턴트</span>
    </div>

    <!-- 메시지 목록 -->
    <div
      ref="scrollEl"
      class="flex-1 overflow-y-auto p-4 space-y-3 bg-bg-muted"
    >
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <!-- 어시스턴트 아바타 -->
        <div v-if="msg.role === 'assistant'" class="flex items-end gap-2 max-w-[85%]">
          <div class="w-6 h-6 rounded-full btn-brand flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-0.5">
            Z
          </div>
          <div class="px-3 py-2 rounded-2xl rounded-bl-sm text-sm bg-bg-card text-text-primary border border-border leading-relaxed">
            {{ msg.content }}
          </div>
        </div>

        <!-- 유저 버블 -->
        <div v-else class="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm text-sm bg-brand text-white leading-relaxed">
          {{ msg.content }}
        </div>
      </div>
    </div>

    <!-- 입력창 -->
    <div class="shrink-0 p-3 border-t border-border bg-bg-card">
      <div class="flex gap-2 items-end">
        <textarea
          v-model="inputText"
          @keydown.enter.exact.prevent="sendMessage"
          placeholder="메시지를 입력하세요..."
          rows="1"
          class="flex-1 text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:border-brand bg-bg-muted text-text-primary resize-none leading-5"
          style="max-height: 96px; overflow-y: auto;"
          @input="(e) => {
            const el = e.target as HTMLTextAreaElement
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 96) + 'px'
          }"
        />
        <button
          @click="sendMessage"
          :disabled="!inputText.trim()"
          class="btn-brand px-3 py-2 rounded-xl text-sm shrink-0 self-end"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      <p class="text-[10px] text-text-muted mt-1.5 text-center">Enter로 전송 · Shift+Enter 줄바꿈</p>
    </div>
  </div>
</template>
