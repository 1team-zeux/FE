<script setup lang="ts">
import { computed } from 'vue';
import LineChart from '@/components/shared/LineChart.vue';
import type { SystemMetrics } from '../types/metrics.schema';

const props = defineProps<{
  metrics: SystemMetrics;
  hoverIdx?: number | null;
}>();

const emit = defineEmits<{ (e: 'hover', idx: number | null): void }>();

type MetricKey = 'cpu' | 'memory' | 'diskRead' | 'networkIn';

const CHARTS: {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  domain: [number, number];
  warn: number;
  crit: number;
  isPercent: boolean;
}[] = [
  { key: 'cpu',       label: 'CPU',        unit: '%',    color: 'var(--color-status-warning)', domain: [0, 100], warn: 60, crit: 80,  isPercent: true },
  { key: 'memory',    label: 'Memory',     unit: '%',    color: 'var(--color-brand)',           domain: [0, 100], warn: 70, crit: 85,  isPercent: true },
  { key: 'diskRead',  label: 'Disk Read',  unit: ' MB/s',color: '#8B5CF6',                     domain: [0, 150], warn: 80, crit: 120, isPercent: false },
  { key: 'networkIn', label: 'Network In', unit: ' MB/s',color: 'var(--color-status-ok)',       domain: [0, 250], warn: 150, crit: 200, isPercent: false },
];

function cur(key: MetricKey): number {
  const s = props.metrics[key];
  return s?.at(-1) ?? 0;
}

function prev(key: MetricKey): number {
  const s = props.metrics[key];
  return s?.at(-2) ?? 0;
}

function trend(key: MetricKey): 'up' | 'down' | 'flat' {
  const d = cur(key) - prev(key);
  if (Math.abs(d) < 0.5) return 'flat';
  return d > 0 ? 'up' : 'down';
}

function levelColor(key: MetricKey, warn: number, crit: number): string {
  const v = cur(key);
  if (v >= crit) return 'text-status-critical';
  if (v >= warn) return 'text-status-warning';
  return 'text-status-ok';
}

function barColor(key: MetricKey, warn: number, crit: number): string {
  const v = cur(key);
  if (v >= crit) return 'bg-status-critical';
  if (v >= warn) return 'bg-status-warning';
  return 'bg-status-ok';
}

function barWidth(key: MetricKey, domain: [number, number]): string {
  const pct = Math.min(100, Math.max(0, (cur(key) / domain[1]) * 100));
  return `${pct}%`;
}

const fmt = (v: number) => v >= 100 ? v.toFixed(0) : v.toFixed(1);
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <div
      v-for="c in CHARTS" :key="c.key"
      class="bg-bg-card border border-border rounded-xl overflow-hidden"
    >
      <!-- 헤더: 레이블 + 트렌드 + 현재값 -->
      <div class="px-4 pt-3 pb-2 flex items-start justify-between">
        <div>
          <div class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">
            Host Layer · {{ c.label }}
          </div>
          <div class="flex items-baseline gap-1.5">
            <span
              class="text-2xl font-bold font-mono transition-all duration-300"
              :class="levelColor(c.key, c.warn, c.crit)"
            >{{ fmt(cur(c.key)) }}</span>
            <span class="text-sm text-text-muted font-medium">{{ c.unit.trim() }}</span>
          </div>
        </div>

        <!-- 트렌드 배지 -->
        <div
          class="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold mt-0.5"
          :class="{
            'bg-red-50 text-status-critical':   trend(c.key) === 'up',
            'bg-green-50 text-status-ok':        trend(c.key) === 'down',
            'bg-gray-100 text-text-muted':       trend(c.key) === 'flat',
          }"
        >
          <span v-if="trend(c.key) === 'up'">↑</span>
          <span v-else-if="trend(c.key) === 'down'">↓</span>
          <span v-else>—</span>
          {{ Math.abs(cur(c.key) - prev(c.key)).toFixed(1) }}
        </div>
      </div>

      <!-- 게이지 바 -->
      <div class="px-4 pb-2">
        <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="barColor(c.key, c.warn, c.crit)"
            :style="{ width: barWidth(c.key, c.domain) }"
          />
        </div>
        <!-- 임계값 마커 -->
        <div class="relative mt-0.5 h-2" v-if="c.isPercent">
          <div
            class="absolute top-0 w-px h-2 bg-status-warning opacity-40"
            :style="{ left: `${(c.warn / c.domain[1]) * 100}%` }"
          />
          <div
            class="absolute top-0 w-px h-2 bg-status-critical opacity-40"
            :style="{ left: `${(c.crit / c.domain[1]) * 100}%` }"
          />
        </div>
      </div>

      <!-- 스파크라인 -->
      <LineChart
        :series="(metrics as any)[c.key] ?? []"
        :domain="c.domain"
        :color="c.color"
        :height="80"
        :hover-idx="props.hoverIdx"
        @hover="emit('hover', $event)"
      />
    </div>
  </div>
</template>
