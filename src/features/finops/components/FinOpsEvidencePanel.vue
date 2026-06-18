<script setup lang="ts">
import { computed } from 'vue'
import type { FinOpsFinding } from '../types/finops.schema'
import {
  evidenceMetricLabel,
  formatEvidenceEntries,
  mltPillarLabel,
  resolveMltCore,
  seriesSourceBadgeLabel,
  sourceBadgeClass,
  sparklinePoints,
  thresholdLineY,
} from '../utils/evidenceMetrics'
import { humanizeFindingReason, problemStatementFromFinding } from '../utils/proposalNarrative'

const props = defineProps<{
  finding: FinOpsFinding | null
  evaluationDays?: number | null
  embedded?: boolean
}>()

const mlt = computed(() => resolveMltCore(props.finding))
const problemStatement = computed(() =>
  props.finding ? problemStatementFromFinding(props.finding) : null,
)
const showTechnicalReason = computed(() => {
  const raw = props.finding?.reason?.trim()
  if (!raw) return false
  const human = props.finding ? humanizeFindingReason(props.finding) : null
  return human !== raw && !problemStatement.value?.includes(raw)
})

const evidenceRows = () => formatEvidenceEntries(props.finding?.evidence)
const utilRows = () => formatEvidenceEntries(props.finding?.utilization as Record<string, unknown> | undefined)

const keyNumbers = computed(() => {
  const rows = evidenceRows()
  return rows.length ? rows : utilRows()
})

const hasAnyDetail = computed(() => {
  const f = props.finding
  if (!f) return false
  return Boolean(
    f.promql
    || f.logql
    || (f.log_samples && f.log_samples.length > 0)
    || f.confidence_score != null
    || f.utilization_source,
  )
})

const thresholdY = () => {
  const f = props.finding
  if (!f?.metric_threshold || !f.metric_series?.length) return null
  return thresholdLineY(f.metric_threshold, f.metric_series)
}
</script>

<template>
  <div v-if="finding" class="space-y-3">
    <!-- 1. 문제 요약 -->
    <div class="rounded-lg border border-brand/25 bg-brand/5 px-3 py-3">
      <span class="text-[10px] font-bold text-brand uppercase tracking-wider block mb-1">어떤 문제인가요?</span>
      <p class="text-sm text-text-primary leading-relaxed">{{ problemStatement }}</p>
    </div>

    <!-- 2. 핵심 수치 -->
    <div v-if="keyNumbers.length" class="grid grid-cols-2 gap-2">
      <div
        v-for="row in keyNumbers.slice(0, 4)"
        :key="row.key"
        class="rounded-lg border border-border/60 bg-bg-card px-3 py-2"
      >
        <div class="text-[9px] text-gray-400 uppercase font-bold leading-tight">{{ row.label }}</div>
        <div class="text-sm font-bold text-text-primary mt-0.5">{{ row.value }}</div>
      </div>
    </div>

    <!-- 3. 메트릭 그래프 (있을 때만) -->
    <div v-if="mlt.metrics.available && mlt.metrics.series?.length" class="rounded-lg border border-border/60 bg-bg-card px-3 py-2.5 space-y-1.5">
      <div class="flex items-center justify-between text-[10px] text-gray-400">
        <span class="font-bold">{{ finding.metric_label ?? evidenceMetricLabel(finding) }}</span>
        <div class="flex items-center gap-2">
          <span v-if="evaluationDays">{{ evaluationDays }}일</span>
          <span
            v-if="mlt.metrics.seriesSource"
            class="px-1.5 py-0.5 rounded border text-[9px] font-bold"
            :class="sourceBadgeClass(mlt.metrics.seriesSource === 'prometheus' ? 'prometheus' : 'demo')"
          >
            {{ seriesSourceBadgeLabel(mlt.metrics.seriesSource) }}
          </span>
        </div>
      </div>
      <svg viewBox="0 0 200 48" class="w-full h-12" preserveAspectRatio="none">
        <line
          v-if="thresholdY() != null"
          x1="0" :y1="thresholdY()!" x2="200" :y2="thresholdY()!"
          stroke="currentColor" stroke-width="1" stroke-dasharray="4,3"
          class="text-status-warning/70"
        />
        <polyline
          fill="none" stroke="currentColor" stroke-width="2"
          class="text-brand"
          :points="sparklinePoints(mlt.metrics.series)"
        />
      </svg>
      <p v-if="mlt.metrics.threshold != null" class="text-[9px] text-gray-400">임계값 {{ mlt.metrics.threshold }}%</p>
    </div>

    <!-- 4. 외부 링크 (Grafana / Loki / Tempo) -->
    <div v-if="mlt.metrics.grafanaUrl || mlt.logs.lokiUrl || mlt.traces.tempoUrl" class="flex flex-wrap gap-1.5">
      <a
        v-if="mlt.metrics.grafanaUrl"
        :href="mlt.metrics.grafanaUrl"
        target="_blank" rel="noopener noreferrer"
        class="inline-flex items-center gap-1 px-2 py-1 rounded border border-brand/30 bg-brand/5 text-[10px] font-bold text-brand hover:bg-brand/10"
      >
        Grafana · Prometheus
      </a>
      <a
        v-if="mlt.logs.lokiUrl"
        :href="mlt.logs.lokiUrl"
        target="_blank" rel="noopener noreferrer"
        class="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-bg-card text-[10px] font-bold text-gray-600 hover:border-brand/30"
      >
        Grafana · Loki
      </a>
      <a
        v-if="mlt.traces.tempoUrl"
        :href="mlt.traces.tempoUrl"
        target="_blank" rel="noopener noreferrer"
        class="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-bg-card text-[10px] font-bold text-gray-600 hover:border-brand/30"
      >
        Grafana · Tempo
      </a>
    </div>

    <!-- 5. 로그 하이라이트 (있을 때만) -->
    <div v-if="mlt.logs.available && mlt.logs.highlights.length" class="rounded-lg border border-border/60 bg-bg-card overflow-hidden">
      <div class="px-3 py-2 border-b border-border/40 flex items-center justify-between">
        <span class="text-[10px] font-bold text-gray-500 uppercase">{{ mltPillarLabel('logs') }}</span>
        <span v-if="mlt.logs.totalCount > mlt.logs.highlights.length" class="text-[10px] text-gray-400">
          +{{ mlt.logs.totalCount - mlt.logs.highlights.length }}줄
        </span>
      </div>
      <div class="divide-y divide-border/40 max-h-28 overflow-y-auto">
        <div
          v-for="(line, idx) in mlt.logs.highlights"
          :key="idx"
          class="px-3 py-1.5 font-mono text-[10px] leading-relaxed"
        >
          <span class="text-gray-400">{{ line.timestamp }}</span>
          <span
            class="ml-1.5 font-bold"
            :class="line.level === 'WARN' ? 'text-status-warning' : line.level === 'ERROR' ? 'text-status-critical' : 'text-gray-500'"
          >{{ line.level }}</span>
          <span class="ml-1.5 text-gray-600 line-clamp-1">{{ line.message }}</span>
        </div>
      </div>
    </div>

    <!-- 6. Guard 사유 (있을 때만) -->
    <p v-if="finding.guard_reason" class="text-[11px] text-gray-500 border-t border-border/40 pt-2">
      <span class="font-bold text-gray-400">Guard:</span> {{ finding.guard_reason }}
    </p>

    <!-- 7. 기술 상세 (접혀 있음) -->
    <details v-if="hasAnyDetail" class="rounded-lg border border-border/50 overflow-hidden group">
      <summary class="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none hover:bg-bg-muted/40 list-none text-[11px] font-bold text-gray-400">
        기술 상세 · PromQL / 로그 / 신뢰도
        <svg class="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </summary>
      <div class="px-3 pb-3 pt-2 space-y-2.5 border-t border-border/40">
        <div v-if="finding.confidence_score != null || finding.utilization_source" class="flex flex-wrap gap-1.5">
          <span
            v-if="finding.utilization_source"
            class="px-2 py-0.5 rounded border text-[9px] font-bold"
            :class="sourceBadgeClass(finding.utilization_source)"
          >
            {{ finding.utilization_source }}
          </span>
          <span
            v-if="finding.confidence_score != null"
            class="px-2 py-0.5 rounded border text-[9px] font-bold bg-brand/5 text-brand border-brand/20"
          >
            confidence {{ (finding.confidence_score * 100).toFixed(0) }}%
          </span>
        </div>
        <details v-if="finding.promql">
          <summary class="cursor-pointer text-[10px] text-gray-400 font-bold uppercase select-none mb-1">PromQL</summary>
          <pre class="p-2 rounded bg-bg-card border border-border/60 text-[10px] font-mono text-gray-600 overflow-x-auto whitespace-pre-wrap">{{ finding.promql }}</pre>
        </details>
        <details v-if="finding.logql">
          <summary class="cursor-pointer text-[10px] text-gray-400 font-bold uppercase select-none mb-1">LogQL</summary>
          <pre class="p-2 rounded bg-bg-card border border-border/60 text-[10px] font-mono text-gray-600 overflow-x-auto whitespace-pre-wrap">{{ finding.logql }}</pre>
        </details>
        <div v-if="finding.log_samples?.length" class="space-y-1">
          <div class="text-[10px] font-bold text-gray-400 uppercase">전체 로그</div>
          <div class="rounded border border-border/60 divide-y divide-border/40 max-h-32 overflow-y-auto">
            <div
              v-for="(line, idx) in finding.log_samples"
              :key="'full-' + idx"
              class="px-2.5 py-1.5 font-mono text-[10px] leading-relaxed"
            >
              <span class="text-gray-400">{{ line.timestamp }}</span>
              <span class="ml-2 font-bold text-gray-500">{{ line.level }}</span>
              <span class="ml-2 text-gray-600">{{ line.message }}</span>
            </div>
          </div>
        </div>
        <p v-if="showTechnicalReason" class="text-[10px] text-gray-400 font-mono">
          시스템 코드: {{ finding.reason }}
        </p>
      </div>
    </details>
  </div>
</template>
