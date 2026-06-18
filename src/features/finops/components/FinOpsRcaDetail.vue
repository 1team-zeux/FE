<script setup lang="ts">
import { computed } from 'vue'
import type { FinOpsRun } from '../types/finops.schema'
import { RCA_RULES } from '../data/policyRuleRegistry'

const props = defineProps<{
  run: FinOpsRun
}>()

const dq = computed(() => props.run.data_quality_summary)
const rcaSummary = computed(
  () => props.run.findings_snapshot?.executive_report?.rca_summary ?? null,
)

const sourceLabel = computed(() => {
  const src = dq.value?.rca_source
  if (src === 'zeux_db') return 'ZeuX DB 장애 기록'
  if (src === 'handoff_file') return '분석 파일'
  if (src === 'explicit') return '직접 입력'
  if (src === 'inline') return '인라인 데이터'
  return src ?? '—'
})

function causeOutcome(causeType?: string): string {
  if (!causeType) return '—'
  const row = RCA_RULES.find((r) => r.name === causeType)
  return row?.outcome ?? causeType
}

function formatConfidence(value?: number | null): string {
  if (value == null) return '—'
  const pct = value <= 1 ? value * 100 : value
  return `${pct.toFixed(0)}%`
}
</script>

<template>
  <section
    id="finops-rca-detail"
    class="px-4 py-4 space-y-4 scroll-mt-4"
  >
    <p class="font-bold text-[11px] text-gray-500 uppercase tracking-wider">장애 이력 연동 상세</p>

    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
      <div>
        <dt class="text-gray-400 font-bold text-[10px] mb-0.5">데이터 출처</dt>
        <dd class="text-gray-700 font-medium">{{ sourceLabel }}</dd>
      </div>
      <div v-if="dq?.rca_incident_id">
        <dt class="text-gray-400 font-bold text-[10px] mb-0.5">인시던트 ID</dt>
        <dd class="font-mono text-[11px] text-gray-600 break-all">{{ dq.rca_incident_id }}</dd>
      </div>
      <div v-if="dq?.rca_hint_count != null">
        <dt class="text-gray-400 font-bold text-[10px] mb-0.5">감지된 원인</dt>
        <dd class="text-gray-700 font-medium">{{ dq.rca_hint_count }}건</dd>
      </div>
    </dl>

    <div v-if="rcaSummary?.hints?.length" class="space-y-2">
      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">원인 분석 결과</p>
      <ul class="space-y-2">
        <li
          v-for="(hint, idx) in rcaSummary.hints"
          :key="idx"
          class="rounded-lg border border-border/50 bg-bg-card px-3 py-2.5 text-[12px]"
        >
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="font-bold text-text-primary">{{ hint.rationale ?? hint.cause_type }}</span>
            <span class="px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[10px] font-bold">
              신뢰도 {{ formatConfidence(hint.confidence) }}
            </span>
          </div>
          <p class="text-[11px] text-gray-500">
            FinOps 조치: {{ causeOutcome(hint.cause_type) }}
          </p>
        </li>
      </ul>
    </div>
  </section>
</template>
