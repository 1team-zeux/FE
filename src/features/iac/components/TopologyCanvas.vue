<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { TopologyNode, TopologyEdge, TopologyGroup } from '../types/topology.schema'
import { gridLayout, computeGroupBoxes } from '../utils/elkLayout'
import { NODE_ICONS as ICONS } from '../utils/awsIcons'
const GROUP_STYLES: Record<string, { stroke: string; fill: string }> = {
  'vpc':            { stroke: '#F59E0B', fill: 'rgba(245,158,11,0.04)' },
  'public-subnet':  { stroke: '#3B82F6', fill: 'rgba(59,130,246,0.04)' },
  'private-subnet': { stroke: '#8B5CF6', fill: 'rgba(139,92,246,0.04)' },
  'db-subnet':      { stroke: '#10B981', fill: 'rgba(16,185,129,0.04)' },
  'asg':            { stroke: '#F97316', fill: 'rgba(249,115,22,0.04)' },
}

const NW = 72, NH = 72
const VB_W = 3000, VB_H = 2000

const props = defineProps<{
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  groups: TopologyGroup[]
  zoom?: number
}>()

const emit = defineEmits<{
  'update:nodes': [TopologyNode[]]
  'update:edges': [TopologyEdge[]]
  'nodeSelect':   [string | null]
  'nodeHover':    [string | null]
}>()

// ── Local state ──────────────────────────────────────────────────────────────

type PositionedGroup = TopologyGroup & { x: number; y: number; width: number; height: number }

const localNodes = ref<(TopologyNode & { x: number; y: number })[]>([])
const localEdges = ref<TopologyEdge[]>([...props.edges])
const localGroups = ref<PositionedGroup[]>([])
const nodeMap  = computed(() => new Map(localNodes.value.map(n => [n.nodeId, n])))
const groupMap = computed(() => new Map(localGroups.value.map(g => [g.groupId, g])))
const offsetX = ref(0)
const offsetY = ref(0)

function recomputeOffset() {
  const allX: number[] = []
  const allY: number[] = []
  localNodes.value.forEach(n => { allX.push(n.x); allY.push(n.y) })
  localGroups.value.forEach(g => { allX.push(g.x, g.x + g.width); allY.push(g.y, g.y + g.height) })
  if (!allX.length) return
  const cx = (Math.min(...allX) + Math.max(...allX)) / 2
  const cy = (Math.min(...allY) + Math.max(...allY)) / 2
  offsetX.value = VB_W / 2 - cx
  offsetY.value = VB_H / 2 - cy
}

function runLayout() {
  if (!props.nodes.length) return
  const nodePos = gridLayout(props.nodes, props.groups, props.edges)

  // Preserve positions for nodes that already exist in localNodes (e.g. drag-dropped nodes).
  // Only use gridLayout positions for nodes appearing for the first time.
  const prevPos = new Map(localNodes.value.map(n => [n.nodeId, { x: n.x, y: n.y }]))

  localNodes.value = props.nodes.map(n => {
    const prev = prevPos.get(n.nodeId)
    if (prev !== undefined) return { ...n, x: prev.x, y: prev.y }
    const pos = nodePos.get(n.nodeId)
    return { ...n, x: pos?.x ?? 0, y: pos?.y ?? 0 }
  })

  const groupBoxes = computeGroupBoxes(nodePos, props.nodes, props.groups)
  localGroups.value = props.groups.map(g => {
    const box = groupBoxes.get(g.groupId)
    return { ...g, x: box?.x ?? 0, y: box?.y ?? 0, width: box?.width ?? 100, height: box?.height ?? 100 }
  })

  nextTick(recomputeOffset)
}

watch(
  () => props.nodes.map(n => n.nodeId).join(',') + '|' + props.groups.map(g => g.groupId).join(','),
  () => runLayout(),
  { immediate: true },
)
watch(() => props.edges, (v) => { localEdges.value = [...v] })

// ── Interaction ──────────────────────────────────────────────────────────────

const svgEl = ref<SVGSVGElement | null>(null)
const hovered = ref<string | null>(null)
const selected = ref<string | null>(null)
const drag = ref<{ nodeId: string; ox: number; oy: number } | null>(null)
const hasMoved = ref(false)
const connecting = ref<{ fromId: string } | null>(null)
const connectCursor = ref({ x: 0, y: 0 })

function svgPt(e: PointerEvent | DragEvent) {
  // 라우트 전환 unmount race — svg ref null 일 때 안전 no-op 좌표 반환
  const svg = svgEl.value
  if (!svg) return { x: 0, y: 0 }
  const r = svg.getBoundingClientRect()
  const vb = svg.viewBox.baseVal
  return {
    x: ((e.clientX - r.left) / r.width)  * vb.width  - offsetX.value,
    y: ((e.clientY - r.top)  / r.height) * vb.height - offsetY.value,
  }
}

function onNodeDown(nodeId: string, e: PointerEvent) {
  if (e.button !== 0) return
  e.stopPropagation()
  const pt = svgPt(e)
  const n = localNodes.value.find(n => n.nodeId === nodeId)!
  drag.value = { nodeId, ox: pt.x - n.x, oy: pt.y - n.y }
  hasMoved.value = false
}

function onPortDown(fromId: string, e: PointerEvent) {
  e.stopPropagation()
  connecting.value = { fromId }
  connectCursor.value = svgPt(e)
  ;(e.currentTarget as SVGElement).setPointerCapture(e.pointerId)
}

function onSvgMove(e: PointerEvent) {
  const pt = svgPt(e)
  if (drag.value) {
    hasMoved.value = true
    const n = localNodes.value.find(n => n.nodeId === drag.value!.nodeId)!
    n.x = pt.x - drag.value.ox
    n.y = pt.y - drag.value.oy
  }
  if (connecting.value) connectCursor.value = pt
}

function onSvgUp(e: PointerEvent) {
  if (drag.value) {
    if (!hasMoved.value) {
      const next = drag.value.nodeId === selected.value ? null : drag.value.nodeId
      selected.value = next
      emit('nodeSelect', next)
    }
    emit('update:nodes', localNodes.value)
    drag.value = null
  }
  if (connecting.value) {
    const pt = svgPt(e)
    const target = localNodes.value.find(n =>
      n.nodeId !== connecting.value!.fromId &&
      Math.abs(pt.x - n.x) < NW / 2 + 8 &&
      Math.abs(pt.y - n.y) < NH / 2 + 8,
    )
    if (target) {
      localEdges.value.push({ edgeId: `e-${Date.now()}`, from: connecting.value.fromId, to: target.nodeId, dashed: false })
      emit('update:edges', localEdges.value)
    }
    connecting.value = null
  }
}

function onSvgClick() { selected.value = null; emit('nodeSelect', null) }

function deleteNode(nodeId: string) {
  localNodes.value = localNodes.value.filter(n => n.nodeId !== nodeId)
  localEdges.value = localEdges.value.filter(e => e.from !== nodeId && e.to !== nodeId)
  if (selected.value === nodeId) selected.value = null
  emit('update:nodes', localNodes.value)
  emit('update:edges', localEdges.value)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  const type = e.dataTransfer?.getData('text/plain') as TopologyNode['type']
  if (!type) return
  const pt = svgPt(e)
  const nodeId = `${type}-${Date.now()}`
  localNodes.value.push({ nodeId, type, label: type.toUpperCase(), x: pt.x, y: pt.y })
  emit('update:nodes', localNodes.value)
}

type Anchor = { sx: number; sy: number; ex: number; ey: number; srcGid: string | null; tgtGid: string | null }

function edgeAnchors(edge: TopologyEdge): Anchor | null {
  const fromNode  = nodeMap.value.get(edge.from)
  const toNode    = nodeMap.value.get(edge.to)
  const fromGroup = groupMap.value.get(edge.from)
  const toGroup   = groupMap.value.get(edge.to)
  if (!fromNode && !fromGroup) return null
  if (!toNode   && !toGroup)   return null

  const hw = NW / 2
  const fromCx = fromNode ? fromNode.x : fromGroup!.x + fromGroup!.width  / 2
  const fromCy = fromNode ? fromNode.y : fromGroup!.y + fromGroup!.height / 2
  const toCx   = toNode   ? toNode.x   : toGroup!.x   + toGroup!.width    / 2
  const toCy   = toNode   ? toNode.y   : toGroup!.y   + toGroup!.height   / 2

  const dx = Math.abs(toCx - fromCx)
  const dy = Math.abs(toCy - fromCy)
  const goRight = toCx >= fromCx
  const goDown  = toCy >= fromCy

  let sx: number, sy: number, ex: number, ey: number

  if (dy > dx * 0.4) {
    // Primarily vertical: connect from top/bottom ports
    sx = fromCx
    sy = fromNode ? (goDown ? fromNode.y + hw : fromNode.y - hw) : (goDown ? fromGroup!.y + fromGroup!.height : fromGroup!.y)
    ex = toCx
    ey = toNode   ? (goDown ? toNode.y   - hw : toNode.y   + hw) : (goDown ? toGroup!.y                      : toGroup!.y + toGroup!.height)
  } else {
    // Primarily horizontal: connect from left/right ports
    sx = fromNode ? (goRight ? fromNode.x + hw : fromNode.x - hw) : (goRight ? fromGroup!.x + fromGroup!.width : fromGroup!.x)
    sy = fromCy
    ex = toNode   ? (goRight ? toNode.x   - hw : toNode.x   + hw) : (goRight ? toGroup!.x                     : toGroup!.x + toGroup!.width)
    ey = toCy
  }

  const srcGid = fromNode?.parentGroupId ?? fromGroup?.groupId ?? null
  const tgtGid = toNode?.parentGroupId   ?? toGroup?.groupId   ?? null

  return { sx, sy, ex, ey, srcGid, tgtGid }
}

function edgePath(edge: TopologyEdge): string {
  const a = edgeAnchors(edge)
  if (!a) return ''
  const { sx, sy, ex, ey, srcGid, tgtGid } = a

  // Detect if horizontal segment would cross through the g-private-* column.
  // If so, route via the VPC header corridor (above all subnets) to avoid overlap.
  const privGroups = localGroups.value.filter(g => g.groupId.startsWith('g-private-'))
  if (privGroups.length > 0) {
    const isPrivSrc = privGroups.some(g => g.groupId === srcGid)
    const isPrivTgt = privGroups.some(g => g.groupId === tgtGid)
    if (!isPrivSrc && !isPrivTgt) {
      const xMin = Math.min(sx, ex), xMax = Math.max(sx, ex)
      // All private groups share the same x/width (stacked vertically)
      const privX0 = privGroups[0].x
      const privX1 = privX0 + privGroups[0].width
      if (xMax > privX0 && xMin < privX1) {
        const testY = Math.abs(sy - ey) < 4 ? sy : ey
        const crossesPriv = privGroups.some(g => testY > g.y && testY < g.y + g.height)
        if (crossesPriv) {
          const corridorY = privGroups[0].y - 20
          return `M${sx},${sy} V${corridorY} H${ex} V${ey}`
        }
      }
    }
  }

  if (Math.abs(sy - ey) < 4) return `M${sx},${sy} H${ex}`
  if (Math.abs(sx - ex) < 4) return `M${sx},${sy} V${ey}`

  // Default: V-first L-path (go to target Y, then target X)
  return `M${sx},${sy} V${ey} H${ex}`
}
</script>

<template>
  <svg
    ref="svgEl"
    :style="`width: ${VB_W * (props.zoom ?? 1)}px; height: ${VB_H * (props.zoom ?? 1)}px; display: block;`"
    class="select-none"
    :viewBox="`0 0 ${VB_W} ${VB_H}`"
    @pointermove="onSvgMove"
    @pointerup="onSvgUp"
    @click="onSvgClick"
    @dragover.prevent
    @drop="onDrop"
  >
    <defs>
      <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#9CA3AF" />
      </marker>
    </defs>

    <g :transform="`translate(${offsetX}, ${offsetY})`">
      <!-- 그룹 (VPC / 서브넷) -->
      <g v-for="g in localGroups" :key="g.groupId">
        <rect :x="g.x" :y="g.y" :width="g.width" :height="g.height" rx="10"
          :fill="GROUP_STYLES[g.type]?.fill ?? 'transparent'"
          :stroke="GROUP_STYLES[g.type]?.stroke ?? '#9CA3AF'"
          stroke-width="1.5" stroke-dasharray="6 3" />
        <text :x="g.x + 10" :y="g.y + 18" font-size="11" font-weight="700"
          :fill="GROUP_STYLES[g.type]?.stroke ?? '#9CA3AF'" font-family="monospace">
          {{ g.label }}
        </text>
      </g>

      <!-- 엣지 (node→node, node→group, group→group 모두 지원) -->
      <g v-for="edge in localEdges" :key="edge.edgeId">
        <path
          v-if="edgeAnchors(edge)"
          :d="edgePath(edge)"
          fill="none" stroke="#9CA3AF" stroke-width="1.5"
          :stroke-dasharray="edge.dashed ? '6 4' : 'none'"
          marker-end="url(#arr)"
          stroke-linejoin="round"
        />
        <text v-if="edge.label && edgeAnchors(edge)"
          :x="(edgeAnchors(edge)!.sx + edgeAnchors(edge)!.ex) / 2"
          :y="(edgeAnchors(edge)!.sy + edgeAnchors(edge)!.ey) / 2 - 6"
          font-size="9" fill="#9CA3AF" text-anchor="middle">{{ edge.label }}</text>
      </g>

      <!-- 연결 드래그 임시선 -->
      <line v-if="connecting"
        :x1="nodeMap.get(connecting!.fromId)?.x ?? 0"
        :y1="nodeMap.get(connecting!.fromId)?.y ?? 0"
        :x2="connectCursor.x" :y2="connectCursor.y"
        stroke="#2980B9" stroke-width="1.5" stroke-dasharray="5 3" />

      <!-- 노드 -->
      <g
        v-for="node in localNodes" :key="node.nodeId"
        :transform="`translate(${node.x - NW / 2}, ${node.y - NH / 2})`"
        class="cursor-move"
        @pointerdown="onNodeDown(node.nodeId, $event)"
        @mouseenter="hovered = node.nodeId; emit('nodeHover', node.nodeId)"
        @mouseleave="hovered = null; emit('nodeHover', null)"
      >
        <rect x="0" y="0" :width="NW" :height="NH" rx="10"
          fill="white"
          :stroke="selected === node.nodeId ? '#2980B9' : hovered === node.nodeId ? '#93C5FD' : '#E5E7EB'"
          :stroke-width="selected === node.nodeId ? 2 : 1.5" />
        <image v-if="ICONS[node.type]" :href="ICONS[node.type]" x="16" y="10" width="40" height="40" />
        <text v-else x="36" y="36" text-anchor="middle" font-size="10" fill="#6B7280">{{ node.type }}</text>

  <text x="36" y="64" text-anchor="middle" font-size="9" fill="#6B7280" font-family="monospace">{{
  node.label }}</text>

        <circle v-if="hovered === node.nodeId && !drag"
          :cx="NW" :cy="NH / 2" r="5"
          fill="#2980B9" class="cursor-crosshair"
          @pointerdown.stop="onPortDown(node.nodeId, $event)" />

        <g v-if="hovered === node.nodeId || selected === node.nodeId"
           class="cursor-pointer"
           @pointerdown.stop
           @click.stop="deleteNode(node.nodeId)">
          <circle :cx="NW" cy="0" r="9" fill="#EF4444" />
          <text :x="NW" y="4" text-anchor="middle" font-size="11" fill="white" font-weight="bold">×</text>
        </g>
      </g>
    </g>
  </svg>
</template>
