<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useServiceMetricsQuery } from '@/features/service-detail';
import LineChart from '@/components/shared/LineChart.vue';
import type { Alarm } from '@/features/service-detail';
const route = useRoute();
const router = useRouter();
const svcId = route.params.svcId as string;
const { data: detail, isLoading, isError } = useServiceMetricsQuery(svcId);
const activeAlarm = ref<Alarm | null>(null);
const handleAlarmClick = (alarm: Alarm) => activeAlarm.value = alarm;
const handleTrace = () => { if (activeAlarm.value) router.push(`/dashboard/trace/${activeAlarm.value.id}`); };
</script>
<template>
  <div class="p-8 max-w-[1400px] mx-auto">
    <div v-if="isLoading" class="p-12 text-center">Loading service metrics...</div>
    <div v-else-if="isError" class="p-12 text-center text-status-critical">Error loading metrics</div>
    <template v-else-if="detail">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">Level 3 · Service Detail</div>
          <h1 class="text-3xl font-bold text-text-primary tracking-tight">{{ detail.serviceName }}</h1>
          <p class="text-gray-500 mt-2 text-sm">Question: <b>Why is this service at risk?</b> · Integrated timeline analysis</p>
        </div>
        <button class="px-4 py-2 border border-border rounded-md text-sm font-bold hover:bg-gray-50 transition-colors" @click="router.back()">← Back</button>
      </div>
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
        <div class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div class="bg-gray-50 border-b border-border p-3 flex justify-between items-center text-xs">
            <span class="font-bold">Integrated Timeline</span>
            <div class="flex gap-4 text-gray-400"><span class="flex items-center gap-1"><span class="text-status-critical">◆</span> Critical</span><span class="flex items-center gap-1"><span class="text-status-warning">◆</span> Warning</span><span class="font-mono">{{ detail.window }}</span></div>
          </div>
          <div v-for="sli in detail.slis" :key="sli.id" class="border-b border-border last:border-b-0">
            <div class="p-3 flex justify-between items-center">
              <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-sm" :class="{ 'bg-status-critical': sli.state === 'violation', 'bg-status-warning': sli.state === 'warning', 'bg-brand': sli.state === 'met' }" /><span class="text-sm font-bold">{{ sli.name }}</span><span class="px-1.5 py-0.5 bg-gray-100 text-[10px] font-bold rounded text-gray-500">→ {{ sli.sla }} SLA</span></div>
              <div class="font-mono text-sm font-bold">{{ sli.series[sli.series.length - 1] }}{{ sli.unit }}<span class="text-[10px] text-gray-400 font-normal ml-1">Current</span></div>
            </div>
            <LineChart :series="sli.series" :domain="sli.domain" :target="sli.target" :target-label="sli.targetLabel" :color="sli.state === 'violation' ? 'var(--color-status-critical)' : sli.state === 'warning' ? 'var(--color-status-warning)' : 'var(--color-brand)'" :alarms="detail.alarms" :breach-from="sli.breachFrom" :active-idx="activeAlarm?.idx" @alarm-click="handleAlarmClick" />
          </div>
          <div class="bg-gray-50/30">
            <div class="p-3 flex justify-between items-center">
              <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-sm bg-gray-400" /><span class="text-sm font-bold text-gray-500">{{ detail.budget.name }}</span></div>
              <div class="font-mono text-sm font-bold text-status-critical">{{ detail.budget.series[detail.budget.series.length - 1] }}%<span class="text-[10px] text-gray-400 font-normal ml-1">Remaining</span></div>
            </div>
            <LineChart :series="detail.budget.series" :domain="detail.budget.domain" color="var(--color-text-muted)" :height="80" :alarms="detail.alarms" :active-idx="activeAlarm?.idx" @alarm-click="handleAlarmClick" />
          </div>
          <div class="flex justify-between px-3 py-2 text-[10px] font-mono text-gray-400 border-t border-border"><span v-for="(t, i) in detail.times" :key="i" v-show="i % 2 === 0">{{ t }}</span></div>
          <div class="p-3 bg-gray-50 border-t border-border flex flex-wrap gap-2">
            <button v-for="a in detail.alarms" :key="a.id" class="px-3 py-1.5 rounded border text-[11px] font-bold transition-all flex items-center gap-2" :class="{ 'bg-white border-border text-gray-500': activeAlarm?.id !== a.id, 'bg-status-critical/10 border-status-critical text-status-critical': activeAlarm?.id === a.id && a.sev === 'critical', 'bg-status-warning/10 border-status-warning text-status-warning': activeAlarm?.id === a.id && a.sev === 'warning', }" @click="handleAlarmClick(a)"><span :class="a.sev === 'critical' ? 'text-status-critical' : 'text-status-warning'">◆</span><span class="font-mono">{{ a.t }}</span><span>{{ a.title }}</span></button>
          </div>
        </div>
        <div class="space-y-6 sticky top-20">
          <div v-if="activeAlarm" class="bg-bg-card border-t-4 p-5 rounded-lg shadow-sm border border-border" :class="activeAlarm.sev === 'critical' ? 'border-t-status-critical' : 'border-t-status-warning'">
            <div class="flex items-center gap-2 mb-3"><span :class="activeAlarm.sev === 'critical' ? 'text-status-critical' : 'text-status-warning'">◆</span><span class="font-mono text-xs font-bold">{{ activeAlarm.t }}</span><span class="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" :class="activeAlarm.sev === 'critical' ? 'bg-status-critical' : 'bg-status-warning'">{{ activeAlarm.sev === 'critical' ? 'CRITICAL' : 'WARNING' }}</span></div>
            <h3 class="text-base font-bold mb-2 leading-tight">{{ activeAlarm.title }}</h3>
            <p class="text-xs text-gray-500 leading-relaxed mb-4">{{ activeAlarm.desc }}</p>
            <button class="w-full py-2 bg-brand text-white text-xs font-bold rounded-md shadow-sm hover:brightness-110 transition-all" @click="handleTrace">Trace Root Cause →</button>
          </div>
          <div class="bg-bg-card border border-border p-5 rounded-lg shadow-sm">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Correlation Map</div>
            <div class="space-y-0"><div v-for="(step, i) in [ { k: 'Metric', v: 'rds.query latency, http 5xx', s: 'met' }, { k: 'SLI', v: 'Availability SLI 99.91%', s: 'violation' }, { k: 'SLA', v: 'Monthly Avail 99.95%', s: 'violation' }, { k: 'Budget', v: '21.6m left · 70% consumed', s: 'violation' } ]" :key="i"><div class="flex items-center gap-3"><span class="w-16 text-[9px] font-bold text-gray-400 uppercase">{{ step.k }}</span><span class="text-xs font-bold" :class="step.s === 'violation' ? 'text-status-critical' : 'text-text-primary'">{{ step.v }}</span></div><div v-if="i < 3" class="h-4 ml-8 border-l border-border border-dashed my-1"></div></div></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
