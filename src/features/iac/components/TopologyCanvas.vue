<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TopologyNode, TopologyEdge, TopologyGroup } from '../types/topology.schema'
import ec2Url from '@/assets/aws-icons/ec2.svg?url'
import rdsUrl from '@/assets/aws-icons/rds.svg?url'
import elbUrl from '@/assets/aws-icons/elb.svg?url'
import lambdaUrl from '@/assets/aws-icons/lambda.svg?url'
import eksUrl from '@/assets/aws-icons/eks.svg?url'
import ecsUrl from '@/assets/aws-icons/ecs.svg?url'
import apigwUrl from '@/assets/aws-icons/apigw.svg?url'
import cloudwatchUrl from '@/assets/aws-icons/cloudwatch.svg?url'
import route53Url from '@/assets/aws-icons/route53.svg?url'
import s3Url from '@/assets/aws-icons/s3.svg?url'
import vpcUrl from '@/assets/aws-icons/vpc.svg?url'

const ICONS: Record<string, string> = {
  ec2: ec2Url, rds: rdsUrl, elb: elbUrl, lambda: lambdaUrl,
  eks: eksUrl, ecs: ecsUrl, apigw: apigwUrl, cloudwatch: cloudwatchUrl,
  route53: route53Url, s3: s3Url, vpc: vpcUrl, nat: elbUrl, igw: route53Url,
}
const GROUP_STYLES: Record<string, { stroke: string; fill: string }> = {
  'vpc':            { stroke: '#F59E0B', fill: 'rgba(245,158,11,0.04)' },
  'public-subnet':  { stroke: '#3B82F6', fill: 'rgba(59,130,246,0.04)' },
  'private-subnet': { stroke: '#8B5CF6', fill: 'rgba(139,92,246,0.04)' },
  'db-subnet':      { stroke: '#10B981', fill: 'rgba(16,185,129,0.04)' },
  'asg':            { stroke: '#F97316', fill: 'rgba(249,115,22,0.04)' },
}

const NW = 72, NH = 72
// 콘텐츠를 배치하는 논리 캔버스 크기
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

const localNodes = ref<TopologyNode[]>([...props.nodes])
const localEdges = ref<TopologyEdge[]>([...props.edges])
watch(() => props.nodes, (v) => { localNodes.value = [...v] })
watch(() => props.edges, (v) => { localEdges.value = [...v] })

// 노드·그룹 bounding box를 계산해서 콘텐츠를 SVG 중앙으로 이동하는 offset
const offsetX = ref(0)
const offsetY = ref(0)

function recomputeOffset() {
  const allX: number[] = []
  const allY: number[] = []
  localNodes.value.forEach(n => { allX.push(n.x); allY.push(n.y) })
  props.groups.forEach(g => { allX.push(g.x, g.x + g.width); allY.push(g.y, g.y + g.height) })
  if (!allX.length) return
  const cx = (Math.min(...allX) + Math.max(...allX)) / 2
  const cy = (Math.min(...allY) + Math.max(...allY)) / 2
  offsetX.value = VB_W / 2 - cx
  offsetY.value = VB_H / 2 - cy
}

// 노드 ID 집합이 변할 때만 재계산 (드래그로 이동할 때는 재계산 안 함)
watch(
  () => localNodes.value.map(n => n.nodeId).join(',') + props.groups.map(g => g.groupId).join(','),
  recomputeOffset,
  { immediate: true },
)

const svgEl = ref<SVGSVGElement | null>(null)
const hovered = ref<string | null>(null)
const selected = ref<string | null>(null)

const drag = ref<{ nodeId: string; ox: number; oy: number } | null>(null)
const hasMoved = ref(false)

const connecting = ref<{ fromId: string } | null>(null)
const connectCursor = ref({ x: 0, y: 0 })

// offset을 감안해서 SVG 내부 좌표 → 콘텐츠 좌표로 변환
function svgPt(e: PointerEvent | DragEvent) {
  const svg = svgEl.value!
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

function edgePath(from: TopologyNode, to: TopologyNode) {
  const dx = Math.abs(to.x - from.x) * 0.5
  return `M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`
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

    <!-- 콘텐츠 전체를 중앙으로 이동 -->
    <g :transform="`translate(${offsetX}, ${offsetY})`">
      <!-- 그룹 (VPC / 서브넷) -->
      <g v-for="g in groups" :key="g.groupId">
        <rect :x="g.x" :y="g.y" :width="g.width" :height="g.height" rx="10"
          :fill="GROUP_STYLES[g.type]?.fill ?? 'transparent'"
          :stroke="GROUP_STYLES[g.type]?.stroke ?? '#9CA3AF'"
          stroke-width="1.5" stroke-dasharray="6 3" />
        <text :x="g.x + 10" :y="g.y + 18" font-size="11" font-weight="700"
          :fill="GROUP_STYLES[g.type]?.stroke ?? '#9CA3AF'" font-family="monospace">
          {{ g.label }}
        </text>
      </g>

      <!-- 엣지 -->
      <g v-for="edge in localEdges" :key="edge.edgeId">
        <path
          v-if="localNodes.find(n => n.nodeId === edge.from) && localNodes.find(n => n.nodeId === edge.to)"
          :d="edgePath(localNodes.find(n => n.nodeId === edge.from)!, localNodes.find(n => n.nodeId === edge.to)!)"
          fill="none" stroke="#9CA3AF" stroke-width="1.5"
          :stroke-dasharray="edge.dashed ? '6 4' : 'none'"
          marker-end="url(#arr)"
        />
        <text v-if="edge.label && localNodes.find(n => n.nodeId === edge.from) && localNodes.find(n => n.nodeId === edge.to)"
          :x="(localNodes.find(n => n.nodeId === edge.from)!.x + localNodes.find(n => n.nodeId === edge.to)!.x) / 2"
          :y="(localNodes.find(n => n.nodeId === edge.from)!.y + localNodes.find(n => n.nodeId === edge.to)!.y) / 2 - 6"
          font-size="9" fill="#9CA3AF" text-anchor="middle">{{ edge.label }}</text>
      </g>

      <!-- 연결 드래그 임시선 -->
      <line v-if="connecting"
        :x1="localNodes.find(n => n.nodeId === connecting!.fromId)?.x ?? 0"
        :y1="localNodes.find(n => n.nodeId === connecting!.fromId)?.y ?? 0"
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
        <text x="36" y="64" text-anchor="middle" font-size="9" fill="#6B7280" font-family="monospace">{{ node.label }}</text>

        <!-- 포트 (hover 시) -->
        <circle v-if="hovered === node.nodeId && !drag"
          :cx="NW" :cy="NH / 2" r="5"
          fill="#2980B9" class="cursor-crosshair"
          @pointerdown.stop="onPortDown(node.nodeId, $event)" />

        <!-- 삭제 버튼 (hover·선택 시) -->
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
