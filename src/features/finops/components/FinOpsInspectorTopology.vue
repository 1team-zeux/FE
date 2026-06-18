<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FinOpsFinding } from '../types/finops.schema'
import {
  TOPOLOGY_LAYER_LABELS,
  TOPOLOGY_VIEW_HINTS,
  TOPOLOGY_VIEW_LABELS,
  type TopologyLayer,
  type TopologyView,
} from '../utils/findingInspector'
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
  buildDesignDiagramDiffViz,
  buildDesignDiagramToBeViz,
  buildResourceGraphAsIsViz,
  buildResourceGraphDiffViz,
  buildResourceGraphToBeViz,
} from '../utils/topologyGraphLayout'
import FinOpsTopologyGraphViz from './FinOpsTopologyGraphViz.vue'

const props = defineProps<{
  finding: FinOpsFinding | null
}>()

const layer = defineModel<TopologyLayer>('layer', { default: 'resource' })
const view = defineModel<TopologyView>('view', { default: 'diff' })

const showDetails = ref(true)

const resolved = computed(() => resolveTopologyFinding(props.finding))
const topo = computed(() => resolveTopologyCore(resolved.value.finding))
const ctx = computed(() => resolved.value.finding?.topology_context)
const targetId = computed(() => resolved.value.finding?.resource_id ?? props.finding?.resource_id)

const hasResource = computed(() => Boolean(ctx.value?.resource_graph?.nodes?.length))
const hasDesign = computed(() => Boolean(ctx.value?.design_diagram?.nodes?.length))

const topologyStats = computed(() => {
  const rg = ctx.value?.resource_graph
  const dd = ctx.value?.design_diagram
  const impact = ctx.value?.proposal_impact
  const serviceIds = new Set<string>()
  for (const ev of topo.value.changeEvents) {
    if (ev.service_id) serviceIds.add(ev.service_id)
  }
  for (const dep of [...(topo.value.upstream ?? []), ...(topo.value.downstream ?? [])]) {
    serviceIds.add(dep.service_id)
  }
  return {
    resourceNodes: rg?.nodes?.length ?? 0,
    resourceEdges: rg?.edges?.length ?? 0,
    designNodes: dd?.nodes?.length ?? 0,
    designGroups: dd?.groups?.length ?? 0,
    changeEvents: topo.value.changeEvents.length,
    services: serviceIds.size,
    upstream: topo.value.upstream?.length ?? 0,
    downstream: topo.value.downstream?.length ?? 0,
    asIsNodes: impact?.as_is.node_count,
    toBeNodes: impact?.to_be.node_count,
    asIsEdges: impact?.as_is.edge_count,
    toBeEdges: impact?.to_be.edge_count,
  }
})

const resourceModels = computed(() => {
  const c = ctx.value
  if (!c) return { asIs: null, toBe: null, diff: null }
  return {
    asIs: buildResourceGraphAsIsViz(c, targetId.value),
    toBe: buildResourceGraphToBeViz(c, targetId.value),
    diff: buildResourceGraphDiffViz(c, targetId.value),
  }
})

const designModels = computed(() => {
  const c = ctx.value
  if (!c) return { asIs: null, toBe: null, diff: null }
  return {
    asIs: buildDesignDiagramAsIsViz(c, targetId.value),
    toBe: buildDesignDiagramToBeViz(c, targetId.value),
    diff: buildDesignDiagramDiffViz(c, targetId.value),
  }
})

const activeModel = computed(() => {
  const pool = layer.value === 'resource' ? resourceModels.value : designModels.value
  return pool[view.value === 'as-is' ? 'asIs' : view.value === 'to-be' ? 'toBe' : 'diff']
})

const graphTitle = computed(() => {
  if (view.value === 'as-is') return '현재 상태'
  if (view.value === 'to-be') return '적용 후'
  return '변경 비교'
})

const graphMode = computed(() => view.value)

const graphHeight = computed(() => (layer.value === 'design' ? 400 : 360))

const impact = computed(() => topo.value.proposalImpact)

const affectedPeerCount = computed(() => {
  const peers = impact.value?.affected_peers ?? []
  return new Set(peers.map((p) => p.resource_id)).size
})

function selectLayer(next: TopologyLayer) {
  if (next === 'design' && !hasDesign.value) return
  layer.value = next
  if (next === 'design' && view.value === 'diff' && !designModels.value.diff) {
    view.value = designModels.value.asIs ? 'as-is' : 'to-be'
  }
}

function selectView(next: TopologyView) {
  const pool = layer.value === 'resource' ? resourceModels.value : designModels.value
  const key = next === 'as-is' ? 'asIs' : next === 'to-be' ? 'toBe' : 'diff'
  if (!pool[key] && next !== 'diff') return
  if (next === 'to-be' && !pool.toBe) return
  view.value = next
}
</script>

<template>
  <div v-if="finding" class="space-y-4">
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
      <span v-if="topo.recentHours != null" class="text-[10px] text-gray-500">
        최근 변경 {{ topo.recentHours }}h 이내
      </span>
      <span v-if="topo.rcaLink?.cause_type" class="text-[10px] text-amber-700">
        RCA · {{ topo.rcaLink.cause_type }}
      </span>
    </div>

    <!-- 레이어 선택 -->
    <div class="flex gap-1.5">
      <button
        v-for="(label, key) in TOPOLOGY_LAYER_LABELS"
        :key="key"
        type="button"
        class="px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors"
        :class="
          layer === key
            ? 'bg-brand text-white border-brand shadow-sm'
            : key === 'design' && !hasDesign
              ? 'bg-bg-muted text-gray-300 border-border cursor-not-allowed'
              : 'bg-bg-card text-gray-500 border-border hover:border-brand/50 hover:text-text-primary'
        "
        :disabled="key === 'design' && !hasDesign"
        @click="selectLayer(key)"
      >
        {{ label }}
      </button>
    </div>

    <!-- 토폴로지 요약 스탯 -->
    <div
      v-if="topo.hasCore"
      class="grid grid-cols-2 sm:grid-cols-4 gap-2"
    >
      <div class="rounded-lg border border-border bg-bg-card px-2.5 py-2">
        <p class="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">리소스</p>
        <p class="text-sm font-bold font-mono tabular-nums text-text-primary">
          {{ topologyStats.resourceNodes }}
          <span class="text-[10px] font-normal text-gray-400">노드</span>
        </p>
        <p class="text-[10px] text-gray-500 font-mono">{{ topologyStats.resourceEdges }} 연결</p>
      </div>
      <div class="rounded-lg border border-border bg-bg-card px-2.5 py-2">
        <p class="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">설계 뷰</p>
        <p class="text-sm font-bold font-mono tabular-nums text-text-primary">
          {{ topologyStats.designNodes }}
          <span class="text-[10px] font-normal text-gray-400">컴포넌트</span>
        </p>
        <p class="text-[10px] text-gray-500 font-mono">{{ topologyStats.designGroups }} 서브넷 그룹</p>
      </div>
      <div class="rounded-lg border border-border bg-bg-card px-2.5 py-2">
        <p class="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">서비스</p>
        <p class="text-sm font-bold font-mono tabular-nums text-text-primary">
          {{ topologyStats.services }}
          <span class="text-[10px] font-normal text-gray-400">개</span>
        </p>
        <p class="text-[10px] text-gray-500 font-mono">
          ↑{{ topologyStats.upstream }} · ↓{{ topologyStats.downstream }}
        </p>
      </div>
      <div class="rounded-lg border border-border bg-bg-card px-2.5 py-2">
        <p class="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">변경 이벤트</p>
        <p class="text-sm font-bold font-mono tabular-nums text-text-primary">
          {{ topologyStats.changeEvents }}
          <span class="text-[10px] font-normal text-gray-400">건</span>
        </p>
        <p v-if="topo.recentHours != null" class="text-[10px] text-gray-500">
          최근 {{ topo.recentHours }}h
        </p>
      </div>
    </div>

    <!-- 뷰 선택 — 세그먼트 컨트롤 -->
    <div class="flex rounded-xl border border-border bg-bg-muted p-1 gap-1">
      <button
        v-for="(label, key) in TOPOLOGY_VIEW_LABELS"
        :key="key"
        type="button"
        class="flex-1 flex flex-col items-center px-2 py-1.5 rounded-lg transition-all text-center"
        :class="
          view === key
            ? 'bg-bg-card text-text-primary shadow-sm'
            : (key === 'to-be' && !(layer === 'resource' ? resourceModels.toBe : designModels.toBe))
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-400 hover:text-text-primary hover:bg-bg-card/50'
        "
        :disabled="key === 'to-be' && !(layer === 'resource' ? resourceModels.toBe : designModels.toBe)"
        @click="selectView(key)"
      >
        <span class="text-[11px] font-bold leading-tight">{{ label }}</span>
        <span class="text-[9px] leading-tight mt-0.5 opacity-70">{{ TOPOLOGY_VIEW_HINTS[key] }}</span>
      </button>
    </div>

    <FinOpsTopologyGraphViz
      v-if="activeModel"
      :model="activeModel"
      :title="graphTitle"
      :mode="graphMode"
      :height="graphHeight"
    />
    <div
      v-else
      class="rounded-lg border border-dashed border-border bg-bg-muted/30 flex items-center justify-center min-h-[220px] text-[11px] text-gray-400 px-4 text-center"
    >
      <template v-if="layer === 'resource' && !hasResource">
        운영 리소스 그래프가 없습니다. FinOps run을 재실행해 주세요.
      </template>
      <template v-else-if="layer === 'design' && !hasDesign">
        설계 다이어그램이 없습니다.
      </template>
      <template v-else>
        「{{ TOPOLOGY_VIEW_LABELS[view] }}」 데이터가 없습니다.
      </template>
    </div>

    <div v-if="impact && layer === 'resource'" class="rounded-lg border border-brand/20 bg-brand/5 p-3 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4 class="text-[10px] font-bold text-brand uppercase tracking-wider">적용 시 예상 변화</h4>
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
          <span class="text-gray-400 block mb-0.5">적용 후 (to-be)</span>
          노드 {{ impact.to_be.node_count }}
          <span
            v-if="impact.to_be.node_count < impact.as_is.node_count"
            class="text-red-600"
          >
            (−{{ impact.as_is.node_count - impact.to_be.node_count }})
          </span>
          · 엣지 {{ impact.to_be.edge_count }}
          <span
            v-if="impact.to_be.edge_count < impact.as_is.edge_count"
            class="text-red-600"
          >
            (−{{ impact.as_is.edge_count - impact.to_be.edge_count }})
          </span>
        </div>
      </div>
      <div
        v-if="impact.broken_edges?.length || impact.affected_peers?.length"
        class="flex flex-wrap gap-1.5 pt-1"
      >
        <span
          v-if="impact.broken_edges?.length"
          class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-700 border border-red-500/20"
        >
          단절 연결 {{ impact.broken_edges.length }}건
        </span>
        <span
          v-if="impact.affected_peers?.length"
          class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20"
        >
          영향 리소스 {{ affectedPeerCount }}개
        </span>
      </div>
    </div>

    <div
      v-if="topo.designProposalImpact && layer === 'design'"
      class="rounded-lg border border-border bg-bg-card p-3 space-y-2"
    >
      <div class="flex flex-wrap items-center gap-2">
        <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">설계 what-if</h4>
        <span
          class="px-2 py-0.5 rounded border text-[9px] font-bold"
          :class="impactLevelClass(topo.designProposalImpact.impact_level)"
        >
          {{ impactLevelLabel(topo.designProposalImpact.impact_level) }}
        </span>
      </div>
      <p class="text-xs text-text-primary">{{ topo.designProposalImpact.summary }}</p>
    </div>

    <button
      v-if="topo.changeEvents.length || (topo.upstream?.length ?? 0) + (topo.downstream?.length ?? 0) > 0"
      type="button"
      class="w-full text-left text-[11px] font-bold text-gray-500 py-2 border-t border-border"
      @click="showDetails = !showDetails"
    >
      변경 이벤트 · 서비스 의존 {{ showDetails ? '접기' : '펼치기' }}
    </button>

    <template v-if="showDetails">
      <div v-if="topo.changeEvents.length">
        <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          최근 변경 이벤트
        </h4>
        <ul class="space-y-2">
          <li
            v-for="(ev, idx) in topo.changeEvents.slice(0, 5)"
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
            <p v-if="ev.resource_id" class="text-[10px] text-gray-400 font-mono mt-1">
              {{ ev.resource_id }}
              <span v-if="ev.service_id" class="text-gray-300"> · {{ ev.service_id }}</span>
            </p>
          </li>
        </ul>
      </div>

      <div
        v-if="(topo.upstream?.length ?? 0) + (topo.downstream?.length ?? 0) > 0"
        class="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <div v-if="topo.upstream?.length">
          <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Upstream</h4>
          <ul class="space-y-1">
            <li
              v-for="dep in topo.upstream"
              :key="`up-${dep.service_id}`"
              class="text-xs px-2 py-1 rounded border border-border bg-bg-card flex items-center justify-between gap-2"
            >
              <span>{{ dep.service_id }}</span>
              <span v-if="dep.dependency_type" class="text-[9px] text-gray-400 font-mono uppercase">
                {{ dep.dependency_type }}
              </span>
            </li>
          </ul>
        </div>
        <div v-if="topo.downstream?.length">
          <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Downstream</h4>
          <ul class="space-y-1">
            <li
              v-for="dep in topo.downstream"
              :key="`down-${dep.service_id}`"
              class="text-xs px-2 py-1 rounded border border-border bg-bg-card flex items-center justify-between gap-2"
            >
              <span>{{ dep.service_id }}</span>
              <span v-if="dep.dependency_type" class="text-[9px] text-gray-400 font-mono uppercase">
                {{ dep.dependency_type }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <p v-if="!topo.hasCore" class="text-xs text-gray-400">
      토폴로지 맥락이 없습니다. FinOps run을 재실행해 주세요.
    </p>
  </div>
</template>
