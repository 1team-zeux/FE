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
  if (src === 'zeux_db') return 'ZeuX DB — open incident RCA'
  if (src === 'handoff_file') return 'RCA handoff 파일'
  if (src === 'explicit') return '명시적 handoff 경로'
  if (src === 'inline') return '인라인 handoff'
  return src ?? 'RCA'
})

const pipelineStages = [
  { key: 'scope_policy', label: 'scope_policy', desc: '보수 모드·prod 차단 등 정책 조정' },
  { key: 'idle_detect', label: 'idle_detect', desc: '유휴 패턴 억제 (오탐 방지)' },
  { key: 'sla_risk_guard', label: 'sla_risk_guard', desc: '리소스별 defer / block' },
] as const

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
    class="rounded-xl border border-status-ok/25 bg-status-ok/5 px-4 py-4 space-y-4 scroll-mt-4"
  >
    <p class="font-bold text-status-ok text-[11px] uppercase tracking-wider">
      RCA 연동 — 평가 가드 상세
    </p>

    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
      <div>
        <dt class="text-gray-400 font-bold uppercase text-[10px] mb-0.5">데이터 출처</dt>
        <dd class="text-gray-700 font-medium">{{ sourceLabel }}</dd>
      </div>
      <div v-if="dq?.rca_incident_id">
        <dt class="text-gray-400 font-bold uppercase text-[10px] mb-0.5">Incident</dt>
        <dd class="font-mono text-[11px] text-gray-600 break-all">{{ dq.rca_incident_id }}</dd>
      </div>
      <div v-if="dq?.rca_hint_count != null">
        <dt class="text-gray-400 font-bold uppercase text-[10px] mb-0.5">힌트</dt>
        <dd class="text-gray-700 font-medium">{{ dq.rca_hint_count }}건</dd>
      </div>
    </dl>

    <div v-if="rcaSummary?.hints?.length" class="space-y-2">
      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">원인 힌트</p>
      <ul class="space-y-2">
        <li
          v-for="(hint, idx) in rcaSummary.hints"
          :key="idx"
          class="rounded-lg border border-border/50 bg-bg-card px-3 py-2.5 text-[12px]"
        >
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="font-mono font-bold text-text-primary">{{ hint.cause_type }}</span>
            <span class="px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[10px] font-bold">
              confidence {{ formatConfidence(hint.confidence) }}
            </span>
          </div>
          <p v-if="hint.rationale" class="text-gray-600 leading-relaxed mb-1.5">
            {{ hint.rationale }}
          </p>
          <p class="text-[11px] text-gray-400">
            <span class="font-bold">FinOps 조치:</span>
            {{ causeOutcome(hint.cause_type) }}
          </p>
        </li>
      </ul>
    </div>

    <div class="space-y-2 border-t border-status-ok/15 pt-3">
      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">반영 단계</p>
      <ul class="space-y-1.5">
        <li
          v-for="stage in pipelineStages"
          :key="stage.key"
          class="text-[12px] leading-relaxed"
        >
          <code class="text-[11px] font-mono text-brand bg-brand/5 px-1 py-0.5 rounded">{{ stage.label }}</code>
          <span class="text-gray-500 ml-1.5">— {{ stage.desc }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
