<script setup lang="ts">
import { computed } from 'vue';
import type { Sli } from '../types/metrics.schema';

const props = defineProps<{ slis: Sli[] }>();

const PREFERRED_ORDER = ['availability', 'latency', 'error_rate', 'asr', 'ttft', 'traffic'];

const cards = computed(() => {
  const ordered = PREFERRED_ORDER.map(id => props.slis.find(s => s.id === id)).filter(Boolean) as Sli[];
  const rest = props.slis.filter(s => !PREFERRED_ORDER.includes(s.id));
  return [...ordered, ...rest];
});

function stateColor(state?: string) {
  if (state === 'violation') return { text: 'text-status-critical', bg: 'bg-status-critical', border: 'border-status-critical', light: 'bg-red-50' };
  if (state === 'warning')   return { text: 'text-status-warning',  bg: 'bg-status-warning',  border: 'border-status-warning',  light: 'bg-amber-50' };
  return                            { text: 'text-status-ok',       bg: 'bg-status-ok',       border: 'border-status-ok',       light: 'bg-emerald-50' };
}

function stateLabel(state?: string) {
  if (state === 'violation') return 'VIOLATION';
  if (state === 'warning')   return 'WARNING';
  return 'NORMAL';
}

function cur(sli: Sli): string {
  const v = sli.series.at(-1) ?? 0;
  return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
}

function trend(sli: Sli): 'up' | 'down' | 'flat' {
  const a = sli.series.at(-1) ?? 0;
  const b = sli.series.at(-2) ?? 0;
  const d = a - b;
  if (Math.abs(d) < 0.01) return 'flat';
  return d > 0 ? 'up' : 'down';
}

function sparkPath(series: number[], domain: [number, number], w = 120, h = 36): string {
  if (series.length < 2) return '';
  const [lo, hi] = domain;
  const range = hi - lo || 1;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = h - ((v - lo) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return 'M' + pts.join('L');
}

function budgetPct(sli: Sli): number | null {
  if (sli.id !== 'availability' || !sli.target) return null;
  const cur = sli.series.at(-1) ?? 0;
  const budget = 100 - sli.target;
  if (budget <= 0) return null;
  const consumed = sli.target - cur;
  return Math.max(0, Math.min(100, (consumed / budget) * 100));
}
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div
      v-for="sli in cards" :key="sli.id"
      class="relative bg-bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md"
    >
      <!-- Top accent bar -->
      <div class="h-1 w-full" :class="stateColor(sli.state).bg" />

      <div class="p-4">
        <!-- Label row -->
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-bold text-text-muted uppercase tracking-widest">{{ sli.name }}</span>
          <!-- State badge -->
          <span
            class="flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full"
            :class="[stateColor(sli.state).light, stateColor(sli.state).text]"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="[stateColor(sli.state).bg, sli.state !== 'met' ? 'animate-pulse' : '']"
            />
            {{ stateLabel(sli.state) }}
          </span>
        </div>

        <!-- Current value -->
        <div class="flex items-end gap-1 mb-1">
          <span
            class="text-3xl font-bold font-mono leading-none tabular-nums transition-all duration-300"
            :class="stateColor(sli.state).text"
          >{{ cur(sli) }}</span>
          <span class="text-sm text-text-muted font-medium mb-0.5">{{ sli.unit }}</span>
          <!-- Trend arrow -->
          <span
            class="ml-auto text-xs font-bold mb-0.5"
            :class="{
              [stateColor(sli.state).text]: trend(sli) !== 'flat',
              'text-text-muted': trend(sli) === 'flat',
            }"
          >
            <span v-if="trend(sli) === 'up'">↑</span>
            <span v-else-if="trend(sli) === 'down'">↓</span>
            <span v-else>—</span>
          </span>
        </div>

        <!-- Target -->
        <div v-if="sli.target" class="text-sm text-text-muted mb-2">
          목표 <span class="font-mono font-bold">{{ sli.targetLabel ?? sli.target }}{{ sli.unit }}</span>
        </div>

        <!-- Error budget mini-bar (availability only) -->
        <div v-if="budgetPct(sli) !== null" class="mb-2">
          <div class="flex justify-between text-xs text-text-muted mb-0.5">
            <span>Error Budget 소진</span>
            <span class="font-mono font-bold" :class="(budgetPct(sli) ?? 0) > 80 ? 'text-status-critical' : (budgetPct(sli) ?? 0) > 50 ? 'text-status-warning' : 'text-status-ok'">
              {{ (budgetPct(sli) ?? 0).toFixed(0) }}%
            </span>
          </div>
          <div class="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="(budgetPct(sli) ?? 0) > 80 ? 'bg-status-critical' : (budgetPct(sli) ?? 0) > 50 ? 'bg-status-warning' : 'bg-status-ok'"
              :style="{ width: `${budgetPct(sli)}%` }"
            />
          </div>
        </div>

        <!-- Sparkline -->
        <div class="mt-2 -mx-1">
          <svg viewBox="0 0 120 36" class="w-full" style="height:36px" preserveAspectRatio="none">
            <!-- fill area -->
            <defs>
              <linearGradient :id="`fill-${sli.id}`" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" :stop-color="sli.state === 'violation' ? 'var(--color-status-critical)' : sli.state === 'warning' ? 'var(--color-status-warning)' : 'var(--color-status-ok)'" stop-opacity="0.18" />
                <stop offset="100%" :stop-color="sli.state === 'violation' ? 'var(--color-status-critical)' : sli.state === 'warning' ? 'var(--color-status-warning)' : 'var(--color-status-ok)'" stop-opacity="0.01" />
              </linearGradient>
            </defs>
            <path
              v-if="sli.series.length >= 2"
              :d="sparkPath(sli.series, sli.domain) + `L120,36 L0,36 Z`"
              :fill="`url(#fill-${sli.id})`"
            />
            <path
              v-if="sli.series.length >= 2"
              :d="sparkPath(sli.series, sli.domain)"
              fill="none"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              :stroke="sli.state === 'violation' ? 'var(--color-status-critical)' : sli.state === 'warning' ? 'var(--color-status-warning)' : 'var(--color-status-ok)'"
            />
            <!-- Current value dot -->
            <circle
              v-if="sli.series.length >= 1"
              :cx="120"
              :cy="36 - ((( sli.series.at(-1)! - sli.domain[0]) / (sli.domain[1] - sli.domain[0] || 1)) * 36)"
              r="2.5"
              :fill="sli.state === 'violation' ? 'var(--color-status-critical)' : sli.state === 'warning' ? 'var(--color-status-warning)' : 'var(--color-status-ok)'"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
