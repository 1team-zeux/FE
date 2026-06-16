<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FinOpsFinding } from '../types/finops.schema'
import {
  changeTypeLabel,
  finopsImpactClass,
  finopsImpactLabel,
  formatTopologyTimestamp,
  impactLevelClass,
  impactLevelLabel,
  resolveTopologyCore,
  resolveTopologyFinding,
} from '../utils/topologyMetrics'
import {
  buildDesignDiagramAsIsViz,
  buildDesignDiagramToBeViz,
  buildResourceGraphAsIsViz,
  buildResourceGraphToBeViz,
} from '../utils/topologyGraphLayout'
import FinOpsTopologyGraphViz from './FinOpsTopologyGraphViz.vue'

const props = defineProps<{
  finding: FinOpsFinding | null
  /** Inspector 드로어: 접기 없이 전체 표시 */
  embedded?: boolean
}>()

const resolved = computed(() => resolveTopologyFinding(props.finding))
const topo = computed(() => resolveTopologyCore(resolved.value.finding))
const expanded = ref(false)

watch(
  () => props.finding?.resource_id,
  () => {
    expanded.value = props.embedded ? true : topo.value.hasCore
  },
  { immediate: true },
)

const toggleLabel = computed(() => {
  if (!topo.value.hasCore) return '토폴로지·변경 맥락 — 데이터 없음'
  const parts: string[] = []
  if (topo.value.proposalImpact) parts.push('제안 diff')
  if (topo.value.designProposalImpact) parts.push('설계 diff')
  if ((topo.value.resourceGraph.nodes?.length ?? 0) > 0) {
    parts.push(`리소스 ${topo.value.resourceGraph.node_count ?? topo.value.resourceGraph.nodes?.length}`)
  }
  if (topo.value.changeEvents.length) parts.push(`변경 ${topo.value.changeEvents.length}`)
  const depCount = (topo.value.upstream?.length ?? 0) + (topo.value.downstream?.length ?? 0)
  if (depCount) parts.push(`서비스 의존 ${depCount}`)
  return `토폴로지·변경 맥락 · ${parts.join(' · ')}`
})

const impact = computed(() => topo.value.proposalImpact)

const resourceVizAsIs = computed(() => {
  const ctx = resolved.value.finding?.topology_context
  if (!ctx) return null
  return buildResourceGraphAsIsViz(ctx, props.finding?.resource_id)
})

const resourceVizToBe = computed(() => {
  const ctx = resolved.value.finding?.topology_context
  if (!ctx) return null
  return buildResourceGraphToBeViz(ctx, props.finding?.resource_id)
})

const designVizAsIs = computed(() => {
  const ctx = resolved.value.finding?.topology_context
  if (!ctx) return null
  return buildDesignDiagramAsIsViz(ctx, props.finding?.resource_id)
})

const designVizToBe = computed(() => {
  const ctx = resolved.value.finding?.topology_context
  if (!ctx) return null
  return buildDesignDiagramToBeViz(ctx, props.finding?.resource_id)
})
</script>

<template>
  <div
    v-if="finding"
    class="space-y-3"
    :class="embedded ? '' : 'rounded-xl bg-bg-muted/40 border border-border/80 p-4'"
  >
    <button
      v-if="!embedded"
      type="button"
      class="w-full flex items-center justify-between gap-2 text-left"
      @click="expanded = !expanded"
    >
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        {{ toggleLabel }}
      </span>
      <span class="text-[10px] text-gray-400">{{ expanded ? '접기' : '펼치기' }}</span>
    </button>
    <div v-else class="pb-1">
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{{ toggleLabel }}</span>
    </div>

    <div v-if="embedded || expanded" class="space-y-4">
      <div
        v-if="topo.finopsImpact && topo.finopsImpact !== 'none'"
        class="flex flex-wrap items-center gap-2"
      >
        <span
          v-if="topo.isClientFallback"
          class="px-2 py-0.5 rounded border text-[9px] font-bold bg-amber-500/10 text-amber-700 border-amber-500/25"
        >
          클라이언트 demo (스냅샷 미포함 — FinOps 재실행 권장)
        </span>
        <span
          class="px-2 py-0.5 rounded border text-[9px] font-bold"
          :class="finopsImpactClass(topo.finopsImpact)"
        >
          {{ finopsImpactLabel(topo.finopsImpact) }}
        </span>
        <span
          v-if="topo.recentHours != null"
          class="text-[10px] text-gray-500"
        >
          최근 변경 {{ topo.recentHours }}h 이내
        </span>
        <span
          v-if="topo.rcaLink?.cause_type"
          class="text-[10px] text-amber-700"
        >
          RCA · {{ topo.rcaLink.cause_type }}
        </span>
      </div>

      <!-- 운영 리소스: as-is / to-be -->
      <div v-if="resourceVizAsIs" class="space-y-2">
        <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          운영 리소스 · what-if
        </h4>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <FinOpsTopologyGraphViz
            :model="resourceVizAsIs"
            title="현재 (as-is)"
            mode="as-is"
            :height="260"
          />
          <FinOpsTopologyGraphViz
            v-if="resourceVizToBe"
            :model="resourceVizToBe"
            title="제안 후 (to-be)"
            mode="to-be"
            :height="260"
          />
          <div
            v-else
            class="rounded-lg border border-dashed border-border bg-bg-muted/30 flex items-center justify-center min-h-[200px] text-[10px] text-gray-400"
          >
            제안 시뮬레이션 없음
          </div>
        </div>
      </div>

      <!-- 설계 다이어그램: as-is / to-be -->
      <div v-if="designVizAsIs" class="space-y-2">
        <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          설계 다이어그램 · what-if
          <span v-if="topo.designDiagram.display_name" class="text-gray-300 font-normal normal-case ml-1">
            {{ topo.designDiagram.display_name }}
          </span>
        </h4>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <FinOpsTopologyGraphViz
            :model="designVizAsIs"
            title="현재 (as-is)"
            mode="as-is"
            :height="300"
          />
          <FinOpsTopologyGraphViz
            v-if="designVizToBe"
            :model="designVizToBe"
            title="제안 후 (to-be)"
            mode="to-be"
            :height="300"
          />
          <div
            v-else
            class="rounded-lg border border-dashed border-border bg-bg-muted/30 flex items-center justify-center min-h-[240px] text-[10px] text-gray-400"
          >
            설계 what-if 없음
          </div>
        </div>
      </div>

      <!-- what-if 요약 -->
      <div v-if="impact" class="rounded-lg border border-brand/20 bg-brand/5 p-3 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-[10px] font-bold text-brand uppercase tracking-wider">
            제안 반영 시 토폴로지 (what-if)
          </h4>
          <span
            class="px-2 py-0.5 rounded border text-[9px] font-bold"
            :class="impactLevelClass(impact.impact_level)"
          >
            영향 {{ impactLevelLabel(impact.impact_level) }}
          </span>
        </div>
        <p class="text-xs text-text-primary leading-snug">{{ impact.summary }}</p>
        <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div class="rounded border border-border bg-bg-card px-2 py-1.5">
            <span class="text-gray-400 block mb-0.5">현재 (as-is)</span>
            노드 {{ impact.as_is.node_count }} · 엣지 {{ impact.as_is.edge_count }}
          </div>
          <div class="rounded border border-border bg-bg-card px-2 py-1.5">
            <span class="text-gray-400 block mb-0.5">제안 후 (to-be)</span>
            노드 {{ impact.to_be.node_count }} · 엣지 {{ impact.to_be.edge_count }}
          </div>
        </div>
      </div>

      <div
        v-if="topo.designProposalImpact"
        class="rounded-lg border border-border bg-bg-card p-3 space-y-2"
      >
        <div class="flex flex-wrap items-center gap-2">
          <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            설계 what-if 요약
          </h4>
          <span
            class="px-2 py-0.5 rounded border text-[9px] font-bold"
            :class="impactLevelClass(topo.designProposalImpact.impact_level)"
          >
            {{ impactLevelLabel(topo.designProposalImpact.impact_level) }}
          </span>
        </div>
        <p class="text-xs text-text-primary">{{ topo.designProposalImpact.summary }}</p>
      </div>

      <div v-if="topo.changeEvents.length">
        <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          최근 변경 이벤트
        </h4>
        <ul class="space-y-2">
          <li
            v-for="(ev, idx) in topo.changeEvents"
            :key="`${ev.occurred_at}-${idx}`"
            class="rounded-lg border border-border bg-bg-card px-3 py-2"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-[10px] font-bold text-brand uppercase">
                {{ changeTypeLabel(ev.change_type) }}
              </span>
              <span class="text-[10px] text-gray-400 font-mono tabular-nums">
                {{ formatTopologyTimestamp(ev.occurred_at) }}
              </span>
            </div>
            <p class="text-xs text-text-primary mt-1 leading-snug">{{ ev.summary }}</p>
          </li>
        </ul>
      </div>

      <div
        v-if="(topo.upstream?.length ?? 0) + (topo.downstream?.length ?? 0) > 0"
        class="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <div v-if="topo.upstream?.length">
          <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            서비스 Upstream
          </h4>
          <ul class="space-y-1.5">
            <li
              v-for="dep in topo.upstream"
              :key="`up-${dep.service_id}`"
              class="text-xs px-2 py-1.5 rounded border border-border bg-bg-card"
            >
              {{ dep.service_id }}
            </li>
          </ul>
        </div>
        <div v-if="topo.downstream?.length">
          <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            서비스 Downstream
          </h4>
          <ul class="space-y-1.5">
            <li
              v-for="dep in topo.downstream"
              :key="`down-${dep.service_id}`"
              class="text-xs px-2 py-1.5 rounded border border-border bg-bg-card"
            >
              {{ dep.service_id }}
            </li>
          </ul>
        </div>
      </div>

      <p v-if="!topo.hasCore" class="text-xs text-gray-400">
        토폴로지 맥락이 없습니다. FinOps run을 재실행하거나 제안 리소스를 선택해 주세요.
      </p>
    </div>
  </div>
</template>
