<script setup lang="ts">
import { computed } from 'vue'
import { NODE_ICONS } from '@/features/iac/utils/awsIcons'
import {
  groupStroke,
  nodeStateFill,
  nodeStateStroke,
  VIZ_NODE_H,
  VIZ_NODE_W,
  type TopologyVizModel,
} from '../utils/topologyGraphLayout'

const props = defineProps<{
  model: TopologyVizModel | null
  title?: string
  height?: number
}>()

const H = computed(() => props.height ?? Math.max(220, props.model?.height ?? 220))
const W = computed(() => props.model?.width ?? 480)

const nodeMap = computed(() => new Map((props.model?.nodes ?? []).map((n) => [n.id, n])))

function edgePath(from: string, to: string): string {
  const f = nodeMap.value.get(from)
  const t = nodeMap.value.get(to)
  if (!f || !t) return ''
  const hw = VIZ_NODE_W / 2
  const goRight = t.x >= f.x
  const sx = goRight ? f.x + hw : f.x - hw
  const ex = goRight ? t.x - hw : t.x + hw
  const midX = (sx + ex) / 2
  return `M${sx},${f.y} H${midX} V${t.y} H${ex}`
}
</script>

<template>
  <div v-if="model?.nodes.length" class="bg-bg-card border border-border rounded-lg overflow-hidden">
    <div class="bg-bg-muted/60 border-b border-border px-3 py-2 flex flex-wrap items-center justify-between gap-2">
      <span class="text-[10px] font-bold text-text-primary uppercase tracking-wider">{{ title }}</span>
      <div class="flex flex-wrap gap-2 text-[9px] text-gray-400">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded border-2 border-brand" />대상</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-amber-500/30 border border-amber-500/50" />영향</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-red-500/20 border border-red-500/40" />제거</span>
      </div>
    </div>
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      width="100%"
      :height="H"
      class="block bg-[var(--color-bg-card)]"
    >
      <defs>
        <marker id="finops-arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#9CA3AF" />
        </marker>
        <marker id="finops-arr-broken" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#EF4444" />
        </marker>
      </defs>

      <g v-for="g in model.groups" :key="g.id">
        <rect
          :x="g.x"
          :y="g.y"
          :width="g.width"
          :height="g.height"
          rx="8"
          fill="transparent"
          :stroke="groupStroke(g.type)"
          stroke-width="1.5"
          stroke-dasharray="6 3"
        />
        <text
          :x="g.x + 8"
          :y="g.y + 16"
          font-size="10"
          font-weight="700"
          :fill="groupStroke(g.type)"
          font-family="ui-monospace, monospace"
        >
          {{ g.label }}
        </text>
      </g>

      <g v-for="edge in model.edges" :key="edge.id">
        <path
          v-if="edgePath(edge.from, edge.to)"
          :d="edgePath(edge.from, edge.to)"
          fill="none"
          :stroke="edge.broken ? '#EF4444' : '#9CA3AF'"
          stroke-width="1.5"
          :stroke-dasharray="edge.broken ? '5 4' : 'none'"
          :marker-end="edge.broken ? 'url(#finops-arr-broken)' : 'url(#finops-arr)'"
        />
      </g>

      <g
        v-for="node in model.nodes"
        :key="node.id"
        :transform="`translate(${node.x - VIZ_NODE_W / 2}, ${node.y - VIZ_NODE_H / 2})`"
      >
        <rect
          :width="VIZ_NODE_W"
          :height="VIZ_NODE_H"
          rx="8"
          :fill="nodeStateFill(node.state)"
          :stroke="nodeStateStroke(node.state)"
          stroke-width="2"
          :opacity="node.state === 'removed' ? 0.55 : 1"
        />
        <image
          v-if="NODE_ICONS[node.iconType]"
          :href="NODE_ICONS[node.iconType]"
          x="22"
          y="8"
          width="44"
          height="44"
          :opacity="node.state === 'removed' ? 0.4 : 1"
        />
        <text
          v-else
          x="44"
          y="36"
          text-anchor="middle"
          font-size="10"
          fill="#6B7280"
        >
          {{ node.iconType }}
        </text>
        <text
          x="44"
          y="68"
          text-anchor="middle"
          font-size="9"
          fill="var(--color-text-primary, #111)"
          font-family="ui-monospace, monospace"
        >
          {{ node.label.length > 14 ? `${node.label.slice(0, 12)}…` : node.label }}
        </text>
      </g>
    </svg>
  </div>
</template>
