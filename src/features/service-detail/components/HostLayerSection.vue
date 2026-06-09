<script setup lang="ts">
import LineChart from '@/components/shared/LineChart.vue';
import type { SystemMetrics } from '../types/metrics.schema';

const props = defineProps<{
  metrics: SystemMetrics;
  hoverIdx?: number | null;
}>();

const emit = defineEmits<{ (e: 'hover', idx: number | null): void }>();

const CHARTS = [
  { key: 'cpu',       label: 'Host CPU',    unit: '%',     color: 'var(--color-status-warning)', domain: [0, 100]  as [number, number] },
  { key: 'memory',    label: 'Host Memory', unit: '%',     color: 'var(--color-brand)',           domain: [0, 100]  as [number, number] },
  { key: 'diskRead',  label: 'Disk Read',   unit: ' MB/s', color: 'var(--color-text-muted)',      domain: [0, 150]  as [number, number] },
  { key: 'networkIn', label: 'Network In',  unit: ' MB/s', color: 'var(--color-status-ok)',       domain: [0, 250]  as [number, number] },
] as const;
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div v-for="chart in CHARTS" :key="chart.key" class="bg-bg-card border border-border rounded-lg overflow-hidden">
      <div class="px-3 py-2 border-b border-border flex justify-between items-center">
        <span class="text-xs font-bold">{{ chart.label }}</span>
        <span class="font-mono text-xs font-bold">
          {{ (metrics as any)[chart.key]?.at(-1) }}{{ chart.unit }}
        </span>
      </div>
      <LineChart
        :series="(metrics as any)[chart.key] ?? []"
        :domain="chart.domain"
        :color="chart.color"
        :height="80"
        :hover-idx="props.hoverIdx"
        @hover="emit('hover', $event)"
      />
    </div>
  </div>
</template>
