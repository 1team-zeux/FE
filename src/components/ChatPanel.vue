<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([
  { role: 'assistant', content: '안녕하세요! IaC 구성이나 SLA 설정에 대해 궁금한 점을 물어보세요.' },
])
const inputText = ref('')
const scrollEl = ref<HTMLElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const isWaiting = ref(false)
const pendingText = ref('')

const lastAssistantIndex = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'assistant') return i
  }
  return -1
})

async function scrollToBottom() {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}

async function sendMessage(e?: KeyboardEvent) {
  if (e?.isComposing) return  // IME 조합 완료 전 Enter 무시
  const text = inputText.value.trim()
  if (!text) return
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  if (textareaEl.value) textareaEl.value.style.height = 'auto'
  isWaiting.value = true
  await scrollToBottom()
  setTimeout(async () => {
    // 아이콘 표시 후 텍스트 등장
    pendingText.value = '확인했습니다. 검토해 드리겠습니다.'
    await scrollToBottom()
    await nextTick()
    messages.value.push({ role: 'assistant', content: pendingText.value })
    pendingText.value = ''
    isWaiting.value = false
  }, 600)
}
</script>

<template>
  <aside class="bg-white rounded-xl shadow-sm border border-border flex flex-col overflow-hidden min-w-0">
    <!-- 헤더 -->
    <div class="px-4 py-3 flex items-center gap-2.5 shrink-0">
      <div>
        <p class="text-sm font-semibold text-text-primary leading-tight">ZeuX AI</p>
        <p class="text-[10px] text-text-muted leading-tight">어시스턴트</p>
      </div>
    </div>

    <!-- 메시지 목록 -->
    <div
      ref="scrollEl"
      class="flex-1 overflow-y-auto px-4 pt-2 pb-16 space-y-2"
      style="mask-image: linear-gradient(to bottom, transparent 0, black 20px, black calc(100% - 20px), transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 20px, black calc(100% - 20px), transparent 100%);"
    >
      <template v-for="(msg, i) in messages" :key="i">
        <div class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          <!-- 어시스턴트 버블 -->
          <div v-if="msg.role === 'assistant'" class="flex flex-col gap-1 max-w-[88%]">
            <div class="px-3 py-2 text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
              {{ msg.content }}
            </div>
            <!-- 답변 완료 후 아이콘: 대기 중이 아닐 때만 표시 -->
            <div v-if="i === lastAssistantIndex && !isWaiting" class="flex items-center gap-1.5 px-3">
              <div class="chatbot-sprite-sm shrink-0" />
              <span class="text-[10px] text-text-muted font-medium">ZeuX AI</span>
            </div>
          </div>

          <!-- 유저 버블 -->
          <div v-else class="max-w-[88%] px-3 py-2 rounded-xl text-xs bg-bg-muted text-text-primary border border-border leading-relaxed whitespace-pre-wrap">
            {{ msg.content }}
          </div>
        </div>
      </template>

      <!-- 대기 중: 텍스트(있으면) → 아이콘 순서 -->
      <div v-if="isWaiting" class="flex flex-col gap-1">
        <div v-if="pendingText" class="px-3 py-2 text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
          {{ pendingText }}
        </div>
        <div class="flex items-center gap-1.5 px-3 py-1">
          <div class="chatbot-sprite-sm shrink-0" />
          <span class="text-[10px] text-text-muted font-medium">ZeuX AI</span>
        </div>
      </div>
    </div>

    <!-- 입력창 (전송 버튼 없음, 중앙 정렬) -->
    <div class="shrink-0 px-4 py-3 flex flex-col items-center">
      <textarea
        ref="textareaEl"
        v-model="inputText"
        @keydown.enter.exact.prevent="sendMessage($event)"
        placeholder="메시지를 입력하세요..."
        rows="1"
        class="w-3/4 text-xs border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand bg-bg-muted text-text-primary resize-none leading-5"
        style="max-height: 80px; overflow-y: auto;"
        @input="(e) => {
          const el = e.target as HTMLTextAreaElement
          el.style.height = 'auto'
          el.style.height = Math.min(el.scrollHeight, 80) + 'px'
        }"
      />
      <p class="text-[10px] text-text-muted mt-1.5 text-center">Enter 전송 · Shift+Enter 줄바꿈</p>
    </div>
  </aside>
</template>

<style scoped>
.chatbot-sprite-sm {
  width: 44px;
  height: 38px;
  background-image: url('@/assets/images/chatbot.png');
  background-size: 224px 280px;
  background-repeat: no-repeat;
  animation: chatbot-blink-sm 3s infinite;
}

@keyframes chatbot-blink-sm {
  0%        { background-position: -6px -4px;    animation-timing-function: steps(1, end); }
  80%       { background-position: -62px -4px;   animation-timing-function: steps(1, end); }
  83%       { background-position: -118px -4px;  animation-timing-function: steps(1, end); }
  86%       { background-position: -174px -4px;  animation-timing-function: steps(1, end); }
  89%       { background-position: -118px -4px;  animation-timing-function: steps(1, end); }
  92%       { background-position: -62px -4px;   animation-timing-function: steps(1, end); }
  95%, 100% { background-position: -6px -4px; }
}
</style>
