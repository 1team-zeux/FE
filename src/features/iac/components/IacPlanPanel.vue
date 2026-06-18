<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { PlanResult } from '../api/useTerraform'

const props = defineProps<{
  planData: PlanResult | null
  isPlanning: boolean
}>()

const emit = defineEmits<{
  apply: [target: 'dry_run' | 'github']
  regen: []
}>()

// 콘솔 출력 / 요약 테이블 토글
const view = ref<'console' | 'summary'>('console')

// 콘솔 타이핑 애니메이션 — terraform plan 결과를 점진적으로 흘림
const typedOutput = ref<string>('')
const isTyping = ref<boolean>(false)
const CHARS_PER_TICK = 240
const TICK_INTERVAL_MS = 16
let typingTimer: ReturnType<typeof globalThis.setInterval> | null = null

function stopTyping() {
  if (typingTimer) { globalThis.clearInterval(typingTimer); typingTimer = null }
  isTyping.value = false
}

function startTyping(fullText: string) {
  stopTyping()
  typedOutput.value = ''
  isTyping.value = true
  let cursor = 0
  typingTimer = globalThis.setInterval(() => {
    if (cursor >= fullText.length) { stopTyping(); return }
    cursor = Math.min(cursor + CHARS_PER_TICK, fullText.length)
    typedOutput.value = fullText.slice(0, cursor)
  }, TICK_INTERVAL_MS)
}

watch(() => props.planData?.planOutput, (next, prev) => {
  if (next && next !== prev) startTyping(next)
}, { immediate: true })

onUnmounted(() => stopTyping())

// 요약 테이블용 reveal
const visibleCount = ref(0)
const applyClicked = ref(false)
let revealTimer: ReturnType<typeof setInterval> | null = null

watch(() => props.planData, (data) => {
  if (revealTimer) { clearInterval(revealTimer); revealTimer = null }
  visibleCount.value = 0
  if (!data) return
  revealTimer = setInterval(() => {
    visibleCount.value++
    if (visibleCount.value >= data.items.length) {
      clearInterval(revealTimer!); revealTimer = null
    }
  }, 60)
})

onUnmounted(() => { if (revealTimer) clearInterval(revealTimer) })

const visibleItems = computed(() => props.planData?.items.slice(0, visibleCount.value) ?? [])
// 콘솔 타이핑 + 요약 reveal 둘 다 끝나야 "배포 시작" 버튼 노출
const allRevealed = computed(() =>
  !!props.planData
  && visibleCount.value >= props.planData.items.length
  && !isTyping.value,
)
const consoleProgress = computed(() => {
  const total = props.planData?.planOutput?.length ?? 0
  if (total === 0) return 100
  return Math.min(100, Math.floor((typedOutput.value.length / total) * 100))
})

const actionClass: Record<string, string> = {
  create:  'bg-green-50 text-status-ok border border-green-200',
  update:  'bg-yellow-50 text-status-pending border border-yellow-200',
  delete:  'bg-red-50 text-status-critical border border-red-200',
  replace: 'bg-orange-50 text-orange-600 border border-orange-200',
  'no-op': 'bg-gray-50 text-text-muted border border-gray-200',
}

function actionLabel(actions: string[]) {
  if (actions.includes('delete') && actions.includes('create')) return 'replace'
  return actions[0] ?? 'no-op'
}
</script>

<template>
  <div class="h-full flex flex-col pl-4 pr-8 pt-3 pb-4 border-l border-border">

    <!-- loading -->
    <div v-if="isPlanning && !planData"
      class="flex-1 flex flex-col items-center justify-center gap-3">
      <div class="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      <p class="text-sm text-text-secondary">Plan 분석 중...</p>
    </div>

    <!-- results -->
    <template v-else-if="planData">
      <div class="flex items-center justify-between mb-3 shrink-0">
        <p class="text-xs font-bold text-brand uppercase tracking-widest border-l-[3px] border-brand pl-3">
          Terraform Plan
        </p>
        <!-- 뷰 토글 -->
        <div class="inline-flex rounded-lg border border-border overflow-hidden text-[10px]">
          <button
            @click="view = 'console'"
            :class="view === 'console' ? 'bg-zinc-900 text-white' : 'bg-white text-text-secondary hover:bg-bg-muted'"
            class="px-2.5 py-1 font-medium transition-colors"
          >콘솔</button>
          <button
            @click="view = 'summary'"
            :class="view === 'summary' ? 'bg-zinc-900 text-white' : 'bg-white text-text-secondary hover:bg-bg-muted'"
            class="px-2.5 py-1 font-medium border-l border-border transition-colors"
          >요약</button>
        </div>
      </div>

      <!-- 콘솔 뷰 (기본) — terraform plan 콘솔 출력 -->
      <div v-if="view === 'console'" class="flex-1 rounded-xl overflow-hidden border border-zinc-800 flex flex-col min-h-0">
        <div class="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-white/8 shrink-0">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-red-500/70"></span>
            <span class="w-2 h-2 rounded-full bg-yellow-500/70"></span>
            <span class="w-2 h-2 rounded-full bg-green-500/70"></span>
            <span class="text-[10px] font-mono text-zinc-400 ml-2">$ terraform plan</span>
          </div>
          <span v-if="isTyping" class="flex items-center gap-1.5 text-[10px] font-mono text-green-400">
            <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            {{ consoleProgress }}%
          </span>
          <span v-else class="text-[10px] font-mono text-zinc-500">
            Plan: {{ planData.summary.add }} to add
          </span>
        </div>
        <pre class="flex-1 overflow-auto bg-zinc-900 text-zinc-100 font-mono text-[11px] leading-snug px-4 py-3 whitespace-pre"
        ><template v-for="(line, idx) in typedOutput.split('\n')" :key="idx"><span :class="{
          'text-green-400': line.startsWith('  +') || line.startsWith('+'),
          'text-red-400': line.startsWith('  -') || line.startsWith('-'),
          'text-yellow-300': line.startsWith('  ~') || line.startsWith('~'),
          'text-zinc-500': line.startsWith('  #'),
          'text-zinc-100': !line.startsWith('  +') && !line.startsWith('+') && !line.startsWith('  -') && !line.startsWith('-') && !line.startsWith('  ~') && !line.startsWith('~') && !line.startsWith('  #'),
        }">{{ line }}</span>{{ '\n' }}</template><span v-if="isTyping" class="inline-block w-1.5 h-3 bg-green-400 align-middle animate-pulse"></span></pre>
      </div>

      <!-- 요약 뷰 -->
      <div v-else class="flex-1 overflow-y-auto min-h-0">
        <div class="rounded-xl border border-border overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-bg-muted">
                <th class="text-left px-3 py-2 text-xs font-semibold text-text-secondary">주소</th>
                <th class="px-3 py-2 text-xs font-semibold text-text-secondary">타입</th>
                <th class="px-3 py-2 text-xs font-semibold text-text-secondary">변경</th>
              </tr>
            </thead>
            <TransitionGroup tag="tbody" name="plan-row">
              <tr
                v-for="item in visibleItems"
                :key="item.address"
                class="border-t border-border hover:bg-bg-muted/50 transition-colors"
              >
                <td class="px-3 py-2.5 font-mono text-[10px] text-text-primary">{{ item.address }}</td>
                <td class="px-3 py-2.5 font-mono text-[10px] text-text-secondary text-center">{{ item.type }}</td>
                <td class="px-3 py-2.5 text-center">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="actionClass[actionLabel(item.actions)]">
                    {{ actionLabel(item.actions) }}
                  </span>
                </td>
              </tr>
            </TransitionGroup>
          </table>
        </div>
      </div>

      <Transition name="fade-up">
        <div v-if="allRevealed && !applyClicked" class="flex gap-2 shrink-0 pt-3">
          <!-- 로컬 dry-run — 빠른 검증, 실제 AWS 리소스 미생성 -->
          <button
            @click="() => { applyClicked = true; emit('apply', 'dry_run') }"
            class="flex-1 px-3 py-2 border border-border bg-white hover:bg-bg-muted text-text-primary text-sm font-medium rounded-lg transition-colors"
            title="실제 AWS 리소스 만들지 않고 시뮬레이션만"
          >
            로컬 dry-run 적용
          </button>
          <!-- GitHub PR + Atlantis — 실제 배포 -->
          <button
            @click="() => { applyClicked = true; emit('apply', 'github') }"
            class="flex-1 btn-brand flex items-center justify-center gap-1.5"
            title="infra-repo에 PR 생성 → GitHub App → Atlantis가 plan/apply 실행"
          >
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            GitHub PR로 적용
          </button>
        </div>
      </Transition>
    </template>

    <!-- empty -->
    <div v-else class="flex-1 flex items-center justify-center text-text-muted text-sm">
      Plan을 실행하면 결과가 표시됩니다.
    </div>

  </div>
</template>
