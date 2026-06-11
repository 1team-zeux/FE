<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { PlanResult } from '../api/useTerraform'

const props = defineProps<{
  planData: PlanResult | null
  isPlanning: boolean
}>()

const emit = defineEmits<{
  apply: []
  regen: []
}>()

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
  }, 110)
})

onUnmounted(() => { if (revealTimer) clearInterval(revealTimer) })

const visibleItems = computed(() => props.planData?.items.slice(0, visibleCount.value) ?? [])
const allRevealed = computed(() =>
  !!props.planData && visibleCount.value >= props.planData.items.length
)

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
      <p class="text-xs font-bold text-brand uppercase tracking-widest border-l-[3px] border-brand pl-3 mb-3 shrink-0">
        Plan 결과
      </p>

      <div class="flex-1 overflow-y-auto min-h-0">
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
        <div v-if="allRevealed && !applyClicked" class="flex gap-3 shrink-0 pt-3">
          <button @click="() => { applyClicked = true; emit('apply') }" class="flex-1 btn-brand">배포 시작</button>
        </div>
      </Transition>
    </template>

    <!-- empty -->
    <div v-else class="flex-1 flex items-center justify-center text-text-muted text-sm">
      Plan을 실행하면 결과가 표시됩니다.
    </div>

  </div>
</template>
