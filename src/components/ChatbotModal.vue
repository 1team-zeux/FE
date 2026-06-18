<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useChatbot } from '@/composables/useChatbot'
import { useAlarmsQuery } from '@/composables/useAlarmsQuery'
import NimbusAvatar, { type NimbusVariant } from '@/components/NimbusAvatar.vue'
import { queryOpsAssistant } from '@/features/assistant/api/opsAssistantApi'
import { useAssistantPageContext } from '@/features/assistant/assistantContext'

defineProps<{
  mode?: 'floating' | 'panel'
}>()

const router = useRouter()
const { isOpen, badgeCount, toggle, clearTriggers } = useChatbot()
const assistantPageContext = useAssistantPageContext()

type Tab = 'chat' | 'notification'
const activeTab = ref<Tab>('chat')

// 데모 테넌트 SKT — 실시간 알람 조회
const { data: liveAlarms } = useAlarmsQuery('SKT')

// 읽음 상태 로컬 추적 (API에 read 엔드포인트 없으므로)
const readIds = ref<Set<string>>(new Set())

const notifications = computed(() =>
  (liveAlarms.value ?? []).map(a => ({
    id: a.id,
    title: a.title,
    body: a.body,
    time: a.time_ago,
    severity: a.severity,
    read: readIds.value.has(a.id),
    nav_service: a.nav_service,
    nav_tab: a.nav_tab,
  }))
)

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)
const fabBadgeCount = computed(() => badgeCount.value + unreadCount.value)

function markAllRead() {
  notifications.value.forEach(n => readIds.value.add(n.id))
}

function onNotifClick(notif: { id: string; nav_service: string; nav_tab: string }) {
  readIds.value.add(notif.id)
  router.push({
    path: `/dashboard/service/${encodeURIComponent(notif.nav_service)}`,
    query: { tenantId: 'SKT', tab: notif.nav_tab },
  })
  toggle() // 모달 닫기
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  liveContextUsed?: boolean
}

const messages = ref<Message[]>([
  {
    role: 'assistant',
    content:
      '안녕하세요! ZeuX 운영 지식 어시스턴트 Nimbus입니다.\nRCA·FinOps·guard_status 등에 대해 물어보세요.',
  },
])
const inputText = ref('')
const scrollEl = ref<HTMLElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const isWaiting = ref(false)
const pendingText = ref('')
const showClap = ref(false)
let clapTimer: ReturnType<typeof setTimeout> | null = null

function triggerClap() {
  showClap.value = true
  if (clapTimer) clearTimeout(clapTimer)
  clapTimer = setTimeout(() => {
    showClap.value = false
    clapTimer = null
  }, 2800)
}

const nimbusVariant = computed<NimbusVariant>(() => {
  if (showClap.value) return 'clap'
  if (isWaiting.value) return 'question'
  if (unreadCount.value > 0) return 'notify'
  if (badgeCount.value > 0) return 'question'
  return 'idle'
})

async function scrollToBottom() {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}

async function sendMessage(e?: KeyboardEvent) {
  if (e?.isComposing) return
  const text = inputText.value.trim()
  if (!text || isWaiting.value) return
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  if (textareaEl.value) textareaEl.value.style.height = 'auto'
  isWaiting.value = true
  pendingText.value = ''
  await scrollToBottom()
  try {
    const result = await queryOpsAssistant(text, assistantPageContext.value)
    const answer =
      result.answer?.trim() ||
      '답변을 생성하지 못했습니다. sla-agent-service와 Chroma 인덱스를 확인해 주세요.'
    messages.value.push({
      role: 'assistant',
      content: answer,
      liveContextUsed: result.live_context_used === true,
    })
    triggerClap()
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    messages.value.push({
      role: 'assistant',
      content:
        `지금은 운영 지식 API에 연결할 수 없습니다.\n\n` +
        `${msg}\n\n` +
        `• sla-agent-service (:8090) 실행 여부\n` +
        `• docs/platform/rag ingest 및 ZEUX_CHROMA_PERSIST_DIR 확인`,
    })
  } finally {
    isWaiting.value = false
    pendingText.value = ''
    await scrollToBottom()
  }
}

// ── 드래그 이동 ──────────────────────────────
const FAB_AVATAR_SIZE = 108
const BUTTON_SIZE = FAB_AVATAR_SIZE
const pos = ref({ x: 24, y: window.innerHeight - BUTTON_SIZE - 24 })
const dragOffset = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const hasDragged = ref(false)

function onPointerDown(e: PointerEvent) {
  isDragging.value = true
  hasDragged.value = false
  dragOffset.value = { x: e.clientX - pos.value.x, y: e.clientY - pos.value.y }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return
  const newX = e.clientX - dragOffset.value.x
  const newY = e.clientY - dragOffset.value.y
  if (!hasDragged.value && (Math.abs(newX - pos.value.x) > 4 || Math.abs(newY - pos.value.y) > 4)) {
    hasDragged.value = true
  }
  pos.value = {
    x: Math.max(0, Math.min(window.innerWidth - BUTTON_SIZE, newX)),
    y: Math.max(0, Math.min(window.innerHeight - BUTTON_SIZE, newY)),
  }
}

function onPointerUp() {
  isDragging.value = false
}

function handleOpen() {
  if (hasDragged.value) return
  toggle()
  if (!isOpen.value) clearTriggers()
}

// ── 모달 크기 조절 ────────────────────────────
const MIN_W = 240, MAX_W = 640
const MIN_H = 200, MAX_H = 800
const BOTTOM_GAP = 64  // 버튼 위 최소 여백
/** 모달을 캐릭터 오른쪽으로 밀어 겹침 없이 FAB가 앞에 보이게 함 */
const MODAL_SHIFT_RIGHT = 72

const modalWidth  = ref(320)
const modalHeight = ref(480)
const modalLeft   = ref(MODAL_SHIFT_RIGHT)
const modalBottom = ref(BOTTOM_GAP)

type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br'
const resizing   = ref<ResizeCorner | null>(null)
const resizeBase = ref({ x: 0, y: 0, w: 0, h: 0, l: 0, b: 0 })

function startResize(e: PointerEvent, corner: ResizeCorner) {
  e.stopPropagation()
  e.preventDefault()
  resizing.value = corner
  resizeBase.value = {
    x: e.clientX, y: e.clientY,
    w: modalWidth.value, h: modalHeight.value,
    l: modalLeft.value,  b: modalBottom.value,
  }
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup',   stopResize, { once: true })
}

function onResizeMove(e: PointerEvent) {
  if (!resizing.value) return
  const dx = e.clientX - resizeBase.value.x
  const dy = e.clientY - resizeBase.value.y
  const c  = resizing.value

  let w = resizeBase.value.w
  let h = resizeBase.value.h
  let l = resizeBase.value.l
  let b = resizeBase.value.b

  // 가로: 우측 모서리 → 폭 증가, 좌측 모서리 → 폭 증가 + 왼쪽 이동
  if (c === 'tr' || c === 'br') w = resizeBase.value.w + dx
  if (c === 'tl' || c === 'bl') { w = resizeBase.value.w - dx; l = resizeBase.value.l + dx }

  // 세로: 상단 모서리 → 높이 증가(위로 드래그), 하단 모서리 → 높이 증가(아래로 드래그) + bottom 이동
  if (c === 'tl' || c === 'tr') h = resizeBase.value.h - dy
  if (c === 'bl' || c === 'br') { h = resizeBase.value.h + dy; b = resizeBase.value.b - dy }

  modalWidth.value  = Math.max(MIN_W, Math.min(MAX_W, w))
  modalHeight.value = Math.max(MIN_H, Math.min(MAX_H, h))
  if (c === 'tl' || c === 'bl') modalLeft.value   = l
  if (c === 'bl' || c === 'br') modalBottom.value = Math.max(BOTTOM_GAP, b)
}

function stopResize() {
  resizing.value = null
  window.removeEventListener('pointermove', onResizeMove)
}
</script>

<template>
  <div
    class="fixed z-50"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
  >
    <!-- 채팅 모달 (캐릭터 FAB보다 뒤 레이어) -->
    <Transition name="slide-up">
      <div
        v-if="isOpen"
        class="absolute z-0 bg-white border border-border rounded-xl shadow-2xl flex flex-col select-none"
        :style="{
          width:  modalWidth  + 'px',
          height: modalHeight + 'px',
          left:   modalLeft   + 'px',
          bottom: modalBottom + 'px',
        }"
      >
        <!-- 헤더 -->
        <div class="px-4 pt-3 pb-0 shrink-0">
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm font-semibold text-text-primary leading-tight">ZeuX AI</p>
            <button @click="handleOpen" class="text-text-muted hover:text-text-primary transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <!-- 탭 -->
          <div class="flex border-b border-border">
            <button
              @click="activeTab = 'chat'"
              class="px-3 py-1.5 text-xs font-medium transition-colors relative"
              :class="activeTab === 'chat' ? 'text-brand' : 'text-text-muted hover:text-text-primary'"
            >
              채팅창
              <span
                v-if="assistantPageContext?.source === 'finops'"
                class="ml-1 text-[9px] font-bold text-brand/80"
              >· FinOps</span>
              <span v-if="activeTab === 'chat'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-sm" />
            </button>
            <button
              @click="activeTab = 'notification'"
              class="px-3 py-1.5 text-xs font-medium transition-colors relative flex items-center gap-1"
              :class="activeTab === 'notification' ? 'text-brand' : 'text-text-muted hover:text-text-primary'"
            >
              알림
              <span v-if="unreadCount > 0" class="w-4 h-4 rounded-full bg-status-critical text-white text-[9px] flex items-center justify-center font-bold">{{ unreadCount }}</span>
              <span v-if="activeTab === 'notification'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-sm" />
            </button>
          </div>
        </div>

        <!-- 채팅 탭 -->
        <template v-if="activeTab === 'chat'">
          <div
            ref="scrollEl"
            class="flex-1 overflow-y-auto px-4 pt-2 pb-12 space-y-2"
            style="mask-image: linear-gradient(to bottom, transparent 0, black 20px, black calc(100% - 20px), transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 20px, black calc(100% - 20px), transparent 100%);"
          >
            <template v-for="(msg, i) in messages" :key="i">
              <div class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                <div v-if="msg.role === 'assistant'" class="flex flex-col gap-1 max-w-[88%]">
                  <div class="px-3 py-2 text-xs text-text-primary leading-relaxed whitespace-pre-wrap select-text">
                    {{ msg.content }}
                  </div>
                  <span
                    v-if="msg.liveContextUsed"
                    class="self-start px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand/10 text-brand border border-brand/20"
                  >
                    FinOps live
                  </span>
                </div>
                <div v-else class="max-w-[88%] px-3 py-2 rounded-xl text-xs bg-bg-muted text-text-primary border border-border leading-relaxed whitespace-pre-wrap select-text">
                  {{ msg.content }}
                </div>
              </div>
            </template>
            <div v-if="isWaiting" class="flex flex-col gap-1">
              <div v-if="pendingText" class="px-3 py-2 text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                {{ pendingText }}
              </div>
              <div v-else class="px-3 py-2 flex gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style="animation-delay: 0ms" />
                <span class="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style="animation-delay: 150ms" />
                <span class="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style="animation-delay: 300ms" />
              </div>
            </div>
          </div>
          <div class="shrink-0 px-4 py-3 flex flex-col items-center">
            <textarea
              ref="textareaEl"
              v-model="inputText"
              @keydown.enter.exact.prevent="sendMessage($event)"
              placeholder="메시지를 입력하세요..."
              rows="1"
              class="w-full text-xs border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand bg-bg-muted text-text-primary resize-none leading-5 select-text"
              style="max-height: 80px; overflow-y: auto;"
              @input="(e) => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 80) + 'px'
              }"
            />
            <p class="text-[10px] text-text-muted mt-1.5 text-center">Enter 전송 · Shift+Enter 줄바꿈</p>
          </div>
        </template>

        <!-- 알림 탭 -->
        <template v-else>
          <div class="flex items-center justify-between px-4 py-2 shrink-0">
            <span class="text-[10px] text-text-muted">{{ unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '모두 읽음' }}</span>
            <button v-if="unreadCount > 0" @click="markAllRead" class="text-[10px] text-brand hover:underline">모두 읽음</button>
          </div>
          <div
            class="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5"
            style="mask-image: linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);"
          >
            <div
              v-for="notif in notifications"
              :key="notif.id"
              class="rounded-lg border p-3 transition-all cursor-pointer hover:shadow-sm"
              :class="notif.read
                ? 'border-border bg-white'
                : notif.severity === 'critical'
                  ? 'border-status-critical/40 bg-red-50'
                  : 'border-status-warning/40 bg-amber-50'"
              @click="onNotifClick(notif)"
            >
              <div class="flex items-start gap-2">
                <span
                  class="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                  :class="notif.read
                    ? 'bg-transparent'
                    : notif.severity === 'critical' ? 'bg-status-critical animate-pulse' : 'bg-status-warning animate-pulse'"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <p class="text-xs font-bold text-text-primary leading-tight">{{ notif.title }}</p>
                    <span
                      v-if="!notif.read"
                      class="text-[9px] font-bold px-1 py-0.5 rounded"
                      :class="notif.severity === 'critical' ? 'bg-status-critical/10 text-status-critical' : 'bg-status-warning/10 text-status-warning'"
                    >{{ notif.severity === 'critical' ? 'CRIT' : 'WARN' }}</span>
                  </div>
                  <p class="text-[11px] text-text-secondary leading-relaxed">{{ notif.body }}</p>
                  <div class="flex items-center justify-between mt-1">
                    <p class="text-[10px] text-text-muted">{{ notif.time }}</p>
                    <span class="text-[10px] text-brand font-bold">상세 보기 →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 모서리 리사이즈 핸들 -->
        <div class="resize-handle resize-tr" @pointerdown="startResize($event, 'tr')" />
      </div>
    </Transition>

    <!-- 챗봇 FAB (모달 위 레이어) -->
    <button
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @click="handleOpen"
      :class="['relative z-10 inline-flex items-center justify-center select-none bg-transparent p-0 border-0 overflow-visible', isDragging ? 'cursor-grabbing' : 'cursor-grab']"
      aria-label="챗봇 열기"
    >
      <span class="relative inline-block">
        <NimbusAvatar
          :variant="nimbusVariant"
          :size="FAB_AVATAR_SIZE"
          :scale="1"
          class="pointer-events-none drop-shadow-lg"
        />
        <span
          v-if="fabBadgeCount > 0"
          class="absolute top-[9%] right-[20%] z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
          :aria-label="`읽지 않은 알림 ${fabBadgeCount}개`"
        >{{ fabBadgeCount > 99 ? '99+' : fabBadgeCount }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.2s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(8px); }

/* 리사이즈 핸들 */
.resize-handle {
  position: absolute;
  width: 16px;
  height: 16px;
  z-index: 10;
}
.resize-handle::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: var(--color-brand);
  border-style: solid;
  opacity: 0.4;
  transition: opacity 0.15s;
}
.resize-handle:hover::after { opacity: 1; }

.resize-tl { top: 0; left: 0; cursor: nw-resize; }
.resize-tl::after { top: 4px; left: 4px; border-width: 2px 0 0 2px; border-radius: 1px 0 0 0; }

.resize-tr { top: 0; right: 0; cursor: ne-resize; }
.resize-tr::after { top: 4px; right: 4px; border-width: 2px 2px 0 0; border-radius: 0 1px 0 0; }

.resize-bl { bottom: 0; left: 0; cursor: sw-resize; }
.resize-bl::after { bottom: 4px; left: 4px; border-width: 0 0 2px 2px; border-radius: 0 0 0 1px; }

.resize-br { bottom: 0; right: 0; cursor: se-resize; }
.resize-br::after { bottom: 4px; right: 4px; border-width: 0 2px 2px 0; border-radius: 0 0 1px 0; }

</style>
