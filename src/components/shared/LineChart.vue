<script setup lang="ts" generic="T extends { id: string; idx: number; sev: 'critical' | 'warning' }">
import { computed, ref } from 'vue';

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
  hoverIdx?: number | null;
}>();

const emit = defineEmits<{
  (e: 'alarmClick', alarm: T): void;
  (e: 'hover', idx: number | null): void;
}>();

const W = 760;
const H = computed(() => props.height || 120);
const padL = 44, padR = 8, padT = 14, padB = 18;

const n  = computed(() => props.series.length);
const lo = computed(() => props.domain[0]);
const hi = computed(() => props.domain[1]);

const getX = (i: number) => padL + (i / (n.value - 1)) * (W - padL - padR);
const getY = (v: number) => padT + (1 - (v - lo.value) / (hi.value - lo.value)) * (H.value - padT - padB);

const path = computed(() =>
  props.series.map((v, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ')
);

const area = computed(() => {
  if (n.value === 0) return '';
  return `${path.value} L${getX(n.value - 1).toFixed(1)},${(H.value - padB).toFixed(1)} L${getX(0).toFixed(1)},${(H.value - padB).toFixed(1)} Z`;
});

const targetY = computed(() => (props.target != null ? getY(props.target) : null));
const gid = computed(() => 'g' + Math.round((props.color || '').length + lo.value + hi.value));

// Grid lines: 3 horizontal lines at 25%, 50%, 75% of range
const gridLines = computed(() => {
  const range = hi.value - lo.value;
  return [0.75, 0.5, 0.25].map(ratio => {
    const val = lo.value + range * ratio;
    return { y: getY(val), label: fmtVal(val) };
  });
});

function fmtVal(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 100)  return Math.round(v).toString();
  if (abs >= 10)   return v.toFixed(1);
  if (abs >= 1)    return v.toFixed(2);
  return v.toFixed(2);
}

// Hover sync
const svgEl = ref<SVGSVGElement | null>(null);
let rafId: number | null = null;

function onMouseMove(e: MouseEvent) {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    if (!svgEl.value || n.value < 2) return;
    const rect = svgEl.value.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const step = (W - padL - padR) / (n.value - 1);
    const idx = Math.round((relX - padL) / step);
    emit('hover', Math.max(0, Math.min(n.value - 1, idx)));
  });
}

function onMouseLeave() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  emit('hover', null);
}

const hoverX = computed(() => props.hoverIdx != null && n.value >= 2 ? getX(props.hoverIdx) : null);
const hoverValue = computed(() => props.hoverIdx != null ? props.series[props.hoverIdx] : null);
</script>

<template>
  <svg
    ref="svgEl"
    :viewBox="`0 0 ${W} ${H}`"
    width="100%"
    :height="H"
    preserveAspectRatio="none"
    class="block"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <defs>
      <linearGradient :id="gid" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.16" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Grid lines (before everything else) -->
    <g>
      <line
        v-for="(gl, i) in gridLines" :key="i"
        :x1="padL" :x2="W - padR" :y1="gl.y" :y2="gl.y"
        stroke="#E5E7EB" stroke-width="1"
      />
      <!-- Y-axis labels -->
      <text
        v-for="(gl, i) in gridLines" :key="`lbl-${i}`"
        :x="padL - 4" :y="gl.y + 3.5"
        text-anchor="end" font-size="11" fill="#9CA3AF"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >{{ gl.label }}</text>
      <!-- Y-axis top label (hi) -->
      <text
        :x="padL - 4" :y="padT + 3.5"
        text-anchor="end" font-size="11" fill="#9CA3AF"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >{{ fmtVal(hi) }}</text>
    </g>

    <!-- Breach area -->
    <rect
      v-if="breachFrom != null"
      :x="getX(breachFrom)" :y="padT"
      :width="W - padR - getX(breachFrom)" :height="H - padT - padB"
      class="fill-status-critical opacity-[0.06]"
    />

    <!-- Target line -->
    <template v-if="targetY != null">
      <line :x1="padL" :x2="W - padR" :y1="targetY" :y2="targetY" stroke="#D1D5DB" stroke-width="1" stroke-dasharray="4 3" opacity="0.9" />
      <text
        :x="W - padR" :y="targetY - 4"
        text-anchor="end" font-size="11" fill="#6B7280"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >{{ targetLabel }}</text>
    </template>

    <!-- Area & Line -->
    <path :d="area" :fill="`url(#${gid})`" />
    <path :d="path" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

    <!-- Alarm markers -->
    <g v-for="a in alarms" :key="a.id" class="cursor-pointer" @click="emit('alarmClick', a)">
      <line
        :x1="getX(a.idx)" :x2="getX(a.idx)" :y1="padT" :y2="H - padB"
        :stroke="a.sev === 'critical' ? 'var(--color-status-critical)' : 'var(--color-status-warning)'"
        :stroke-width="activeIdx === a.idx ? 2 : 1"
        :opacity="activeIdx === a.idx ? 0.9 : 0.5"
        stroke-dasharray="2 2"
      />
      <circle
        :cx="getX(a.idx)" :cy="getY(series[a.idx])"
        :r="activeIdx === a.idx ? 5 : 4"
        :fill="a.sev === 'critical' ? 'var(--color-status-critical)' : 'var(--color-status-warning)'"
        stroke="white" stroke-width="1.5"
      />
    </g>

    <!-- Last point -->
    <circle v-if="series.length > 0" :cx="getX(n - 1)" :cy="getY(series[n - 1])" r="3" :fill="color" stroke="white" stroke-width="1.5" />

    <!-- Hover guideline -->
    <template v-if="hoverX != null && hoverValue != null">
      <line :x1="hoverX" :x2="hoverX" :y1="padT" :y2="H - padB" stroke="#6B7280" stroke-width="1" stroke-dasharray="3 3" opacity="0.5" />
      <circle :cx="hoverX" :cy="getY(hoverValue)" r="4" :fill="color" stroke="white" stroke-width="2" />
      <rect
        :x="hoverX > W / 2 ? hoverX - 46 : hoverX + 4"
        :y="getY(hoverValue) - 19"
        width="42" height="15" rx="3"
        fill="#1F2937" opacity="0.85"
      />
      <text
        :x="hoverX > W / 2 ? hoverX - 25 : hoverX + 25"
        :y="getY(hoverValue) - 8"
        text-anchor="middle" font-size="11" fill="white"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', monospace"
      >{{ hoverValue }}</text>
    </template>
  </svg>
</template>
