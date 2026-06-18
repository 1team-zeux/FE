<script setup lang="ts">
import { computed } from 'vue';
import LineChart from '@/components/shared/LineChart.vue';
import type { InfraSnapshot } from '../fixtures/billing-context';

const props = defineProps<{ timeline: InfraSnapshot[] }>();

// RDS connection 시계열 추출
const rdsSeries = computed(() => props.timeline.map(s => s.rdsConnections));
const rdsDomain = computed<[number, number]>(() => {
  const max = Math.max(...props.timeline.map(s => s.rdsMax));
  return [0, max];
});

// 현재 시점 (마지막)
const latest = computed(() => props.timeline[props.timeline.length - 1]);
const rdsPct  = computed(() => Math.round((latest.value.rdsConnections / latest.value.rdsMax) * 100));

// ASG 인스턴스 상태 박스 (시각화)
const asgBoxes = computed(() => {
  const lastSnap = latest.value;
  const arr: Array<{ status: 'running' | 'interrupted' | 'replacing' }> = [];
  for (let i = 0; i < lastSnap.asgDesired; i++) {
    if (i < lastSnap.asgRunning) arr.push({ status: 'running' });
    else arr.push({ status: 'interrupted' });
  }
  return arr;
});

// Spot 이벤트 발생 인덱스 (알람 마커)
const spotAlarms = computed(() => {
  return props.timeline
    .map((s, idx) => ({ s, idx }))
    .filter(x => x.s.spotEvent === 'interrupted')
    .map(x => ({ id: `spot-${x.idx}`, idx: x.idx, sev: 'warning' as const }));
});
</script>

<template>
  <div class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm">
    <div class="px-4 py-3 border-b border-border bg-gray-50/50">
      <div class="text-sm font-bold text-text-primary">인프라 상태</div>
      <div class="text-xs text-gray-500 mt-0.5">RDS Connection · ASG 인스턴스 현황</div>
    </div>

    <!-- RDS Connection 시계열 -->
    <div class="p-4 border-b border-border">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs font-bold text-gray-600 uppercase tracking-wider">RDS connection</div>
        <div class="text-sm">
          <span class="font-bold font-mono" :class="rdsPct >= 80 ? 'text-status-critical' : rdsPct >= 60 ? 'text-status-warning' : 'text-status-ok'">
            {{ latest.rdsConnections }}/{{ latest.rdsMax }}
          </span>
          <span class="ml-2 text-xs text-gray-400">({{ rdsPct }}% 포화)</span>
        </div>
      </div>
      <LineChart
        :series="rdsSeries"
        :domain="rdsDomain"
        :target="latest.rdsMax * 0.8"
        target-label="80% 임계"
        color="var(--color-status-warning)"
        :height="120"
        :alarms="spotAlarms"
      />
    </div>

    <!-- ASG 인스턴스 시각화 -->
    <div class="p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-xs font-bold text-gray-600 uppercase tracking-wider">ASG 인스턴스</div>
        <div class="text-sm">
          <span class="font-bold font-mono" :class="latest.asgRunning < latest.asgDesired ? 'text-status-warning' : 'text-status-ok'">
            {{ latest.asgRunning }}/{{ latest.asgDesired }} running
          </span>
        </div>
      </div>
      <div class="flex gap-2">
        <div
          v-for="(box, i) in asgBoxes"
          :key="i"
          class="flex-1 h-16 rounded border-2 flex flex-col items-center justify-center text-xs font-bold"
          :class="box.status === 'running'
            ? 'border-status-ok/40 bg-emerald-50 text-emerald-700'
            : 'border-status-warning/40 bg-amber-50 text-amber-700 border-dashed'"
        >
          <span>{{ box.status === 'running' ? '●' : '⚠' }}</span>
          <span class="mt-1 text-xs">{{ box.status === 'running' ? 'i-' + (i + 1) : 'Spot 중단' }}</span>
        </div>
      </div>
      <div class="mt-3 text-xs text-gray-500">
        <span class="font-bold">02:14 KST</span> Spot 인스턴스 1건 중단 → 남은 인스턴스에 부하 집중
      </div>
    </div>
  </div>
</template>
