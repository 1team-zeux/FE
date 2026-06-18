<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'

const props = defineProps<{
  hclPreview: string | null
  isGenerating: boolean
  isPlanning: boolean
  planStarted: boolean
}>()

defineEmits<{
  plan: []
}>()

// ── HCL 타이핑 애니메이션 ─────────────────────────────────────────
// hclPreview가 도착하면 빈 문자열에서 시작해 청크 단위로 점진적으로 채운다.
// 운영자에게 "AI가 코드를 실시간으로 짜는 듯한" 시각적 피드백 제공.
const typedContent = ref<string>('')
const isTyping = ref<boolean>(false)
const CHARS_PER_TICK = 90    // 한 번에 추가할 문자 수
const TICK_INTERVAL_MS = 16  // 약 60fps

let typingTimer: ReturnType<typeof globalThis.setInterval> | null = null

function stopTyping() {
  if (typingTimer) {
    globalThis.clearInterval(typingTimer)
    typingTimer = null
  }
  isTyping.value = false
}

function startTyping(fullText: string) {
  stopTyping()
  typedContent.value = ''
  isTyping.value = true

  let cursor = 0
  typingTimer = globalThis.setInterval(() => {
    if (cursor >= fullText.length) {
      stopTyping()
      return
    }
    cursor = Math.min(cursor + CHARS_PER_TICK, fullText.length)
    typedContent.value = fullText.slice(0, cursor)
  }, TICK_INTERVAL_MS)
}

watch(
  () => props.hclPreview,
  (next, prev) => {
    if (next && next !== prev) {
      startTyping(next)
    } else if (!next) {
      stopTyping()
      typedContent.value = ''
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => stopTyping())

// 화면 표시용 — 타이핑 중에는 typedContent + 커서, 완료 후 hclPreview 그대로.
const displayContent = computed(() => {
  if (isTyping.value) return typedContent.value
  return props.hclPreview ?? ''
})

// 진행률 (전체 HCL 대비)
const progress = computed(() => {
  if (!props.hclPreview) return 0
  const total = props.hclPreview.length
  if (total === 0) return 100
  return Math.min(100, Math.floor((typedContent.value.length / total) * 100))
})

// 로딩 상태: hclPreview가 아직 없거나 타이핑 중
const showInitialLoading = computed(() => !props.hclPreview && props.isGenerating)
const showTypingHeader = computed(() => isTyping.value)
</script>

<template>
  <div class="h-full flex flex-col pl-8 pr-4 pt-3 pb-4">

    <!-- 초기 로딩 (생성 요청 → 응답 대기) -->
    <div v-if="showInitialLoading" class="flex-1 flex flex-col items-center justify-center gap-4">
      <div class="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      <p class="text-text-secondary">Terraform HCL 코드 생성 중...</p>
      <p class="text-xs text-text-muted">최대 45초까지 대기합니다 (approved_topology 저장 대기)</p>
    </div>

    <!-- 생성 실패 -->
    <div v-else-if="!hclPreview && !isGenerating" class="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
      <svg class="w-12 h-12 text-status-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <p class="text-base font-semibold text-text-primary">Terraform 코드 생성 실패</p>
      <p class="text-sm text-text-secondary">토폴로지가 아직 저장되지 않았거나 백엔드 응답이 없습니다.</p>
      <p class="text-xs text-text-muted">토폴로지 선택 페이지로 돌아가 다시 시도해 주세요.</p>
    </div>

    <!-- HCL 코드 (타이핑 애니메이션 + 정적 표시 공통) -->
    <template v-else-if="hclPreview !== null">
      <div class="flex-1 rounded-xl overflow-hidden border border-border flex flex-col relative min-h-0">

        <!-- 헤더 -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-white/8 shrink-0">
          <div class="flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            <span class="text-xs font-mono font-medium text-zinc-300">main.tf</span>
            <!-- 타이핑 중 라이브 인디케이터 -->
            <span v-if="showTypingHeader" class="flex items-center gap-1.5 ml-2 text-[10px] font-mono text-green-400">
              <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              generating... {{ progress }}%
            </span>
          </div>
          <span class="text-[10px] font-semibold tracking-wide text-brand bg-brand/15 border border-brand/25 px-2 py-0.5 rounded">
            Terraform HCL
          </span>
        </div>

        <!-- 진행 바 (타이핑 중에만 표시) -->
        <div v-if="showTypingHeader" class="h-0.5 bg-zinc-800 shrink-0">
          <div class="h-full bg-brand transition-all duration-75 ease-linear" :style="{ width: progress + '%' }"></div>
        </div>

        <!-- 코드 영역 -->
        <pre
          class="flex-1 overflow-y-auto bg-zinc-900 text-zinc-100 font-mono text-[13px] px-5 py-4 leading-relaxed whitespace-pre-wrap"
        ><span>{{ displayContent }}</span><span v-if="showTypingHeader" class="inline-block w-2 h-4 bg-green-400 ml-0.5 align-middle animate-pulse"></span></pre>

        <!-- Plan 실행 버튼 (타이핑 완료 후에만 표시) -->
        <Transition name="fade">
          <div v-if="!planStarted && !isTyping" class="absolute bottom-4 right-4">
            <button
              @click="$emit('plan')"
              :disabled="isPlanning"
              class="btn-brand flex items-center gap-2 shadow-lg shadow-black/40"
            >
              <div v-if="isPlanning" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
              {{ isPlanning ? 'Plan 실행 중...' : 'Terraform Plan 실행' }}
            </button>
          </div>
        </Transition>

      </div>
    </template>

  </div>
</template>
