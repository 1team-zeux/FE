<script setup lang="ts">
import { computed } from 'vue'
import type { FinOpsRun } from '../types/finops.schema'

const props = defineProps<{
  run: FinOpsRun | null | undefined
}>()

const emit = defineEmits<{
  viewDetail: []
}>()

const dq = computed(() => props.run?.data_quality_summary)
const rcaSummary = computed(
  () => props.run?.findings_snapshot?.executive_report?.rca_summary ?? null,
)

const linked = computed(() => dq.value?.rca_linked === true)
const unlinked = computed(() => props.run != null && dq.value?.rca_linked === false)

const linkedSummary = computed(() => {
  const hints = rcaSummary.value?.hints ?? []
  const count = dq.value?.rca_hint_count ?? hints.length
  if (!hints.length) {
    return count ? `RCA 힌트 ${count}건 반영` : 'RCA 연동 — 평가 가드 활성'
  }
  const primary = hints[0]?.cause_type ?? 'unknown'
  const extra = hints.length > 1 ? ` 외 ${hints.length - 1}건` : ''
  return `${primary}${extra}`
})

const incidentLabel = computed(() => {
  const id = dq.value?.rca_incident_id
  if (!id) return null
  return id.length > 28 ? `${id.slice(0, 26)}…` : id
})
</script>

<template>
  <!-- 미연동: 탭 위 고정, 전체 경고 -->
  <div
    v-if="unlinked"
    class="rounded-xl border border-amber-500/35 bg-amber-500/8 px-4 py-4 space-y-3"
    role="status"
  >
    <p class="font-bold text-amber-800 text-[11px] uppercase tracking-wider">
      RCA 미연동 — 장애 구간 가드 제한
    </p>

    <p class="text-[13px] text-amber-900/90 leading-relaxed">
      RCA handoff가 없어 장애·원인 기반 FinOps 가드가 적용되지 않았습니다.
    </p>

    <ul class="text-[12px] text-amber-900/80 space-y-1.5 list-disc list-inside leading-relaxed">
      <li>Open incident 매칭 defer</li>
      <li>원인 유형별 조치 제한 (예: db_saturation → stop 금지)</li>
      <li>영향 리소스 자동 defer</li>
    </ul>

    <p class="text-[12px] text-amber-800/90 border-t border-amber-500/20 pt-3 leading-relaxed">
      RCA 분석 완료 후 FinOps를 재실행하면 ZeuX DB에서 힌트를 자동 로드합니다.
    </p>
  </div>

  <!-- 연동됨: 한 줄 요약 + KPI 탭으로 이동 -->
  <div
    v-else-if="linked"
    class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-status-ok/25 bg-status-ok/5 px-3 py-2.5"
    role="status"
  >
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] min-w-0">
      <span class="shrink-0 font-bold text-status-ok text-[11px] uppercase tracking-wide">
        ✓ RCA 연동
      </span>
      <span class="text-gray-400 hidden sm:inline">·</span>
      <span class="text-gray-700 font-medium">{{ linkedSummary }}</span>
      <template v-if="incidentLabel">
        <span class="text-gray-400 hidden sm:inline">·</span>
        <span class="text-gray-500 font-mono text-[11px] truncate max-w-[200px]" :title="dq?.rca_incident_id">
          incident {{ incidentLabel }}
        </span>
      </template>
    </div>
    <button
      type="button"
      class="shrink-0 px-2.5 py-1 rounded-md border border-status-ok/30 bg-bg-card text-[11px] font-bold text-status-ok hover:bg-status-ok/10 transition-colors"
      @click="emit('viewDetail')"
    >
      상세 보기 →
    </button>
  </div>
</template>
