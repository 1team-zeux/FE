<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { ArrivingAlarm, ServiceMapData, TriggerAlarm } from '../fixtures/triage-blueprints';
import ServiceMap from '@/features/sla/components/ServiceMap.vue';

const props = defineProps<{
  trigger: TriggerAlarm;
  severityStrategy: string;
  windowDurationLabel: string;
  arrivingAlarms: ArrivingAlarm[];
  representativeSeverity: 'critical' | 'warning' | 'info';
  groupConfirmed: boolean;
  elapsedDisplayMs: number;
  step1DisplayMs: number;
  isActive: boolean;
  serviceMap: ServiceMapData;
}>();

// 누적 표시 시간 윈도우 내 capped
const cappedElapsedMs = computed(() => Math.min(props.elapsedDisplayMs, props.step1DisplayMs));

const formatMs = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}초`;
  return `${min}분 ${sec}초`;
};
const elapsedLabel = computed(() => formatMs(cappedElapsedMs.value));

const progress = computed(() => Math.min(1, cappedElapsedMs.value / Math.max(1, props.step1DisplayMs)));

// 총 알람 카운트 — 트리거 1 + 추가
const totalAlarmCount = computed(() => 1 + props.arrivingAlarms.length);

// severity 배지
const severityBadge = (sev: 'critical' | 'warning' | 'info'): string => {
  if (sev === 'critical') return 'bg-status-critical text-white border-status-critical';
  if (sev === 'warning')  return 'bg-status-warning text-white border-status-warning';
  return 'bg-emerald-500 text-white border-emerald-500';
};

// 자동 스크롤
const scrollEl = ref<HTMLElement | null>(null);
watch(
  () => props.arrivingAlarms.length,
  async () => {
    await nextTick();
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
  },
);

// 대표 severity 라벨
const repSeverityLabel = computed(() => {
  if (props.representativeSeverity === 'critical') return 'CRITICAL';
  if (props.representativeSeverity === 'warning')  return 'WARNING';
  return 'INFO';
});
</script>

<template>
  <div class="rounded-xl border border-border bg-bg-elev shadow-sm overflow-hidden">
    <!-- 헤더 -->
    <div class="px-4 py-3 border-b border-border bg-bg-card">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span
            class="w-2.5 h-2.5 rounded-full"
            :class="isActive ? 'bg-brand animate-pulse' : groupConfirmed ? 'bg-emerald-500' : 'bg-gray-300'"
          />
          <span class="text-sm font-semibold text-text-primary">
            {{ isActive ? '알람 수신 & 그룹화 중' : groupConfirmed ? '그룹 확정' : '대기' }}
          </span>
          <span class="text-xs text-gray-500 ml-1">· 총 {{ totalAlarmCount }}건</span>
        </div>
        <div class="text-xs text-gray-500 flex items-center gap-2">
          <span>윈도우</span>
          <span class="font-mono font-bold text-text-primary text-sm">{{ elapsedLabel }}</span>
        </div>
      </div>

      <!-- 진행 바 -->
      <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div class="h-full bg-brand transition-all duration-200" :style="{ width: `${progress * 100}%` }" />
      </div>

      <!-- severity 전략 -->
      <div class="text-xs text-gray-600 font-mono">{{ severityStrategy }}</div>
    </div>

    <!-- 본문 — 2열 (좌: 알람 그룹화 흐름 / 우: 서비스 맵) -->
    <div class="px-4 py-3 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-bg-card/40">
      <!-- 좌측: 알람 그룹화 흐름 -->
      <div class="space-y-3">
        <!-- 트리거 알람 강조 박스 -->
        <div class="border-2 border-rose-300 bg-rose-50 rounded-lg p-3">
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <span class="px-2 py-0.5 text-xs font-bold rounded bg-rose-600 text-white">TRIGGER</span>
            <span class="px-2 py-0.5 text-xs font-bold rounded border" :class="severityBadge(trigger.severity)">
              {{ trigger.severity === 'critical' ? 'CRITICAL' : trigger.severity === 'warning' ? 'WARNING' : 'INFO' }}
            </span>
            <span class="font-mono text-xs text-gray-500">{{ trigger.ts }}</span>
            <span class="font-mono text-xs text-rose-700 bg-white border border-rose-200 rounded px-2 py-0.5 font-bold">{{ trigger.alertName }}</span>
          </div>
          <div class="text-sm font-semibold text-text-primary mb-1">{{ trigger.serviceName }}</div>
          <div class="text-sm text-text-primary mb-2">{{ trigger.message }}</div>
          <div v-if="trigger.metric" class="text-xs font-mono text-gray-600 bg-white/60 border border-rose-200 rounded px-2 py-1">
            <span class="text-gray-500">metric</span>=<span class="text-text-primary font-bold">{{ trigger.metric }}</span>
            <span v-if="trigger.threshold != null"> · <span class="text-gray-500">threshold</span>=<span class="text-text-primary font-bold">{{ trigger.threshold }}{{ trigger.unit ?? '' }}</span></span>
            <span v-if="trigger.currentValue != null"> · <span class="text-gray-500">current</span>=<span class="text-rose-700 font-bold">{{ trigger.currentValue }}{{ trigger.unit ?? '' }}</span></span>
          </div>
        </div>

        <!-- 윈도우 라벨 -->
        <div class="flex items-center gap-2 text-xs text-gray-600">
          <span class="font-bold text-text-primary">{{ windowDurationLabel }}</span>
          <span>— 같은 서비스 알람을 같은 그룹으로 합치는 중</span>
        </div>

        <!-- 추가 알람 ticker -->
        <div ref="scrollEl" class="max-h-72 overflow-y-auto space-y-2 pl-2 border-l-2 border-gray-200">
          <div v-if="arrivingAlarms.length === 0 && isActive" class="text-xs text-gray-500 italic py-1">
            추가 알람 대기 중…
          </div>
          <div
            v-for="(a, i) in arrivingAlarms"
            :key="`${a.ts}-${i}`"
            class="border border-border rounded-md p-2 bg-bg-card"
          >
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="px-2 py-0.5 text-xs font-bold rounded border" :class="severityBadge(a.severity)">
                {{ a.severity === 'critical' ? 'CRITICAL' : a.severity === 'warning' ? 'WARNING' : 'INFO' }}
              </span>
              <span class="font-mono text-xs text-gray-500">{{ a.ts }}</span>
              <span class="font-mono text-xs text-gray-700 bg-bg-elev border border-border rounded px-1.5 py-0.5 font-bold">{{ a.alertName }}</span>
            </div>
            <div class="text-sm text-text-primary mb-1">{{ a.message }}</div>
            <div v-if="a.metric" class="text-xs font-mono text-gray-600">
              <span class="text-gray-500">metric</span>=<span class="text-text-primary">{{ a.metric }}</span>
              <span v-if="a.threshold != null"> · <span class="text-gray-500">threshold</span>=<span class="text-text-primary">{{ a.threshold }}{{ a.unit ?? '' }}</span></span>
              <span v-if="a.currentValue != null"> · <span class="text-gray-500">current</span>=<span class="text-rose-700 font-bold">{{ a.currentValue }}{{ a.unit ?? '' }}</span></span>
            </div>
          </div>
          <div v-if="isActive && arrivingAlarms.length > 0" class="flex items-center gap-2 text-xs text-gray-500 pt-1">
            <span class="inline-block w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
            다음 알람 대기 중…
          </div>
        </div>

        <!-- 그룹 확정 박스 -->
        <div
          v-if="groupConfirmed"
          class="border-2 rounded-lg p-3 bg-emerald-50 border-emerald-400"
        >
          <div class="flex items-center gap-2">
            <span class="text-emerald-700 font-bold text-sm">✓ 알람 {{ totalAlarmCount }}건 그룹 확정</span>
            <span class="px-2 py-0.5 text-xs font-bold rounded border" :class="severityBadge(representativeSeverity)">
              대표 {{ repSeverityLabel }}
            </span>
          </div>
        </div>
      </div>

      <!-- 우측: 영향 인프라 서비스 맵 -->
      <div>
        <ServiceMap :map="serviceMap" />
      </div>
    </div>
  </div>
</template>
