<script setup lang="ts">
import { computed } from 'vue'
import type { FinOpsFinding, FinOpsRun, OptimizationProposal } from '../types/finops.schema'
import {
  INSPECTOR_PANEL_LABELS,
  resolveDrillDownAvailability,
  type InspectorPanel,
} from '../utils/findingInspector'
import { evidenceMetricLabel, resolveMltCore, sparklinePoints } from '../utils/evidenceMetrics'
import {
  finopsImpactClass,
  finopsImpactLabel,
  impactLevelClass,
  impactLevelLabel,
  resolveTopologyCore,
  resolveTopologyFinding,
} from '../utils/topologyMetrics'
import { formatKrwCompact, slaImpactClass, slaImpactLabel } from '../utils/optimizationReport'
import { resolveProposalNarrative } from '../utils/proposalNarrative'

const props = defineProps<{
  run: FinOpsRun
  proposal: OptimizationProposal
  finding: FinOpsFinding | null
  evaluationDays?: number | null
}>()

const emit = defineEmits<{
  openPanel: [panel: InspectorPanel]
  adopt: []
}>()

const drill = computed(() => resolveDrillDownAvailability(props.finding, props.proposal, props.run))
const narrative = computed(() => resolveProposalNarrative(props.finding, props.proposal))
const mlt = computed(() => resolveMltCore(props.finding))
const topo = computed(() =>
  props.finding ? resolveTopologyCore(resolveTopologyFinding(props.finding).finding) : null,
)

const miniSeries = computed(() => {
  const s = props.finding?.metric_series ?? props.proposal.cpu_utilization_trend
  return s?.length ? s : null
})

const priorityClass = (band?: string) =>
  ({
    P0: 'bg-status-critical/10 text-status-critical',
    P1: 'bg-status-warning/10 text-status-warning',
    P2: 'bg-gray-100 text-gray-600',
  })[band ?? ''] ?? 'bg-gray-100 text-gray-500'

function onDrill(panel: InspectorPanel) {
  emit('openPanel', panel)
}
</script>

<template>
  <section class="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <span class="text-[10px] font-bold text-brand uppercase tracking-widest">제안 요약</span>
        <h3 class="text-lg font-bold text-text-primary mt-0.5 leading-snug">
          {{ narrative.headline }}
        </h3>
        <p class="text-[12px] font-mono text-gray-400 mt-1">
          {{ narrative.resourceTypeLabel }} · <span class="text-gray-500">{{ narrative.resourceId }}</span>
        </p>
        <p class="text-sm text-text-primary mt-2 leading-relaxed">
          {{ narrative.summary }}
        </p>
      </div>
      <div class="text-right shrink-0">
        <div class="text-2xl font-bold text-brand">{{ formatKrwCompact(proposal.monthly_savings_krw) }}</div>
        <span
          v-if="proposal.priority_band"
          class="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
          :class="priorityClass(proposal.priority_band)"
        >
          {{ proposal.priority_band }}
        </span>
      </div>
    </div>

    <div class="flex flex-wrap gap-1.5">
      <span
        class="inline-block px-2 py-0.5 rounded border text-[10px] font-bold"
        :class="slaImpactClass(proposal.sla_impact)"
      >
        SLA {{ slaImpactLabel(proposal.sla_impact) }}
      </span>
      <span
        v-if="finding?.guard_status"
        class="inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase bg-bg-muted text-gray-600 border-border"
      >
        {{ finding.guard_status }}
      </span>
      <span
        v-if="finding?.pattern_id"
        class="inline-block px-2 py-0.5 rounded border text-[10px] font-bold bg-bg-muted text-gray-600 border-border"
      >
        {{ narrative.patternLabel ?? finding.pattern_id }}
      </span>
      <span
        class="inline-block px-2 py-0.5 rounded border text-[10px] font-bold bg-brand/5 text-brand border-brand/20"
      >
        권장 {{ narrative.actionLabel }}
      </span>
      <span
        v-if="finding?.confidence_score != null"
        class="inline-block px-2 py-0.5 rounded border text-[10px] font-bold bg-bg-muted text-gray-600 border-border"
      >
        신뢰도 {{ (finding.confidence_score * 100).toFixed(0) }}%
      </span>
      <button
        v-if="run.data_quality_summary?.rca_linked"
        type="button"
        class="inline-block px-2 py-0.5 rounded border text-[10px] font-bold bg-status-ok/10 text-status-ok border-status-ok/30 hover:bg-status-ok/15"
        @click="onDrill('policy')"
      >
        RCA 연동
      </button>
      <span
        v-if="topo?.finopsImpact && topo.finopsImpact !== 'none'"
        class="inline-block px-2 py-0.5 rounded border text-[10px] font-bold"
        :class="finopsImpactClass(topo.finopsImpact)"
      >
        {{ finopsImpactLabel(topo.finopsImpact) }}
      </span>
      <span
        v-if="topo?.proposalImpact"
        class="inline-block px-2 py-0.5 rounded border text-[10px] font-bold"
        :class="impactLevelClass(topo.proposalImpact.impact_level)"
      >
        영향 {{ impactLevelLabel(topo.proposalImpact.impact_level) }}
      </span>
    </div>

    <div
      v-if="narrative.problemStatement"
      class="rounded-lg border border-brand/20 bg-brand/5 px-3 py-2.5"
    >
      <p class="text-[10px] font-bold text-brand uppercase tracking-wider mb-1">감지된 문제</p>
      <p class="text-[13px] text-text-primary leading-relaxed">{{ narrative.problemStatement }}</p>
    </div>

    <p
      v-if="finding?.guard_reason || proposal.sla_impact_detail"
      class="text-[12px] text-gray-600 leading-relaxed border-l-2 border-brand/30 pl-3"
    >
      {{ finding?.guard_reason ?? proposal.sla_impact_detail }}
    </p>

    <div
      v-if="miniSeries"
      class="rounded-lg border border-border/60 bg-bg-muted/30 px-3 py-2 flex items-center gap-3"
    >
      <div class="min-w-0 flex-1">
        <div class="text-[9px] font-bold text-gray-400 uppercase">
          {{ finding?.metric_label ?? proposal.metric_label ?? (finding ? evidenceMetricLabel(finding) : '관측 메트릭') }}
          <span v-if="evaluationDays" class="ml-1">{{ evaluationDays }}일</span>
        </div>
        <svg viewBox="0 0 200 36" class="w-full h-9 mt-1" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="text-brand"
            :points="sparklinePoints(miniSeries)"
          />
        </svg>
      </div>
      <button
        type="button"
        class="drill-link drill-link--observability shrink-0"
        :disabled="!drill.observability"
        @click="onDrill('observability')"
      >
        자세히
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <button
        type="button"
        class="drill-btn drill-btn--observability"
        :class="{ 'drill-btn--disabled': !drill.observability }"
        :disabled="!drill.observability"
        @click="onDrill('observability')"
      >
        <span class="drill-btn__label">{{ INSPECTOR_PANEL_LABELS.observability }}</span>
        <span class="drill-btn__hint">{{ drill.observabilityHint }}</span>
      </button>
      <button
        type="button"
        class="drill-btn drill-btn--topology"
        :class="{ 'drill-btn--disabled': !drill.topology }"
        :disabled="!drill.topology"
        @click="onDrill('topology')"
      >
        <span class="drill-btn__label">{{ INSPECTOR_PANEL_LABELS.topology }}</span>
        <span class="drill-btn__hint">{{ drill.topologyHint }}</span>
      </button>
      <button
        type="button"
        class="drill-btn drill-btn--policy"
        @click="onDrill('policy')"
      >
        <span class="drill-btn__label">{{ INSPECTOR_PANEL_LABELS.policy }}</span>
        <span class="drill-btn__hint">{{ drill.policyHint }}</span>
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
      <button
        type="button"
        class="px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-bold hover:brightness-110"
        @click="emit('adopt')"
      >
        운영자 검토 → 채택
      </button>
      <span
        v-if="proposal.terraform_handoff"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-brand/50 text-[11px] font-bold text-brand"
      >
        ③ Terraform 핸드오프
      </span>
    </div>
  </section>
</template>

<style scoped>
.drill-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  background: color-mix(in oklab, var(--color-bg-muted) 40%, transparent);
  text-align: left;
  transition:
    border-color 0.22s ease,
    background-color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.18s ease;
}

.drill-btn:not(:disabled):hover {
  transform: translateY(-1px);
}

.drill-btn:not(:disabled):active {
  transform: translateY(0);
}

.drill-btn--disabled,
.drill-btn:disabled {
  border-color: color-mix(in oklab, var(--color-border) 50%, transparent);
  background: color-mix(in oklab, var(--color-bg-muted) 20%, transparent);
  opacity: 0.5;
  cursor: not-allowed;
}

.drill-btn__label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  transition: color 0.22s ease;
}

.drill-btn__hint {
  font-size: 11px;
  color: var(--color-text-secondary);
  transition: color 0.22s ease;
}

.drill-btn--observability:not(:disabled):hover {
  border-color: color-mix(in oklab, var(--color-brand) 45%, var(--color-border));
  background: color-mix(in oklab, var(--color-brand) 9%, var(--color-bg-card));
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--color-brand) 22%, transparent),
    0 6px 18px -6px color-mix(in oklab, var(--color-brand) 38%, transparent);
}

.drill-btn--observability:not(:disabled):hover .drill-btn__label {
  color: var(--color-brand);
}

.drill-btn--topology:not(:disabled):hover {
  border-color: color-mix(in oklab, var(--color-status-warning) 45%, var(--color-border));
  background: color-mix(in oklab, var(--color-status-warning) 10%, var(--color-bg-card));
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--color-status-warning) 22%, transparent),
    0 6px 18px -6px color-mix(in oklab, var(--color-status-warning) 36%, transparent);
}

.drill-btn--topology:not(:disabled):hover .drill-btn__label {
  color: var(--color-status-warning);
}

.drill-btn--policy:not(:disabled):hover {
  border-color: color-mix(in oklab, var(--color-status-ok) 42%, var(--color-border));
  background: color-mix(in oklab, var(--color-status-ok) 9%, var(--color-bg-card));
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--color-status-ok) 20%, transparent),
    0 6px 18px -6px color-mix(in oklab, var(--color-status-ok) 34%, transparent);
}

.drill-btn--policy:not(:disabled):hover .drill-btn__label {
  color: var(--color-status-ok);
}

.drill-link {
  font-size: 10px;
  font-weight: 700;
  padding: 0.2rem 0.45rem;
  border-radius: 0.375rem;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.drill-link--observability {
  color: var(--color-brand);
}

.drill-link--observability:not(:disabled):hover {
  background: color-mix(in oklab, var(--color-brand) 12%, transparent);
  box-shadow: 0 0 12px -2px color-mix(in oklab, var(--color-brand) 40%, transparent);
}

.drill-link:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
