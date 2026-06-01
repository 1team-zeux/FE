<script setup lang="ts">
import type { ResourceCardData } from '../types/root-cause.schema';
import MetricStat from './MetricStat.vue';
defineProps<{ card: ResourceCardData; }>();
defineEmits<{ (e: 'handoff'): void; }>();
</script>
<template>
  <div class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm flex flex-col transition-all hover:border-brand/40" :class="{ 'border-t-4 border-t-status-critical': card.status === 'critical', 'border-t-4 border-t-status-warning': card.status === 'warning' }">
    <div class="p-4 border-b border-border">
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2">
          <span class="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border" :class="card.kind === 'endpoint' ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-gray-100 border-border text-gray-500'">{{ card.type }}</span>
          <div class="w-1.5 h-1.5 rounded-full" :class="{ 'bg-status-critical animate-pulse': card.status === 'critical', 'bg-status-warning': card.status === 'warning', 'bg-status-ok': card.status === 'healthy' }" />
        </div>
        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" :class="{ 'bg-status-critical': card.status === 'critical', 'bg-status-warning': card.status === 'warning', 'bg-status-ok': card.status === 'healthy', }">{{ card.status.toUpperCase() }}</span>
      </div>
      <div class="font-mono text-sm font-bold text-text-primary tracking-tight">{{ card.name }}</div>
      <div class="text-[10px] text-gray-400 mt-1">{{ card.spec }}</div>
    </div>
    <div class="p-4 border-b border-border" :class="card.status === 'critical' ? 'bg-status-critical/5' : 'bg-status-warning/5'">
      <div class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{{ card.primary.label }}</div>
      <div class="flex items-baseline justify-between mt-1">
        <span class="font-mono text-2xl font-bold" :class="card.status === 'critical' ? 'text-status-critical' : 'text-status-warning'">{{ card.primary.value }}</span>
        <span class="text-xs font-bold" :class="card.status === 'critical' ? 'text-status-critical' : 'text-status-warning'">{{ card.headline }}</span>
      </div>
    </div>
    <div class="p-4 grid grid-cols-3 gap-4">
      <MetricStat v-for="(m, i) in card.metrics" :key="i" :metric="m" />
    </div>
    <div class="px-4 pb-4 mt-auto">
      <div class="p-2 bg-gray-50 rounded text-[11px] text-gray-500 flex gap-2 items-start"><span class="text-brand font-bold">↳</span><span>{{ card.link }}</span></div>
    </div>
    <div class="p-3 bg-gray-50 border-t border-border flex gap-2">
      <button class="px-2 py-1 bg-white border border-border rounded text-[10px] font-bold text-gray-500 hover:bg-gray-100 transition-colors">Logs</button>
      <button class="px-2 py-1 bg-white border border-border rounded text-[10px] font-bold text-gray-500 hover:bg-gray-100 transition-colors">Traces</button>
      <button class="ml-auto px-2 py-1 bg-brand text-white rounded text-[10px] font-bold hover:brightness-110 transition-all" @click="$emit('handoff')">AIOps Handoff →</button>
    </div>
  </div>
</template>
