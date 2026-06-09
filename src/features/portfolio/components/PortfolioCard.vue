<script setup lang="ts">
import type { BU } from '../types/portfolio.schema';
defineProps<{ bu: BU; }>();
defineEmits<{ (e: 'click'): void; }>();

const riskColor = (score: number) => {
  if (score >= 71) return 'text-status-critical';
  if (score >= 31) return 'text-status-warning';
  return 'text-status-ok';
};
const riskBg = (score: number) => {
  if (score >= 71) return 'bg-status-critical';
  if (score >= 31) return 'bg-status-warning';
  return 'bg-status-ok';
};
</script>
<template>
  <div class="card relative bg-bg-card border border-border rounded-lg p-4 transition-all hover:border-brand hover:-translate-y-1 cursor-pointer overflow-hidden shadow-sm" @click="$emit('click')">
    <div class="absolute top-0 left-0 right-0 h-1" :class="{ 'bg-status-critical': bu.status === 'critical', 'bg-status-warning': bu.status === 'warning', 'bg-status-ok': bu.status === 'healthy' }" />
    <div class="flex justify-between items-start mb-3">
      <div class="flex-1 min-w-0">
        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">{{ bu.customer }}</div>
        <div class="text-base font-bold text-text-primary mt-0.5 truncate">{{ bu.bu }}</div>
        <div class="text-[10px] text-gray-400 mt-0.5 truncate">{{ bu.platform }}</div>
      </div>
      <div class="flex flex-col items-end gap-1 ml-2 shrink-0">
        <div class="w-2 h-2 rounded-full" :class="{ 'bg-status-critical shadow-[0_0_8px_rgba(237,33,58,0.5)] animate-pulse': bu.status === 'critical', 'bg-status-warning': bu.status === 'warning', 'bg-status-ok': bu.status === 'healthy' }" />
        <span class="px-1.5 py-0.5 bg-gray-100 text-[9px] font-bold rounded text-gray-500">{{ bu.tier }}</span>
      </div>
    </div>

    <!-- Risk Score -->
    <div class="mb-3">
      <div class="flex justify-between items-center mb-1">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Risk Score</span>
        <span class="text-sm font-bold" :class="riskColor(bu.riskScore)">{{ bu.riskScore }}</span>
      </div>
      <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full transition-all duration-500 rounded-full" :class="riskBg(bu.riskScore)" :style="{ width: `${bu.riskScore}%` }" />
      </div>
    </div>

    <!-- Error Budget -->
    <div class="mb-3">
      <div class="flex justify-between text-[10px] text-gray-400 mb-1"><span>Error Budget</span><span class="font-bold">{{ bu.lowestBudget }}% left</span></div>
      <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full transition-all duration-500" :class="{ 'bg-status-critical': bu.lowestBudget <= 35, 'bg-status-warning': bu.lowestBudget > 35 && bu.lowestBudget <= 60, 'bg-status-ok': bu.lowestBudget > 60 }" :style="{ width: `${bu.lowestBudget}%` }" />
      </div>
    </div>

    <!-- Stats row -->
    <div class="flex gap-2 mb-3">
      <span class="px-2 py-0.5 bg-gray-100 text-[10px] font-bold rounded text-gray-500">서비스 {{ bu.serviceCount }}개</span>
      <span v-if="bu.activeEvents > 0" class="px-2 py-0.5 bg-status-critical/10 text-[10px] font-bold rounded text-status-critical border border-status-critical/20">이벤트 {{ bu.activeEvents }}건</span>
      <span v-else class="px-2 py-0.5 bg-status-ok/10 text-[10px] font-bold rounded text-status-ok border border-status-ok/20">이벤트 없음</span>
    </div>

    <div class="pt-3 border-t border-border flex items-start gap-2">
      <div class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" :class="{ 'bg-status-critical': bu.status === 'critical', 'bg-status-warning': bu.status === 'warning', 'bg-status-ok': bu.status === 'healthy' }" />
      <div class="text-[11px] text-gray-500 leading-tight">{{ bu.note }}</div>
    </div>
    <div v-if="bu.drillable" class="mt-3 text-[11px] text-brand font-bold flex items-center gap-1">Drill-down →</div>
  </div>
</template>
