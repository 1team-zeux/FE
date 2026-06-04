<script setup lang="ts">
import { ref } from 'vue'
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

defineProps<{
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  groups?: TopologyGroup[]
}>()

const emit = defineEmits<{ 'node-click': [nodeId: string] }>()
const hovered = ref<string | null>(null)

function getNode(nodes: TopologyNode[], id: string) {
  return nodes.find(n => n.nodeId === id)
}

function edgePath(from: TopologyNode, to: TopologyNode) {
  const dx = Math.abs(to.x - from.x) * 0.5
  return `M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`
}
</script>

<template>
  <div class="relative w-full h-full">
    <svg class="w-full h-full" viewBox="0 0 1060 700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#9CA3AF" />
        </marker>
      </defs>

      <!-- 그룹 -->
      <g v-for="g in (groups ?? [])" :key="g.groupId">
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
      <g v-for="edge in edges" :key="edge.edgeId">
        <path
          v-if="getNode(nodes, edge.from) && getNode(nodes, edge.to)"
          :d="edgePath(getNode(nodes, edge.from)!, getNode(nodes, edge.to)!)"
          fill="none" stroke="#D1D5DB" stroke-width="1.5"
          :stroke-dasharray="edge.dashed ? '6 4' : 'none'"
          marker-end="url(#arrow)"
        />
        <text
          v-if="edge.label && getNode(nodes, edge.from) && getNode(nodes, edge.to)"
          :x="(getNode(nodes, edge.from)!.x + getNode(nodes, edge.to)!.x) / 2"
          :y="(getNode(nodes, edge.from)!.y + getNode(nodes, edge.to)!.y) / 2 - 6"
          font-size="9" fill="#9CA3AF" text-anchor="middle">{{ edge.label }}</text>
      </g>

      <!-- 노드 -->
      <g
        v-for="node in nodes" :key="node.nodeId"
        :transform="`translate(${node.x - NW / 2}, ${node.y - NH / 2})`"
        class="cursor-pointer"
        @click="emit('node-click', node.nodeId)"
        @mouseenter="hovered = node.nodeId"
        @mouseleave="hovered = null"
      >
        <rect x="0" y="0" :width="NW" :height="NH" rx="10"
          :fill="hovered === node.nodeId ? '#EFF6FF' : '#FFFFFF'"
          :stroke="hovered === node.nodeId ? '#2980B9' : '#E5E7EB'"
          stroke-width="1.5" />
        <image v-if="ICONS[node.type]" :href="ICONS[node.type]" x="16" y="10" width="40" height="40" />
        <text v-else x="36" y="36" text-anchor="middle" font-size="10" fill="#6B7280">{{ node.type }}</text>
        <text x="36" y="64" text-anchor="middle" font-size="9" fill="#6B7280" font-family="monospace">{{ node.label }}</text>

        <g v-if="hovered === node.nodeId && node.catalogRule" transform="translate(76, -8)">
          <rect x="0" y="0" width="168" height="52" rx="6" fill="#1F2937" opacity="0.95" />
          <text x="10" y="18" font-size="10" fill="#F9FAFB" font-weight="600">{{ node.catalogRule }}</text>
          <text x="10" y="36" font-size="9" fill="#9CA3AF">{{ node.applyCondition }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>
