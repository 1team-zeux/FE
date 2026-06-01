<script setup lang="ts">
import type { MetricStat } from '../types/root-cause.schema';
defineProps<{ metric: MetricStat; }>();
</script>
<template>
  <div class="flex flex-col gap-0.5">
    <span class="text-[9px] text-gray-400 font-bold uppercase">{{ metric.label }}</span>
    <span class="font-mono text-sm font-bold" :class="{ 'text-status-critical': metric.state === 'critical', 'text-status-warning': metric.state === 'warning', 'text-status-ok': metric.state === 'healthy', 'text-text-primary': metric.state === 'normal', }">{{ metric.value }}</span>
  </div>
</template>
