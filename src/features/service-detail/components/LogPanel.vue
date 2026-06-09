<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { z } from 'zod';
import { logsMockData } from '@/services/mocks/data';

const props = defineProps<{ svcId: string }>();

const LogSchema = z.object({
  id: z.string(), timestamp: z.string(), level: z.enum(['ERROR','WARN','INFO']),
  message: z.string(), traceId: z.string().nullable(), container: z.string(),
});

const { data: logs, isLoading } = useQuery({
  queryKey: ['logs', props.svcId],
  queryFn: async () => {
    const raw = logsMockData[props.svcId] ?? logsMockData['subscription'];
    return z.array(LogSchema).parse(raw);
  },
});

type Level = 'ALL' | 'ERROR' | 'WARN' | 'INFO';
const levelFilter = ref<Level>('ALL');
const search = ref('');

const filtered = computed(() => {
  return (logs.value ?? []).filter(l => {
    const matchLevel = levelFilter.value === 'ALL' || l.level === levelFilter.value;
    const q = search.value.toLowerCase();
    const matchSearch = !q || l.message.toLowerCase().includes(q) || (l.traceId ?? '').includes(q) || l.container.includes(q);
    return matchLevel && matchSearch;
  });
});

const levelColor = (l: string) => ({
  ERROR: 'text-status-critical',
  WARN:  'text-status-warning',
  INFO:  'text-text-secondary',
}[l] ?? 'text-gray-400');

const levelBg = (l: string) => ({
  ERROR: 'bg-status-critical/10 border-status-critical/20',
  WARN:  'bg-status-warning/10 border-status-warning/20',
  INFO:  'bg-gray-100 border-border',
}[l] ?? 'bg-gray-100 border-border');
</script>
<template>
  <div class="space-y-4">
    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex gap-1">
        <button v-for="lv in ['ALL','ERROR','WARN','INFO'] as const" :key="lv"
          class="px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors"
          :class="levelFilter === lv ? 'bg-brand text-white' : 'bg-bg-card border border-border text-gray-500 hover:border-brand'"
          @click="levelFilter = lv"
        >{{ lv }}</button>
      </div>
      <input
        v-model="search"
        type="text"
        placeholder="trace_id, container, message 검색..."
        class="flex-1 min-w-48 text-xs px-3 py-1.5 border border-border rounded-md bg-bg-card focus:outline-none focus:border-brand"
      />
    </div>

    <div v-if="isLoading" class="h-48 bg-gray-100 animate-pulse rounded-lg"></div>
    <div v-else-if="filtered.length === 0" class="p-8 text-center text-sm text-gray-400 bg-bg-card border border-border rounded-lg">
      로그 없음
    </div>
    <div v-else class="bg-bg-card border border-border rounded-lg overflow-hidden font-mono">
      <div v-for="log in filtered" :key="log.id" class="flex gap-3 px-4 py-2.5 border-b border-border last:border-b-0 text-[11px] hover:bg-gray-50">
        <span class="text-gray-400 shrink-0 w-14">{{ log.timestamp }}</span>
        <span class="font-bold shrink-0 w-10 text-center px-1.5 py-0.5 rounded border text-[9px]" :class="levelBg(log.level)">
          <span :class="levelColor(log.level)">{{ log.level }}</span>
        </span>
        <span class="flex-1 text-text-primary break-all leading-relaxed">{{ log.message }}</span>
        <div class="shrink-0 text-right space-y-0.5">
          <div v-if="log.traceId" class="text-[9px] text-brand">{{ log.traceId }}</div>
          <div class="text-[9px] text-gray-400">{{ log.container }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
