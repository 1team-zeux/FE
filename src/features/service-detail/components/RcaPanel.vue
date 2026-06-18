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

const timelineIcon = (type: string) => ({
  detection: '🔍',
  metric:    '📉',
  trace:     '🔗',
  rca:       '🤖',
  action:    '⚡',
}[type] ?? '•');

const probabilityColor = (p: number) => {
  if (p >= 70) return 'bg-status-critical';
  if (p >= 40) return 'bg-status-warning';
  return 'bg-gray-300';
};

const probabilityTextColor = (p: number) => {
  if (p >= 70) return 'text-status-critical';
  if (p >= 40) return 'text-status-warning';
  return 'text-gray-400';
};

const rankBadgeColor = (rank: number) => {
  if (rank === 1) return 'bg-status-critical/10 text-status-critical border-status-critical/30';
  if (rank === 2) return 'bg-status-warning/10 text-status-warning border-status-warning/30';
  return 'bg-gray-100 text-gray-500 border-border';
};
</script>
<template>
  <div class="space-y-6">

    <!-- ══════════════════════════════════════════════════════
         INCIDENT BRIEF — 인시던트 요약 보고서
    ══════════════════════════════════════════════════════ -->
    <div class="bg-bg-card border-2 rounded-xl overflow-hidden shadow-sm"
      :class="incident.severity === 'critical' ? 'border-status-critical' : 'border-status-warning'"
    >
      <!-- Header: 심각도 + ID + 상태 -->
      <div class="px-6 py-4 flex items-center gap-4"
        :class="incident.severity === 'critical' ? 'bg-status-critical/8' : 'bg-status-warning/8'"
      >
        <div class="shrink-0 text-center">
          <div class="text-3xl font-black" :class="incident.severity === 'critical' ? 'text-status-critical' : 'text-status-warning'">P1</div>
          <div class="text-xs font-bold uppercase" :class="incident.severity === 'critical' ? 'text-status-critical' : 'text-status-warning'">CRITICAL</div>
        </div>
        <div class="w-px self-stretch bg-border mx-1" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span class="text-sm font-mono font-bold text-gray-500">{{ incident.incidentId }}</span>
            <span v-if="!incident.resolvedAt"
              class="text-xs font-bold px-2 py-0.5 rounded-full bg-status-critical text-white animate-pulse"
            >● 진행 중</span>
            <span v-else
              class="text-xs font-bold px-2 py-0.5 rounded-full bg-status-ok/20 text-status-ok border border-status-ok/30"
            >✓ 해소됨</span>
          </div>
          <h2 class="text-lg font-bold text-text-primary leading-tight">{{ incident.title }}</h2>
          <div class="text-sm text-gray-400 font-mono mt-0.5">감지: {{ incident.detectedAt }}</div>
        </div>
      </div>

      <!-- Impact metrics grid -->
      <div class="grid divide-x divide-border" :style="{ gridTemplateColumns: `repeat(${incident.symptoms.length}, 1fr)` }">
        <div v-for="(s, i) in incident.symptoms" :key="i" class="px-5 py-4 bg-white">
          <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">{{ s.metric }}</div>
          <div class="flex items-baseline gap-2 flex-wrap">
            <span class="text-xl font-black font-mono text-status-critical">{{ s.to }}</span>
            <span class="text-sm text-gray-400">← {{ s.from }}</span>
          </div>
        </div>
      </div>

      <!-- Why it happened: AI narrative -->
      <div v-if="incident.summary" class="px-6 py-4 border-t border-border bg-gray-50/60">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
            <span class="text-brand text-xs font-bold">AI</span>
          </div>
          <span class="text-sm font-bold text-brand uppercase tracking-widest">발생 원인 요약</span>
        </div>
        <p class="text-base text-text-primary leading-relaxed">{{ incident.summary }}</p>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════
         ROOT CAUSE CANDIDATES — AI 원인 분석
    ══════════════════════════════════════════════════════ -->
    <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="bg-gray-50 border-b border-border px-5 py-3 flex items-center justify-between">
        <span class="text-sm font-bold text-text-primary">🤖 AI 분석 — 근본 원인 후보</span>
        <span class="text-sm text-gray-400">신뢰도 순 정렬</span>
      </div>
      <div class="divide-y divide-border">
        <div v-for="cand in incident.candidates" :key="cand.rank" class="p-5">
          <!-- Candidate header row -->
          <div
            class="flex items-start gap-3 mb-3 cursor-pointer select-none"
            @click="expandedRank = expandedRank === cand.rank ? null : cand.rank"
          >
            <span class="text-sm font-bold px-2.5 py-1 rounded border shrink-0" :class="rankBadgeColor(cand.rank)">{{ cand.rank }}위</span>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-base text-text-primary mb-2">{{ cand.description }}</div>
              <!-- Probability bar -->
              <div class="flex items-center gap-3">
                <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="probabilityColor(cand.probability)"
                    :style="{ width: `${cand.probability}%` }"
                  ></div>
                </div>
                <span class="text-base font-bold w-12 text-right shrink-0 font-mono" :class="probabilityTextColor(cand.probability)">
                  {{ cand.probability }}%
                </span>
              </div>
            </div>
            <span class="text-gray-400 text-sm shrink-0 mt-1 ml-1">{{ expandedRank === cand.rank ? '▲' : '▼' }}</span>
          </div>

          <!-- Expanded detail -->
          <div v-if="expandedRank === cand.rank" class="ml-16 space-y-4">
            <!-- Evidence -->
            <div>
              <div class="text-sm font-bold text-gray-500 mb-2">📋 증거</div>
              <ul class="space-y-2">
                <li v-for="(ev, i) in cand.evidence" :key="i" class="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                  <span class="text-brand font-bold shrink-0 mt-0.5">›</span>
                  <span>{{ ev }}</span>
                </li>
              </ul>
            </div>
            <!-- Recommended Actions -->
            <div class="bg-brand/5 border border-brand/20 rounded-lg p-4">
              <div class="text-sm font-bold text-brand mb-3">🔧 조치 권고</div>
              <ul class="space-y-2">
                <li v-for="(action, i) in cand.recommendedActions" :key="i" class="flex items-start gap-2.5 text-sm text-text-primary leading-relaxed">
                  <span class="shrink-0 w-5 h-5 rounded-full bg-brand/20 text-brand text-xs font-bold flex items-center justify-center mt-0.5">{{ i + 1 }}</span>
                  <span>{{ action }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════
         INCIDENT TIMELINE — 수직 타임라인
    ══════════════════════════════════════════════════════ -->
    <div class="bg-bg-card border border-border rounded-xl p-5">
      <div class="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">인시던트 타임라인</div>
      <div class="space-y-0">
        <div v-for="(evt, i) in incident.timeline" :key="i" class="flex items-start gap-3">
          <!-- Timeline spine -->
          <div class="flex flex-col items-center shrink-0 w-4">
            <div
              class="w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 shrink-0"
              :style="{ backgroundColor: timelineColor(evt.type) }"
            ></div>
            <div v-if="i < incident.timeline.length - 1" class="w-px bg-border flex-1 min-h-[24px]"></div>
          </div>
          <!-- Event content -->
          <div class="pb-4 flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-0.5">
              <span class="text-base">{{ timelineIcon(evt.type) }}</span>
              <span class="text-xs font-mono text-gray-400">{{ evt.ts }}</span>
            </div>
            <div class="text-sm text-text-primary leading-relaxed">{{ evt.event }}</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
