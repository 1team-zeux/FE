<script setup lang="ts">
import type { SlaItem } from '../types/sla.schema';
defineProps<{ sla: SlaItem; clickable?: boolean; }>();
defineEmits<{ (e: 'click'): void; }>();
</script>
<template>
  <div class="inline-flex flex-col gap-1 p-2 rounded border border-border bg-bg-muted min-w-[100px] transition-all" :class="{ 'border-status-critical bg-status-critical/5': sla.state === 'violation', 'border-status-warning bg-status-warning/5': sla.state === 'warning', 'border-status-ok bg-status-ok/5': sla.state === 'met', 'hover:border-brand cursor-pointer hover:shadow-sm': clickable, }" @click="clickable && $emit('click')">
    <div class="flex items-center justify-between gap-2">
      <span class="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{{ sla.name }}</span>
      <span class="text-[9px] font-bold px-1 rounded text-white" :class="{ 'bg-status-critical': sla.state === 'violation', 'bg-status-warning': sla.state === 'warning', 'bg-status-ok': sla.state === 'met', 'bg-gray-400': sla.state === 'reference', }">{{ sla.label }}</span>
    </div>
    <div class="font-mono text-xs font-bold flex items-baseline gap-1">
      <span :class="{ 'text-status-critical': sla.state === 'violation', 'text-status-warning': sla.state === 'warning', 'text-status-ok': sla.state === 'met', }">{{ sla.cur }}</span>
      <span v-if="sla.tgt" class="text-[10px] text-gray-400 font-normal"> / {{ sla.tgt }}</span>
    </div>
  </div>
</template>
