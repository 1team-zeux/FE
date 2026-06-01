<script setup lang="ts">
import { ref } from 'vue'
import type { TopologyNode, TopologyEdge } from '../types/topology.schema'

const props = defineProps<{
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}>()

const emit = defineEmits<{
  'node-click': [nodeId: string]
}>()

const hoveredNode = ref<string | null>(null)

const NODE_ICONS: Record<string, string> = {
  vpc: '🌐', subnet: '📦', ec2: '💻', rds: '🗄️', elb: '⚖️',
  nat: '🔀', igw: '🚪', lambda: 'λ', ecs: '📋', eks: '⚙️',
  cloudwatch: '📊', route53: '🔍',
}

function getNode(id: string) {
  return props.nodes.find((n) => n.nodeId === id)
}
</script>

<template>
  <div class="relative w-full h-full">
    <svg
      class="w-full h-full"
      viewBox="0 0 600 500"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#9CA3AF" />
        </marker>
      </defs>

      <!-- 엣지 -->
      <line
        v-for="edge in edges"
        :key="edge.edgeId"
        :data-edge="edge.edgeId"
        :x1="getNode(edge.from)?.x ?? 0"
        :y1="(getNode(edge.from)?.y ?? 0) + 30"
        :x2="getNode(edge.to)?.x ?? 0"
        :y2="getNode(edge.to)?.y ?? 0"
        :stroke-dasharray="edge.dashed ? '6 4' : 'none'"
        stroke="#9CA3AF"
        stroke-width="1.5"
        marker-end="url(#arrow)"
      />

      <!-- 노드 -->
      <g
        v-for="node in nodes"
        :key="node.nodeId"
        :data-node="node.nodeId"
        :transform="`translate(${node.x - 40}, ${node.y})`"
        class="cursor-pointer"
        @click="emit('node-click', node.nodeId)"
        @mouseenter="hoveredNode = node.nodeId"
        @mouseleave="hoveredNode = null"
      >
        <rect
          x="0" y="0" width="80" height="52" rx="8"
          :fill="hoveredNode === node.nodeId ? '#EFF6FF' : '#FFFFFF'"
          :stroke="hoveredNode === node.nodeId ? '#2980B9' : '#E5E7EB'"
          stroke-width="1.5"
        />
        <text x="40" y="22" text-anchor="middle" font-size="16">{{ NODE_ICONS[node.type] ?? '□' }}</text>
        <text x="40" y="42" text-anchor="middle" font-size="10" fill="#6B7280">{{ node.label }}</text>

        <!-- 툴팁 -->
        <g v-if="hoveredNode === node.nodeId && node.catalogRule" :transform="`translate(82, -10)`">
          <rect x="0" y="0" width="160" height="50" rx="6" fill="#1F2937" opacity="0.95" />
          <text x="8" y="18" font-size="10" fill="#F9FAFB" font-weight="600">{{ node.catalogRule }}</text>
          <text x="8" y="36" font-size="9" fill="#9CA3AF">{{ node.applyCondition }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>
