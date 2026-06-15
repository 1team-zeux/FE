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
} from '../utils/topologyMetrics'

const props = defineProps<{
  finding: FinOpsFinding | null
}>()

const topo = computed(() => resolveTopologyCore(props.finding))
const expanded = ref(false)
const graphExpanded = ref(true)

watch(
  () => props.finding?.resource_id,
  () => {
    expanded.value = topo.value.hasCore
    graphExpanded.value = Boolean(topo.value.proposalImpact)
  },
  { immediate: true },
)

const toggleLabel = computed(() => {
  if (!topo.value.hasCore) return '토폴로지·변경 맥락 — 데이터 없음'
  const parts: string[] = []
  if (topo.value.proposalImpact) parts.push('제안 diff')
  if ((topo.value.resourceGraph.nodes?.length ?? 0) > 0) {
    parts.push(`리소스 ${topo.value.resourceGraph.node_count ?? topo.value.resourceGraph.nodes?.length}`)
  }
  if (topo.value.changeEvents.length) parts.push(`변경 ${topo.value.changeEvents.length}`)
  const depCount = (topo.value.upstream?.length ?? 0) + (topo.value.downstream?.length ?? 0)
  if (depCount) parts.push(`서비스 의존 ${depCount}`)
  return `토폴로지·변경 맥락 · ${parts.join(' · ')}`
})

const impact = computed(() => topo.value.proposalImpact)
</script>

<template>
  <div v-if="finding" class="rounded-xl bg-bg-muted/40 border border-border/80 p-4 space-y-3">
    <button
      type="button"
      class="w-full flex items-center justify-between gap-2 text-left"
      @click="expanded = !expanded"
    >
      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        {{ toggleLabel }}
      </span>
      <span class="text-[10px] text-gray-400">{{ expanded ? '접기' : '펼치기' }}</span>
    </button>

    <div v-if="expanded" class="space-y-4">
      <div
        v-if="topo.finopsImpact && topo.finopsImpact !== 'none'"
        class="flex flex-wrap items-center gap-2"
      >
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

      <!-- Phase 2: as-is vs proposal diff -->
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

        <div v-if="impact.removed_nodes?.length" class="space-y-1">
          <p class="text-[10px] font-bold text-red-600 uppercase">제거·중지</p>
          <ul class="space-y-1">
            <li
              v-for="n in impact.removed_nodes"
              :key="n.id"
              class="text-xs font-mono px-2 py-1 rounded bg-red-500/5 border border-red-500/20"
            >
              {{ n.id }}
              <span v-if="n.resource_type" class="text-gray-400"> · {{ n.resource_type }}</span>
            </li>
          </ul>
        </div>

        <div v-if="impact.modified_nodes?.length" class="space-y-1">
          <p class="text-[10px] font-bold text-amber-700 uppercase">용량 변경</p>
          <ul class="space-y-1">
            <li
              v-for="n in impact.modified_nodes"
              :key="`mod-${n.id}`"
              class="text-xs font-mono px-2 py-1 rounded bg-amber-500/5 border border-amber-500/20"
            >
              {{ n.id }} → {{ n.change }}
            </li>
          </ul>
        </div>

        <div v-if="impact.broken_edges?.length" class="space-y-1">
          <p class="text-[10px] font-bold text-gray-500 uppercase">끊기는 연결</p>
          <ul class="space-y-1">
            <li
              v-for="(e, i) in impact.broken_edges"
              :key="`edge-${i}`"
              class="text-xs font-mono px-2 py-1 rounded border border-border bg-bg-card"
            >
              {{ e.from }} → {{ e.to }}
              <span v-if="e.dependency_type" class="text-gray-400"> · {{ e.dependency_type }}</span>
            </li>
          </ul>
        </div>

        <div v-if="impact.affected_peers?.length" class="space-y-1">
          <p class="text-[10px] font-bold text-gray-500 uppercase">영향 받는 연결 리소스</p>
          <ul class="space-y-1">
            <li
              v-for="p in impact.affected_peers"
              :key="p.resource_id"
              class="text-xs px-2 py-1 rounded border border-border bg-bg-card"
            >
              <span class="font-mono">{{ p.resource_id }}</span>
              <span v-if="p.resource_type" class="text-gray-400"> · {{ p.resource_type }}</span>
            </li>
          </ul>
        </div>

        <p v-if="impact.graph_source" class="text-[9px] text-gray-400">
          그래프 출처: {{ impact.graph_source }} · resource_dependencies
        </p>
      </div>

      <!-- as-is resource graph (compact) -->
      <div v-if="(topo.resourceGraph.nodes?.length ?? 0) > 0">
        <button
          type="button"
          class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2"
          @click="graphExpanded = !graphExpanded"
        >
          현재 리소스 그래프 (as-is)
          <span class="text-gray-300 font-normal normal-case">{{ graphExpanded ? '접기' : '펼치기' }}</span>
        </button>
        <div v-if="graphExpanded" class="space-y-2">
          <ul class="flex flex-wrap gap-1.5">
            <li
              v-for="n in topo.resourceGraph.nodes"
              :key="n.id"
              class="text-[10px] font-mono px-2 py-1 rounded border border-border bg-bg-card"
              :class="n.id === finding?.resource_id ? 'border-brand text-brand' : ''"
            >
              {{ n.id }}
            </li>
          </ul>
          <ul v-if="topo.resourceGraph.edges?.length" class="space-y-1">
            <li
              v-for="(e, i) in topo.resourceGraph.edges"
              :key="`g-${i}`"
              class="text-[10px] font-mono text-gray-500 px-2"
            >
              {{ e.from }} → {{ e.to }}
              <span v-if="e.dependency_type" class="text-gray-300">({{ e.dependency_type }})</span>
            </li>
          </ul>
        </div>
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
        resource_dependencies·action_histories·service_dependencies에서 수집된 맥락이 없습니다.
      </p>
    </div>
  </div>
</template>
