<script setup lang="ts" generic="T extends { id: string; idx: number; sev: 'critical' | 'warning' }">
import { computed } from 'vue';

const props = defineProps<{
  series: number[];
  domain: [number, number];
  target?: number;
  targetLabel?: string;
  color: string;
  height?: number;
  alarms?: T[];
  breachFrom?: number;
  activeIdx?: number;
}>();

const emit = defineEmits<{
  (e: 'alarmClick', alarm: T): void;
}>();

const W = 760;
const H = computed(() => props.height || 120);
const padL = 8, padR = 8, padT = 14, padB = 18;

const n = computed(() => props.series.length);
const lo = computed(() => props.domain[0]);
const hi = computed(() => props.domain[1]);

const getX = (i: number) => padL + (i / (n.value - 1)) * (W - padL - padR);
const getY = (v: number) => padT + (1 - (v - lo.value) / (hi.value - lo.value)) * (H.value - padT - padB);

const path = computed(() => {
  return props.series
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(v).toFixed(1)}`)
    .join(' ');
});

const area = computed(() => {
  if (n.value === 0) return '';
  return `${path.value} L${getX(n.value - 1).toFixed(1)},${(H.value - padB).toFixed(1)} L${getX(0).toFixed(1)},${(H.value - padB).toFixed(1)} Z`;
});

const targetY = computed(() => (props.target != null ? getY(props.target) : null));
const gid = computed(() => 'g' + Math.round((props.color || '').length + lo.value + hi.value));
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" width="100%" :height="H" preserveAspectRatio="none" class="block">
    <defs>
      <linearGradient :id="gid" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.16" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Breach area -->
    <rect
      v-if="breachFrom != null"
      :x="getX(breachFrom)"
      :y="padT"
      :width="W - padR - getX(breachFrom)"
      :height="H - padT - padB"
      class="fill-status-critical opacity-[0.06]"
    />

    <!-- Target line -->
    <template v-if="targetY != null">
      <line :x1="padL" :x2="W - padR" :y1="targetY" :y2="targetY" class="stroke-gray-300" stroke-width="1" stroke-dasharray="4 3" opacity="0.7" />
      <text :x="W - padR" :y="targetY - 4" text-anchor="end" font-size="9.5" class="fill-gray-400 font-mono">{{ targetLabel }}</text>
    </template>

    <!-- Area & Line -->
    <path :d="area" :fill="`url(#${gid})`" />
    <path :d="path" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

    <!-- Alarm markers -->
    <g v-for="a in alarms" :key="a.id" class="cursor-pointer" @click="emit('alarmClick', a)">
      <line :x1="getX(a.idx)" :x2="getX(a.idx)" :y1="padT" :y2="H - padB" :class="{ 'stroke-status-critical': a.sev === 'critical', 'stroke-status-warning': a.sev === 'warning', 'stroke-width-2 opacity-90': activeIdx === a.idx, 'stroke-width-1 opacity-50': activeIdx !== a.idx }" stroke-dasharray="2 2" />
      <circle :cx="getX(a.idx)" :cy="getY(series[a.idx])" :r="activeIdx === a.idx ? 5 : 4" :class="{ 'fill-status-critical': a.sev === 'critical', 'fill-status-warning': a.sev === 'warning' }" stroke="white" stroke-width="1.5" />
    </g>

    <!-- Last point -->
    <circle v-if="series.length > 0" :cx="getX(n - 1)" :cy="getY(series[n - 1])" r="3" :fill="color" stroke="white" stroke-width="1.5" />
  </svg>
</template>
