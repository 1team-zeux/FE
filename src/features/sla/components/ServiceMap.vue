<script setup lang="ts">
import { computed } from 'vue';
import type { ServiceMap } from '../api/useServiceMapQuery';

const props = defineProps<{ map: ServiceMap }>();
const emit = defineEmits<{ (e: 'nodeClick', id: string): void }>();

const W = 580;
const H = 420;

const nodeById = computed(() => Object.fromEntries(props.map.nodes.map(n => [n.id, n])));

const statusFill = (s: string) => ({
  critical: 'var(--color-status-critical)',
  warning:  'var(--color-status-warning)',
  healthy:  'var(--color-status-ok)',
}[s] ?? '#9CA3AF');

const statusStroke = (s: string) => ({
  critical: 'var(--color-status-critical)',
  warning:  'var(--color-status-warning)',
  healthy:  'var(--color-status-ok)',
}[s] ?? '#9CA3AF');

const edgePath = (from: string, to: string) => {
  const f = nodeById.value[from];
  const t = nodeById.value[to];
  if (!f || !t) return '';
  const fx = f.x + 64, fy = f.y + 20;
  const tx = t.x,      ty = t.y + 20;
  const mx = (fx + tx) / 2;
  return `M${fx},${fy} C${mx},${fy} ${mx},${ty} ${tx},${ty}`;
};
</script>
<template>
  <div class="bg-bg-card border border-border rounded-lg overflow-hidden">
    <div class="bg-gray-50 border-b border-border px-4 py-3 flex justify-between items-center">
      <span class="text-xs font-bold text-text-primary">Service Dependency Map</span>
      <div class="flex items-center gap-3 text-xs text-gray-500">
        <span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-status-critical"></span>위험</span>
        <span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-status-warning"></span>경고</span>
        <span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-status-ok"></span>정상</span>
      </div>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" width="100%" :height="H" class="block">
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--color-border)" />
        </marker>
        <marker id="arrowhead-critical" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--color-status-critical)" opacity="0.5" />
        </marker>
      </defs>

      <!-- Edges -->
      <g v-for="edge in map.edges" :key="`${edge.from}-${edge.to}`">
        <path
          :d="edgePath(edge.from, edge.to)"
          fill="none"
          stroke="var(--color-border)"
          stroke-width="1.5"
          marker-end="url(#arrowhead)"
        />
      </g>

      <!-- Nodes -->
      <g
        v-for="node in map.nodes" :key="node.id"
        class="cursor-pointer"
        :transform="`translate(${node.x}, ${node.y})`"
        @click="emit('nodeClick', node.name)"
      >
        <rect
          width="128" height="40" rx="6"
          fill="var(--color-bg-card)"
          :stroke="statusStroke(node.status)"
          stroke-width="1.5"
          class="transition-all"
        />
        <!-- Status dot -->
        <circle cx="14" cy="20" r="5" :fill="statusFill(node.status)"
          :class="node.status === 'critical' ? 'animate-pulse' : ''"
        />
        <text x="26" y="24" font-size="11" font-weight="600" fill="var(--color-text-primary)" font-family="system-ui">
          {{ node.name }}
        </text>
      </g>
    </svg>
  </div>
</template>
