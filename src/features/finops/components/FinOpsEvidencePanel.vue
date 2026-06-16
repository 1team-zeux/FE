<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FinOpsFinding } from '../types/finops.schema'
import {
  evidenceMetricLabel,
  formatEvidenceEntries,
  mltPillarLabel,
  resolveMltCore,
  seriesSourceBadgeLabel,
  sourceBadgeClass,
  sourceBadgeLabel,
  sparklinePoints,
  thresholdLineY,
} from '../utils/evidenceMetrics'
import { humanizeFindingReason, problemStatementFromFinding } from '../utils/proposalNarrative'

const props = defineProps<{
  finding: FinOpsFinding | null
  evaluationDays?: number | null
  /** Inspector 드로어 내 전체 펼침 레이아웃 */
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
const mltExpanded = ref(false)
const detailExpanded = ref(false)

watch(
  () => props.finding?.resource_id,
  () => {
    mltExpanded.value = props.embedded ? true : mlt.value.hasAnyCore
    detailExpanded.value = props.embedded ? true : false
  },
  { immediate: true },
)

const evidenceRows = () => formatEvidenceEntries(props.finding?.evidence)
const utilRows = () => formatEvidenceEntries(props.finding?.utilization as Record<string, unknown> | undefined)

const hasSecondary = computed(() => {
  const f = props.finding
  if (!f) return false
  return Boolean(
    f.promql
    || f.logql
    || (f.log_samples && f.log_samples.length > mlt.value.logs.highlights.length)
    || evidenceRows().length
    || utilRows().length,
  )
})

const thresholdY = () => {
  const f = props.finding
  if (!f?.metric_threshold || !f.metric_series?.length) return null
  return thresholdLineY(f.metric_threshold, f.metric_series)
}

const mltToggleLabel = computed(() => {
  if (!mlt.value.hasAnyCore) return '관측 증거 (M/L/T) — 핵심 항목 없음'
  const tags = mlt.value.activePillars.map((p) => p.charAt(0).toUpperCase()).join(' · ')
  return `관측 증거 · ${tags}`
})
</script>

<template>
  <div
    v-if="finding"
    class="space-y-3"
    :class="embedded ? '' : 'rounded-xl bg-bg-muted/60 border border-border p-4'"
  >
    <!-- 문제 설명 (자연어) -->
    <div class="rounded-lg border border-brand/25 bg-brand/5 px-3 py-3 space-y-1">
      <span class="text-[10px] font-bold text-brand uppercase tracking-wider">어떤 문제인가요?</span>
      <p class="text-sm text-text-primary leading-relaxed">
        {{ problemStatement }}
      </p>
    </div>

    <!-- 판정 근거 (항상 표시) -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        관측 출처
      </span>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-if="finding.utilization_source"
          class="px-2 py-0.5 rounded border text-[9px] font-bold"
          :class="sourceBadgeClass(finding.utilization_source)"
        >
          {{ sourceBadgeLabel(finding.utilization_source) }}
        </span>
        <span
          v-if="finding.confidence_score != null"
          class="px-2 py-0.5 rounded border text-[9px] font-bold bg-brand/5 text-brand border-brand/20"
        >
          confidence {{ (finding.confidence_score * 100).toFixed(0) }}%
        </span>
      </div>
    </div>

    <!-- M/L/T 핵심 (토글) -->
    <div class="rounded-lg border border-border/60 bg-bg-card/80 overflow-hidden">
      <button
        v-if="!embedded"
        type="button"
        class="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-bg-muted/40 transition-colors"
        @click="mltExpanded = !mltExpanded"
      >
        <span class="text-[11px] font-bold text-gray-600">{{ mltToggleLabel }}</span>
        <span class="text-[10px] text-gray-400 shrink-0">
          {{ mltExpanded ? '접기' : '펼치기' }}
        </span>
      </button>
      <div v-else class="px-3 py-2 border-b border-border/40">
        <span class="text-[11px] font-bold text-gray-600">{{ mltToggleLabel }}</span>
      </div>

      <div v-show="embedded || mltExpanded" class="px-3 pb-3 space-y-3" :class="embedded ? 'pt-2' : 'border-t border-border/40'">
        <p v-if="!mlt.hasAnyCore" class="text-[12px] text-gray-400 pt-2 leading-relaxed">
          Prometheus / Loki / Tempo 연동 데이터가 없습니다. 판정은 CMDB·집계 이용률 근거에 의존합니다.
        </p>

        <!-- M · Metrics -->
        <div v-if="mlt.metrics.available" class="space-y-1.5 pt-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-[10px] font-bold text-brand uppercase">{{ mltPillarLabel('metrics') }}</span>
            <span
              v-if="mlt.metrics.seriesSource"
              class="px-1.5 py-0.5 rounded border text-[9px] font-bold"
              :class="sourceBadgeClass(mlt.metrics.seriesSource === 'prometheus' ? 'prometheus' : 'demo')"
            >
              {{ seriesSourceBadgeLabel(mlt.metrics.seriesSource) }}
            </span>
          </div>

          <div v-if="mlt.metrics.series?.length" class="space-y-1">
            <div class="flex items-center justify-between text-[10px] text-gray-400">
              <span class="font-bold">{{ finding.metric_label ?? evidenceMetricLabel(finding) }}</span>
              <span v-if="evaluationDays">{{ evaluationDays }}일</span>
            </div>
            <svg viewBox="0 0 200 48" class="w-full h-12" preserveAspectRatio="none">
              <line
                v-if="thresholdY() != null"
                x1="0"
                :y1="thresholdY()!"
                x2="200"
                :y2="thresholdY()!"
                stroke="currentColor"
                stroke-width="1"
                stroke-dasharray="4,3"
                class="text-status-warning/70"
              />
              <polyline
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="text-brand"
                :points="sparklinePoints(mlt.metrics.series)"
              />
            </svg>
            <p v-if="mlt.metrics.threshold != null" class="text-[9px] text-gray-400">
              임계값 {{ mlt.metrics.threshold }}%
            </p>
          </div>

          <a
            v-if="mlt.metrics.grafanaUrl"
            :href="mlt.metrics.grafanaUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 px-2 py-1 rounded border border-brand/30 bg-brand/5 text-[10px] font-bold text-brand hover:bg-brand/10"
          >
            Grafana · Prometheus
          </a>
        </div>

        <!-- L · Logs -->
        <div v-if="mlt.logs.available" class="space-y-1.5 pt-1 border-t border-border/30">
          <span class="text-[10px] font-bold text-gray-500 uppercase block pt-2">{{ mltPillarLabel('logs') }}</span>

          <div
            v-if="mlt.logs.highlights.length"
            class="rounded border border-border/50 divide-y divide-border/40"
          >
            <div
              v-for="(line, idx) in mlt.logs.highlights"
              :key="idx"
              class="px-2 py-1.5 font-mono text-[10px] leading-relaxed"
            >
              <span class="text-gray-400">{{ line.timestamp }}</span>
              <span
                class="ml-1.5 font-bold"
                :class="line.level === 'WARN' ? 'text-status-warning' : line.level === 'ERROR' ? 'text-status-critical' : 'text-gray-500'"
              >
                {{ line.level }}
              </span>
              <span class="ml-1.5 text-gray-600 line-clamp-2">{{ line.message }}</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <a
              v-if="mlt.logs.lokiUrl"
              :href="mlt.logs.lokiUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-bg-card text-[10px] font-bold text-gray-600 hover:border-brand/30"
            >
              Grafana · Loki
            </a>
            <span v-if="mlt.logs.totalCount > mlt.logs.highlights.length" class="text-[10px] text-gray-400">
              +{{ mlt.logs.totalCount - mlt.logs.highlights.length }}줄
            </span>
          </div>
        </div>

        <!-- T · Traces -->
        <div v-if="mlt.traces.available" class="space-y-1.5 pt-1 border-t border-border/30">
          <span class="text-[10px] font-bold text-gray-500 uppercase block pt-2">{{ mltPillarLabel('traces') }}</span>
          <a
            v-if="mlt.traces.tempoUrl"
            :href="mlt.traces.tempoUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-bg-card text-[10px] font-bold text-gray-600 hover:border-brand/30"
          >
            Grafana · Tempo
          </a>
        </div>
      </div>
    </div>

    <!-- 상세 (PromQL, 전체 로그, evidence grid) -->
    <div v-if="hasSecondary" class="rounded-lg border border-border/50 overflow-hidden">
      <button
        v-if="!embedded"
        type="button"
        class="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-bold text-gray-500 hover:bg-bg-muted/30 transition-colors"
        @click="detailExpanded = !detailExpanded"
      >
        <span>관측 상세 · PromQL / 로그 전체 / 수치</span>
        <span class="text-[10px] text-gray-400 font-normal">{{ detailExpanded ? '접기' : '펼치기' }}</span>
      </button>
      <div v-else class="px-3 py-2 border-b border-border/40 text-[11px] font-bold text-gray-500">
        관측 상세 · PromQL / 로그 전체 / 수치
      </div>

      <div v-show="embedded || detailExpanded" class="px-3 pb-3 space-y-3 border-t border-border/40 pt-2">
        <details v-if="finding.promql" class="text-[10px]" open>
          <summary class="cursor-pointer text-gray-400 font-bold uppercase select-none mb-1">PromQL</summary>
          <pre class="p-2 rounded bg-bg-card border border-border/60 text-[10px] font-mono text-gray-600 overflow-x-auto whitespace-pre-wrap">{{ finding.promql }}</pre>
        </details>

        <details v-if="finding.logql" class="text-[10px]">
          <summary class="cursor-pointer text-gray-400 font-bold uppercase select-none mb-1">LogQL</summary>
          <pre class="p-2 rounded bg-bg-card border border-border/60 text-[10px] font-mono text-gray-600 overflow-x-auto whitespace-pre-wrap">{{ finding.logql }}</pre>
        </details>

        <div v-if="finding.log_samples && finding.log_samples.length > mlt.logs.highlights.length" class="space-y-1">
          <div class="text-[10px] font-bold text-gray-400 uppercase">로그 전체</div>
          <div class="rounded-lg border border-border/60 bg-bg-card divide-y divide-border/40 max-h-36 overflow-y-auto">
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

        <div v-if="evidenceRows().length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div
            v-for="row in evidenceRows()"
            :key="row.key"
            class="rounded-lg border border-border/60 bg-bg-card px-2.5 py-2"
          >
            <div class="text-[9px] text-gray-400 uppercase font-bold">{{ row.label }}</div>
            <div class="text-sm font-mono font-bold text-text-primary mt-0.5">{{ row.value }}</div>
          </div>
        </div>

        <div v-if="utilRows().length && !evidenceRows().length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div
            v-for="row in utilRows()"
            :key="'u-' + row.key"
            class="rounded-lg border border-border/60 bg-bg-card px-2.5 py-2"
          >
            <div class="text-[9px] text-gray-400 uppercase font-bold">{{ row.label }}</div>
            <div class="text-sm font-mono font-bold text-text-primary mt-0.5">{{ row.value }}</div>
          </div>
        </div>

        <p v-if="showTechnicalReason" class="text-[10px] text-gray-400 font-mono pt-1">
          시스템 판정 코드: {{ finding.reason }}
        </p>
      </div>
    </div>

    <p v-if="finding.guard_reason" class="text-[11px] text-gray-500 border-t border-border/50 pt-2">
      <span class="font-bold text-gray-400">Guard:</span> {{ finding.guard_reason }}
    </p>
  </div>
</template>
