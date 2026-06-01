<script setup lang="ts">
import type { Service } from '../types/sla.schema';
import SlaChip from './SlaChip.vue';
defineProps<{ service: Service; }>();
defineEmits<{ (e: 'drilldown'): void; }>();
</script>
<template>
  <div class="bg-bg-card border border-border rounded-lg overflow-hidden transition-all flex flex-col md:flex-row" :class="{ 'border-l-4 border-l-status-critical': service.status === 'critical' }">
    <div class="flex-1 p-5 border-r border-border">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-2 h-2 rounded-full" :class="{ 'bg-status-critical shadow-[0_0_8px_rgba(237,33,58,0.5)] animate-pulse': service.status === 'critical', 'bg-status-warning': service.status === 'warning', 'bg-status-ok': service.status === 'healthy' }" />
        <span class="text-base font-bold text-text-primary">{{ service.name }}</span>
        <span class="px-2 py-0.5 bg-gray-100 text-[10px] font-bold rounded text-gray-500">{{ service.tier }}</span>
        <button v-if="service.drillable" class="ml-auto px-3 py-1 bg-brand/10 text-brand text-[11px] font-bold rounded-md hover:bg-brand/20 transition-colors" @click="$emit('drilldown')">Analyze →</button>
      </div>
      <div class="mb-5">
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Service SLAs</div>
        <div class="flex flex-wrap gap-2">
          <SlaChip v-for="(sla, i) in service.slas" :key="i" :sla="sla" :clickable="service.drillable && (sla.state === 'violation' || sla.state === 'warning')" @click="$emit('drilldown')" />
        </div>
      </div>
      <div v-if="service.endpoints.length > 0" class="pl-4 border-l-2 border-border">
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Internal Endpoints <span class="font-normal lowercase tracking-normal">· dependencies</span></div>
        <div class="space-y-2">
          <div v-for="(ep, i) in service.endpoints" :key="i" class="flex items-center gap-3 p-2 rounded text-xs transition-all" :class="{ 'bg-status-critical/5 border border-status-critical/20': ep.state === 'highlight', 'bg-gray-50 opacity-60': ep.state === 'muted', 'bg-gray-50': ep.state === 'normal', }">
            <span class="font-mono px-1.5 py-0.5 bg-white border border-border rounded text-[10px] font-bold text-gray-500">{{ ep.method }}</span>
            <span class="font-mono font-medium" :class="{ 'text-text-primary': ep.state === 'highlight', 'text-gray-400': ep.state === 'muted' }">{{ ep.path }}</span>
            <div v-if="ep.sla" class="ml-auto flex items-center gap-3">
              <span class="px-1.5 py-0.5 bg-brand/10 text-brand text-[9px] font-bold rounded">L3 SLA</span>
              <div class="font-mono font-bold"><span class="text-status-critical">{{ ep.sla.cur }}</span><span class="text-gray-400 ml-1">/ {{ ep.sla.tgt }}</span></div>
              <span class="text-[10px] text-gray-400">{{ ep.sla.name }}</span>
            </div>
            <span v-else class="ml-auto text-[10px] text-gray-400 italic">No specific SLA</span>
          </div>
        </div>
      </div>
      <div v-else class="text-[11px] text-gray-400 italic">{{ service.endpointNote || 'No specific endpoints monitored' }}</div>
    </div>
    <div class="w-full md:w-[200px] p-5 bg-bg-muted flex flex-col gap-4">
      <div>
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Burn Rate</div>
        <div v-if="service.burn" class="flex items-center gap-2"><span class="text-xl font-bold" :class="{ 'text-status-critical': service.burn === 'Fast', 'text-status-warning': service.burn === 'Slow' }">{{ service.burn }}</span><span :class="{ 'text-status-critical': service.burn === 'Fast', 'text-status-warning': service.burn === 'Slow' }">{{ service.burn === 'Fast' ? '▲▲' : '▲' }}</span></div>
        <div v-else class="text-sm font-bold text-status-ok">Stable</div>
      </div>
      <div>
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Exhaustion Alert</div>
        <div v-if="service.alertStage > 0" class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border" :class="{ 'bg-status-critical/10 text-status-critical border-status-critical/20': service.alertStage >= 2, 'bg-status-warning/10 text-status-warning border-status-warning/20': service.alertStage === 1, }">Stage {{ service.alertStage }} Alert</div>
        <div v-else class="text-[10px] font-bold text-status-ok bg-status-ok/10 px-2 py-0.5 rounded-full inline-block border border-status-ok/20">No Alerts</div>
      </div>
      <div class="mt-auto">
        <div class="flex justify-between text-[10px] text-gray-400 mb-1"><span>Error Budget</span><span class="font-bold text-text-primary">{{ service.budgetRemaining }}% left</span></div>
        <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div class="h-full" :class="{ 'bg-status-critical': service.budgetRemaining <= 35, 'bg-status-warning': service.budgetRemaining > 35 && service.budgetRemaining <= 60, 'bg-status-ok': service.budgetRemaining > 60, }" :style="{ width: `${service.budgetRemaining}%` }" /></div>
        <div class="text-[9px] text-gray-400 mt-1 font-mono uppercase">{{ service.budgetConsumed }}% consumed</div>
      </div>
    </div>
  </div>
</template>
