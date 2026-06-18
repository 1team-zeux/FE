<script setup lang="ts">
import { computed } from 'vue';
import LineChart from '@/components/shared/LineChart.vue';
import type { MetricTimeseries } from '../fixtures/billing-context';

const props = defineProps<{ metric: MetricTimeseries }>();

// y축 도메인 — 0 ~ current의 1.2배
const domain = computed<[number, number]>(() => {
  const max = Math.max(props.metric.current, props.metric.baseline * 2);
  return [0, Number((max * 1.2).toFixed(3))];
});

// 알람 마커 (1개)
const alarms = computed(() =>
  props.metric.alarmIdx != null
    ? [{ id: 'alm-' + props.metric.name, idx: props.metric.alarmIdx, sev: 'critical' as const }]
    : [],
);

// 편차 강도 → 색상
const deviationColor = (ratio: number) =>
  ratio >= 5 ? 'text-status-critical' : ratio >= 2 ? 'text-status-warning' : 'text-gray-500';
</script>

<template>
  <div class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm">
    <!-- 헤더: 라벨 + 편차 -->
    <div class="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="font-mono text-sm font-bold text-text-primary">{{ metric.label }}</div>
        <div class="text-xs text-gray-500 mt-0.5">
          현재 <span class="font-bold text-status-critical">{{ metric.current }}</span>
          <span class="text-gray-400 ml-1">/ baseline {{ metric.baseline }}</span>
          <span class="text-gray-400 ml-1">{{ metric.unit }}</span>
        </div>
      </div>
      <div class="text-right shrink-0">
        <div class="text-xs text-gray-400 font-semibold uppercase tracking-wider">편차</div>
        <div class="text-lg font-bold font-mono" :class="deviationColor(metric.deviationRatio)">
          {{ metric.deviationRatio }}×
        </div>
      </div>
    </div>

    <!-- 시계열 차트 -->
    <div class="p-2">
      <LineChart
        :series="metric.series"
        :domain="domain"
        :target="metric.baseline"
        target-label="baseline"
        color="var(--color-status-critical)"
        :height="140"
        :alarms="alarms"
        :breach-from="metric.breachFrom"
      />
      <div class="flex justify-between text-xs text-gray-400 px-2 pt-1">
        <span>30분 전</span>
        <span>알람 발생 (02:17)</span>
      </div>
    </div>
  </div>
</template>
