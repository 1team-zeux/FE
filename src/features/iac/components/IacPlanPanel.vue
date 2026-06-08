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

const changeTypeClass: Record<string, string> = {
  add:     'bg-green-50 text-status-ok border border-green-200',
  change:  'bg-yellow-50 text-status-pending border border-yellow-200',
  destroy: 'bg-red-50 text-status-critical border border-red-200',
}
const riskLevelClass: Record<string, string> = {
  low:    'bg-green-50 text-status-ok border border-green-200',
  medium: 'bg-yellow-50 text-status-pending border border-yellow-200',
  high:   'bg-red-50 text-status-critical border border-red-200',
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
                <th class="text-left px-3 py-2 text-xs font-semibold text-text-secondary">리소스</th>
                <th class="px-3 py-2 text-xs font-semibold text-text-secondary">유형</th>
                <th class="px-3 py-2 text-xs font-semibold text-text-secondary">위험도</th>
                <th class="px-3 py-2 text-xs font-semibold text-text-secondary">SLA 영향</th>
              </tr>
            </thead>
            <TransitionGroup tag="tbody" name="plan-row">
              <tr
                v-for="item in visibleItems"
                :key="item.resource"
                class="border-t border-border hover:bg-bg-muted/50 transition-colors"
              >
                <td class="px-3 py-2.5 font-mono text-[10px] text-text-primary">{{ item.resource }}</td>
                <td class="px-3 py-2.5 text-center">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="changeTypeClass[item.changeType]">
                    {{ item.changeType }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="riskLevelClass[item.riskLevel]">
                    {{ item.riskLevel }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-[10px] text-text-secondary">{{ item.slaImpact }}</td>
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
