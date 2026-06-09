<script setup lang="ts">
import { computed } from 'vue';
import type { Sli } from '../types/metrics.schema';

const props = defineProps<{ slis: Sli[] }>();

const SIGNALS = [
  { id: 'avail',      label: 'Availability' },
  { id: 'latency',    label: 'Latency P95'  },
  { id: 'error_rate', label: 'Error Rate'   },
  { id: 'traffic',    label: 'Traffic'      },
] as const;

const cards = computed(() =>
  SIGNALS.map(sig => ({
    ...sig,
    sli: props.slis.find(s => s.id === sig.id),
  }))
);

function borderClass(state?: string) {
  if (state === 'violation') return 'border-t-status-critical';
  if (state === 'warning')   return 'border-t-status-warning';
  return 'border-t-status-ok';
}

function valueClass(state?: string) {
  if (state === 'violation') return 'text-status-critical';
  if (state === 'warning')   return 'text-status-warning';
  return 'text-status-ok';
}
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div
      v-for="card in cards" :key="card.id"
      class="bg-bg-card border border-border border-t-4 rounded-lg p-5"
      :class="borderClass(card.sli?.state)"
    >
      <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">{{ card.label }}</div>
      <template v-if="card.sli">
        <div class="text-3xl font-bold tabular-nums leading-none" :class="valueClass(card.sli.state)">
          {{ card.sli.series.at(-1) }}<span class="text-lg">{{ card.sli.unit }}</span>
        </div>
        <div v-if="card.sli.target" class="text-[10px] text-gray-400 mt-2">
          목표 {{ card.sli.target }}{{ card.sli.unit }}
        </div>
        <div class="mt-3 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1" :class="valueClass(card.sli.state)">
          <span v-if="card.sli.state === 'violation'">● Violation</span>
          <span v-else-if="card.sli.state === 'warning'">● Warning</span>
          <span v-else>● Normal</span>
        </div>
      </template>
      <div v-else class="text-2xl font-bold text-gray-300">—</div>
    </div>
  </div>
</template>
