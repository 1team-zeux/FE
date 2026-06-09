<script setup lang="ts">
import { ref } from 'vue';
import type { Incident } from '../types/incident.schema';

defineProps<{ incident: Incident }>();

const expandedRank = ref<number | null>(1);

const timelineColor = (type: string) => ({
  detection: 'var(--color-status-critical)',
  metric:    'var(--color-status-warning)',
  trace:     'var(--color-brand)',
  rca:       'var(--color-brand)',
  action:    'var(--color-status-ok)',
}[type] ?? 'var(--color-border)');

const probabilityColor = (p: number) => {
  if (p >= 70) return 'bg-status-critical';
  if (p >= 40) return 'bg-status-warning';
  return 'bg-gray-300';
};

const rankBadgeColor = (rank: number) => {
  if (rank === 1) return 'bg-status-critical/10 text-status-critical border-status-critical/20';
  if (rank === 2) return 'bg-status-warning/10 text-status-warning border-status-warning/20';
  return 'bg-gray-100 text-gray-500 border-border';
};
</script>
<template>
  <div class="space-y-6">
    <!-- Incident Header -->
    <div class="bg-bg-card border border-border rounded-lg overflow-hidden"
      :class="incident.severity === 'critical' ? 'border-t-4 border-t-status-critical' : 'border-t-4 border-t-status-warning'"
    >
      <div class="p-5">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded border"
            :class="incident.severity === 'critical' ? 'bg-status-critical/10 text-status-critical border-status-critical/20' : 'bg-status-warning/10 text-status-warning border-status-warning/20'"
          >{{ incident.incidentId }}</span>
          <span v-if="!incident.resolvedAt" class="text-[10px] font-bold px-2 py-0.5 rounded bg-status-critical/10 text-status-critical border border-status-critical/20 animate-pulse">진행 중</span>
          <span v-else class="text-[10px] font-bold px-2 py-0.5 rounded bg-status-ok/10 text-status-ok border border-status-ok/20">해소됨</span>
        </div>
        <h2 class="text-lg font-bold text-text-primary mb-3">{{ incident.title }}</h2>
        <div class="flex flex-wrap gap-4">
          <div>
            <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">감지 시각</div>
            <div class="font-mono text-sm font-bold">{{ incident.detectedAt }}</div>
          </div>
          <div class="border-l border-border pl-4">
            <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">이상 증상</div>
            <div class="flex flex-wrap gap-2">
              <span v-for="(s, i) in incident.symptoms" :key="i"
                class="text-[11px] px-2 py-0.5 bg-gray-100 rounded font-mono"
              >{{ s.metric }}: <span class="text-status-critical">{{ s.from }}</span> → <span class="font-bold">{{ s.to }}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RCA Timeline -->
    <div class="bg-bg-card border border-border rounded-lg p-5">
      <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Incident Timeline</div>
      <div class="relative">
        <!-- Horizontal line -->
        <div class="absolute top-4 left-0 right-0 h-px bg-border"></div>
        <div class="flex justify-between relative">
          <div v-for="(evt, i) in incident.timeline" :key="i" class="flex flex-col items-center" style="width: 20%">
            <div class="w-3 h-3 rounded-full border-2 border-white z-10 mb-2"
              :style="{ backgroundColor: timelineColor(evt.type) }"
            ></div>
            <div class="text-[10px] font-mono font-bold text-text-primary">{{ evt.ts }}</div>
            <div class="text-[9px] text-gray-400 text-center leading-tight mt-0.5 px-1">{{ evt.event }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Root Cause Candidates -->
    <div class="bg-bg-card border border-border rounded-lg overflow-hidden">
      <div class="bg-gray-50 border-b border-border px-5 py-3">
        <span class="text-xs font-bold">AI 분석 — 원인 후보</span>
      </div>
      <div class="divide-y divide-border">
        <div v-for="cand in incident.candidates" :key="cand.rank" class="p-5">
          <div class="flex items-start gap-3 mb-3 cursor-pointer" @click="expandedRank = expandedRank === cand.rank ? null : cand.rank">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5" :class="rankBadgeColor(cand.rank)">{{ cand.rank }}위</span>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm text-text-primary mb-2">{{ cand.description }}</div>
              <!-- Probability bar -->
              <div class="flex items-center gap-3">
                <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700" :class="probabilityColor(cand.probability)" :style="{ width: `${cand.probability}%` }"></div>
                </div>
                <span class="text-sm font-bold w-10 text-right shrink-0"
                  :class="cand.probability >= 70 ? 'text-status-critical' : cand.probability >= 40 ? 'text-status-warning' : 'text-gray-400'"
                >{{ cand.probability }}%</span>
              </div>
            </div>
            <span class="text-gray-400 text-xs shrink-0 mt-1">{{ expandedRank === cand.rank ? '▲' : '▼' }}</span>
          </div>

          <!-- Expanded: Evidence + Recommended Actions -->
          <div v-if="expandedRank === cand.rank" class="ml-10 space-y-4">
            <div>
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">증거</div>
              <ul class="space-y-1">
                <li v-for="(ev, i) in cand.evidence" :key="i" class="flex items-start gap-2 text-xs text-gray-600">
                  <span class="text-brand mt-0.5 shrink-0">•</span>{{ ev }}
                </li>
              </ul>
            </div>
            <div class="bg-brand/5 border border-brand/20 rounded-lg p-4">
              <div class="text-[10px] font-bold text-brand uppercase tracking-wider mb-2">Recommended Actions</div>
              <ul class="space-y-1.5">
                <li v-for="(action, i) in cand.recommendedActions" :key="i" class="flex items-start gap-2 text-xs text-text-primary">
                  <span class="text-brand font-bold shrink-0 mt-0.5">{{ i + 1 }}.</span>{{ action }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
