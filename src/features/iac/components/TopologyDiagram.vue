<script setup lang="ts">
import { ref } from 'vue'
import type { TopologyNode, TopologyEdge } from '../types/topology.schema'

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

const NODE_ICONS: Record<string, string> = {
  ec2: ec2Url, rds: rdsUrl, elb: elbUrl, lambda: lambdaUrl,
  eks: eksUrl, ecs: ecsUrl, apigw: apigwUrl, cloudwatch: cloudwatchUrl,
  route53: route53Url, s3: s3Url, vpc: vpcUrl,
  nat: elbUrl, igw: route53Url,
}

// AWS 서비스별 테마 색상
const NODE_COLORS: Record<string, string> = {
  ec2: '#FF9900', rds: '#527FFF', elb: '#8C4FFF', lambda: '#FF9900',
  eks: '#FF9900', ecs: '#FF9900', apigw: '#FF4F8B', cloudwatch: '#FF9900',
  route53: '#8C4FFF', s3: '#3F8624', vpc: '#E7157B', nat: '#8C4FFF', igw: '#8C4FFF',
}

defineProps<{
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}>()

const emit = defineEmits<{
  'node-click': [nodeId: string]
}>()

const hoveredNode = ref<string | null>(null)

function getNode(id: string, nodes: TopologyNode[]) {
  return nodes.find((n) => n.nodeId === id)
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
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#00000018" />
        </filter>
      </defs>

      <!-- 엣지 -->
      <g v-for="edge in edges" :key="edge.edgeId">
        <line
          :x1="getNode(edge.from, nodes)?.x ?? 0"
          :y1="(getNode(edge.from, nodes)?.y ?? 0) + 44"
          :x2="getNode(edge.to, nodes)?.x ?? 0"
          :y2="getNode(edge.to, nodes)?.y ?? 0"
          :stroke-dasharray="edge.dashed ? '6 4' : 'none'"
          stroke="#D1D5DB"
          stroke-width="1.5"
          marker-end="url(#arrow)"
        />
        <text
          v-if="edge.label"
          :x="((getNode(edge.from, nodes)?.x ?? 0) + (getNode(edge.to, nodes)?.x ?? 0)) / 2 + 6"
          :y="((getNode(edge.from, nodes)?.y ?? 0) + (getNode(edge.to, nodes)?.y ?? 0)) / 2 + 44"
          font-size="9"
          fill="#9CA3AF"
          text-anchor="middle"
        >{{ edge.label }}</text>
      </g>

      <!-- 노드 -->
      <g
        v-for="node in nodes"
        :key="node.nodeId"
        :transform="`translate(${node.x - 36}, ${node.y})`"
        class="cursor-pointer"
        @click="emit('node-click', node.nodeId)"
        @mouseenter="hoveredNode = node.nodeId"
        @mouseleave="hoveredNode = null"
      >
        <!-- 배경 카드 -->
        <rect
          x="0" y="0" width="72" height="72" rx="12"
          :fill="hoveredNode === node.nodeId ? '#F8FAFF' : '#FFFFFF'"
          :stroke="hoveredNode === node.nodeId ? (NODE_COLORS[node.type] ?? '#E5E7EB') : '#E5E7EB'"
          stroke-width="1.5"
          filter="url(#shadow)"
        />
        <!-- 상단 컬러 바 -->
        <rect
          x="0" y="0" width="72" height="4" rx="12"
          :fill="NODE_COLORS[node.type] ?? '#9CA3AF'"
        />
        <rect x="0" y="4" width="72" height="8" :fill="NODE_COLORS[node.type] ?? '#9CA3AF'" />

        <!-- AWS 아이콘 -->
        <image
          v-if="NODE_ICONS[node.type]"
          :href="NODE_ICONS[node.type]"
          x="16" y="12" width="40" height="40"
        />
        <!-- 폴백: 타입 약어 -->
        <text
          v-else
          x="36" y="40"
          text-anchor="middle"
          font-size="11"
          font-weight="600"
          fill="#6B7280"
        >{{ node.type.toUpperCase() }}</text>

        <!-- 라벨 -->
        <text
          x="36" y="66"
          text-anchor="middle"
          font-size="9"
          fill="#6B7280"
          font-family="monospace"
        >{{ node.label }}</text>

        <!-- 호버 툴팁 -->
        <g v-if="hoveredNode === node.nodeId && node.catalogRule" transform="translate(76, -8)">
          <rect x="0" y="0" width="168" height="52" rx="6" fill="#1F2937" opacity="0.95" />
          <text x="10" y="18" font-size="10" fill="#F9FAFB" font-weight="600">{{ node.catalogRule }}</text>
          <text x="10" y="36" font-size="9" fill="#9CA3AF">{{ node.applyCondition }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>
