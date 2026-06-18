<script setup lang="ts">
import { computed, ref, useId, watch, nextTick } from 'vue'
import { NODE_ICONS } from '@/features/iac/utils/awsIcons'
import {
  groupStroke,
  nodeStateFill,
  nodeStateStroke,
  VIZ_ICON_SIZE,
  VIZ_ICON_X,
  VIZ_ICON_Y,
  VIZ_NODE_H,
  VIZ_NODE_W,
  type TopologyVizModel,
} from '../utils/topologyGraphLayout'

const props = withDefaults(
  defineProps<{
    model: TopologyVizModel | null
    title?: string
    height?: number
    mode?: 'as-is' | 'to-be' | 'diff'
  }>(),
  { mode: 'as-is' },
)

const uid = useId().replace(/:/g, '')
const svgEl = ref<SVGSVGElement | null>(null)
const scale = ref(1)
const pan = ref({ x: 0, y: 0 })
const panning = ref(false)
const panAnchor = ref({ px: 0, py: 0, ox: 0, oy: 0 })

const displayH = computed(() => props.height ?? 360)

const viewW = computed(() => Math.max(1, props.model?.width ?? 400))
const viewH = computed(() => Math.max(1, props.model?.height ?? 220))

const nodeMap = computed(() => new Map((props.model?.nodes ?? []).map((n) => [n.id, n])))

const contentCenter = computed(() => {
  const m = props.model
  if (!m?.nodes.length) {
    return { x: viewW.value / 2, y: viewH.value / 2 }
  }
  const xs = m.nodes.map((n) => n.x)
  const ys = m.nodes.map((n) => n.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
})

const contentTransform = computed(() => {
  const c = contentCenter.value
  return `translate(${pan.value.x + viewW.value / 2}, ${pan.value.y + viewH.value / 2}) scale(${scale.value}) translate(${-c.x}, ${-c.y})`
})

function fitToView() {
  scale.value = 1
  pan.value = { x: 0, y: 0 }
}

watch(
  () => props.model,
  async () => {
    await nextTick()
    fitToView()
  },
  { immediate: true },
)

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

function edgeMidpoint(from: string, to: string): { x: number; y: number } | null {
  const f = nodeMap.value.get(from)
  const t = nodeMap.value.get(to)
  if (!f || !t) return null
  return { x: (f.x + t.x) / 2, y: (f.y + t.y) / 2 - 6 }
}

function nodeAnimDelay(idx: number): string {
  return `${Math.min(idx * 45, 600)}ms`
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const factor = e.deltaY < 0 ? 1.12 : 0.89
  scale.value = Math.min(2.5, Math.max(0.35, scale.value * factor))
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  panning.value = true
  panAnchor.value = { px: e.clientX, py: e.clientY, ox: pan.value.x, oy: pan.value.y }
  ;(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!panning.value) return
  pan.value = {
    x: panAnchor.value.ox + (e.clientX - panAnchor.value.px),
    y: panAnchor.value.oy + (e.clientY - panAnchor.value.py),
  }
}

function onPointerUp(e: PointerEvent) {
  panning.value = false
  try {
    ;(e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function zoomIn() {
  scale.value = Math.min(2.5, scale.value * 1.15)
}

function zoomOut() {
  scale.value = Math.max(0.35, scale.value / 1.15)
}

function resetView() {
  fitToView()
}
</script>

<template>
  <div v-if="model?.nodes.length" class="bg-bg-card border border-border rounded-lg overflow-hidden">
    <div class="bg-bg-muted/60 border-b border-border px-3 py-2 flex flex-wrap items-center justify-between gap-2">
      <span class="text-[10px] font-bold text-text-primary uppercase tracking-wider">{{ title }}</span>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex flex-wrap gap-2 text-[9px] text-gray-400 mr-1">
          <template v-if="mode === 'diff'">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded border-2 border-brand" />대상</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-amber-500/30 border border-amber-500/50" />변경·영향</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-red-500/20 border border-red-500/40" />제거</span>
            <span class="flex items-center gap-1"><span class="w-3 border-t border-dashed border-red-400" />단절</span>
          </template>
          <template v-else-if="mode === 'as-is'">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded border-2 border-brand" />대상</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-amber-500/30 border border-amber-500/50" />영향</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-red-500/20 border border-red-500/40" />제거 예정</span>
          </template>
          <template v-else>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-amber-500/30 border border-amber-500/50" />용량 변경</span>
          </template>
        </div>
        <div class="flex items-center gap-0.5 border border-border rounded-md overflow-hidden">
          <button type="button" class="px-2 py-0.5 text-[10px] text-gray-500 hover:bg-bg-muted" @click="zoomOut">−</button>
          <button type="button" class="px-2 py-0.5 text-[10px] text-gray-500 hover:bg-bg-muted border-x border-border" @click="resetView">100%</button>
          <button type="button" class="px-2 py-0.5 text-[10px] text-gray-500 hover:bg-bg-muted" @click="zoomIn">+</button>
        </div>
      </div>
    </div>
    <div class="relative overflow-hidden bg-[var(--color-bg-card)]" :style="{ height: `${displayH}px` }">
      <p class="absolute bottom-2 right-2 z-10 text-[9px] text-gray-400 pointer-events-none select-none">
        드래그 · 휠 줌
      </p>
      <svg
        ref="svgEl"
        :viewBox="`0 0 ${viewW} ${viewH}`"
        width="100%"
        :height="displayH"
        preserveAspectRatio="xMidYMid meet"
        class="block touch-none"
        :class="panning ? 'cursor-grabbing' : 'cursor-grab'"
        @wheel.prevent="onWheel"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
      >
        <defs>
          <marker :id="`finops-arr-${uid}`" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#9CA3AF" />
          </marker>
          <marker :id="`finops-arr-broken-${uid}`" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#EF4444" />
          </marker>
        </defs>

        <g :transform="contentTransform">
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
              :marker-end="edge.broken ? `url(#finops-arr-broken-${uid})` : `url(#finops-arr-${uid})`"
              :class="edge.broken ? 'finops-edge-broken' : 'finops-edge-live'"
            />
            <text
              v-if="edge.label && edgeMidpoint(edge.from, edge.to)"
              :x="edgeMidpoint(edge.from, edge.to)!.x"
              :y="edgeMidpoint(edge.from, edge.to)!.y"
              text-anchor="middle"
              font-size="8"
              fill="#9CA3AF"
              font-family="ui-monospace, monospace"
              class="pointer-events-none select-none"
            >
              {{ edge.label }}
            </text>
          </g>

          <g
            v-for="(node, idx) in model.nodes"
            :key="node.id"
            :transform="`translate(${node.x - VIZ_NODE_W / 2}, ${node.y - VIZ_NODE_H / 2})`"
          >
            <g
              class="pointer-events-none finops-node-enter"
              :style="{ animationDelay: nodeAnimDelay(idx) }"
            >
              <rect
                v-if="node.state === 'target'"
                :width="VIZ_NODE_W + 8"
                :height="VIZ_NODE_H + 8"
                x="-4"
                y="-4"
                rx="10"
                fill="none"
                stroke="var(--color-brand, #2980B9)"
                stroke-width="2"
                class="finops-target-pulse"
              />
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
                :x="VIZ_ICON_X"
                :y="VIZ_ICON_Y"
                :width="VIZ_ICON_SIZE"
                :height="VIZ_ICON_SIZE"
                :opacity="node.state === 'removed' ? 0.4 : 1"
              />
              <text
                v-else
                :x="VIZ_NODE_W / 2"
                :y="VIZ_ICON_Y + VIZ_ICON_SIZE / 2 + 4"
                text-anchor="middle"
                font-size="10"
                fill="#6B7280"
              >
                {{ node.iconType }}
              </text>
              <text
                :x="VIZ_NODE_W / 2"
                :y="VIZ_NODE_H - 6"
                text-anchor="middle"
                font-size="9"
                fill="var(--color-text-primary, #111)"
                font-family="ui-monospace, monospace"
              >
                {{ node.label.length > 12 ? `${node.label.slice(0, 10)}…` : node.label }}
              </text>
            </g>
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
@keyframes finops-node-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes finops-pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.75;
  }
}

@keyframes finops-dash {
  to {
    stroke-dashoffset: -18;
  }
}

.finops-node-enter {
  animation: finops-node-in 0.4s ease-out both;
}

.finops-target-pulse {
  animation: finops-pulse 2s ease-in-out infinite;
}

.finops-edge-broken {
  animation: finops-dash 1.2s linear infinite;
}
</style>
