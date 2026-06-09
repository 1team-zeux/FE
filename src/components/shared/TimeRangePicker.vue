<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

export type TimeRange = '5m' | '15m' | '30m' | '1h' | '3h' | '6h' | '12h' | '24h' | '2d' | '7d';

const props = defineProps<{ modelValue: TimeRange }>();
const emit  = defineEmits<{ (e: 'update:modelValue', val: TimeRange): void }>();

const open      = ref(false);
const rootEl    = ref<HTMLElement | null>(null);

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '5m',  label: 'Last 5 minutes'  },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '30m', label: 'Last 30 minutes' },
  { value: '1h',  label: 'Last 1 hour'     },
  { value: '3h',  label: 'Last 3 hours'    },
  { value: '6h',  label: 'Last 6 hours'    },
  { value: '12h', label: 'Last 12 hours'   },
  { value: '24h', label: 'Last 24 hours'   },
  { value: '2d',  label: 'Last 2 days'     },
  { value: '7d',  label: 'Last 7 days'     },
];

const currentLabel = computed(() => RANGES.find(r => r.value === props.modelValue)?.label ?? props.modelValue);

function select(val: TimeRange) {
  emit('update:modelValue', val);
  open.value = false;
}

function onDocClick(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node))
    open.value = false;
}

onMounted(()   => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <div ref="rootEl" class="relative">
    <!-- Trigger button -->
    <button
      class="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-white text-sm font-bold hover:border-gray-400 transition-colors"
      :class="open ? 'border-brand text-brand' : 'text-text-primary'"
      @click.stop="open = !open"
    >
      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke-width="2"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2"/>
      </svg>
      <span>{{ currentLabel }}</span>
      <svg class="w-3 h-3 shrink-0 transition-transform" :class="open ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>

    <!-- Dropdown panel -->
    <div
      v-if="open"
      class="absolute left-0 top-full mt-1 z-50 bg-white border border-border rounded-lg shadow-xl overflow-hidden"
      style="min-width: 200px"
    >
      <div class="px-3 py-2 border-b border-border bg-gray-50">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick ranges</span>
      </div>
      <div class="py-1">
        <button
          v-for="r in RANGES" :key="r.value"
          class="w-full text-left px-4 py-2 text-sm transition-colors"
          :class="modelValue === r.value
            ? 'bg-brand/10 text-brand font-bold'
            : 'text-text-primary hover:bg-gray-50'"
          @click.stop="select(r.value)"
        >{{ r.label }}</button>
      </div>
    </div>
  </div>
</template>
