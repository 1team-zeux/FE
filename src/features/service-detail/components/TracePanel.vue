<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { z } from 'zod';
import { api } from '@/services/api';

const props = defineProps<{ svcId: string; tenantId: string }>();

const SpanSchema = z.object({ name: z.string(), start: z.number(), duration: z.number(), error: z.boolean() });
const TraceSchema = z.object({ traceId: z.string(), duration: z.number(), status: z.string(), label: z.string(), spans: z.array(SpanSchema) });
const TracesSchema = z.object({ traces: z.array(TraceSchema) });

const { data, isLoading } = useQuery({
  queryKey: ['traces', props.svcId, props.tenantId],
  queryFn: async () => {
    const res = await api.get(
      `/monitoring/api/v1/services/${encodeURIComponent(props.svcId)}/traces`,
      { params: { tenant_id: props.tenantId } },
    );
    return TracesSchema.parse(res.data);
  },
  enabled: !!props.tenantId,
});

type Filter = 'all' | 'error' | 'ok';
const filter = ref<Filter>('all');
const selectedTrace = ref<string | null>(null);

const filtered = computed(() => {
  const traces = data.value?.traces ?? [];
  if (filter.value === 'error') return traces.filter(t => t.status === 'error');
  if (filter.value === 'ok') return traces.filter(t => t.status === 'ok');
  return traces;
});

const selected = computed(() => filtered.value.find(t => t.traceId === selectedTrace.value) ?? filtered.value[0] ?? null);

const barWidth = (span: { start: number; duration: number }, total: number) => {
  const pct = (span.duration / total) * 100;
  return Math.max(pct, 1);
};
const barLeft = (span: { start: number; duration: number }, total: number) => (span.start / total) * 100;
</script>
<template>
  <div class="space-y-4">
    <!-- Filter tabs -->
    <div class="flex gap-2">
      <button v-for="f in [['all','전체'],['error','에러'],['ok','정상']] as const" :key="f[0]"
        class="px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors"
        :class="filter === f[0] ? 'bg-brand text-white' : 'bg-bg-card border border-border text-gray-500 hover:border-brand'"
        @click="filter = f[0]"
      >{{ f[1] }}</button>
    </div>

    <div v-if="isLoading" class="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <!-- Trace list -->
      <div class="space-y-2">
        <div
          v-for="trace in filtered" :key="trace.traceId"
          class="bg-bg-card border rounded-lg p-3 cursor-pointer transition-all"
          :class="selected?.traceId === trace.traceId ? 'border-brand' : 'border-border hover:border-gray-300'"
          @click="selectedTrace = trace.traceId"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="w-2 h-2 rounded-full shrink-0" :class="trace.status === 'error' ? 'bg-status-critical' : 'bg-status-ok'"></span>
            <span class="text-xs font-bold truncate">{{ trace.label }}</span>
          </div>
          <div class="font-mono text-xs text-gray-400">{{ trace.duration }}ms</div>
        </div>
        <div v-if="filtered.length === 0" class="p-6 text-center text-sm text-gray-400">trace 없음</div>
      </div>

      <!-- Waterfall -->
      <div v-if="selected" class="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div class="bg-gray-50 border-b border-border px-4 py-3 flex justify-between items-center">
          <span class="text-xs font-bold">{{ selected.label }}</span>
          <span class="font-mono text-xs text-gray-400">Total: {{ selected.duration }}ms</span>
        </div>
        <div class="p-4 space-y-2">
          <div v-for="(span, i) in selected.spans" :key="i">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[11px] text-gray-500 font-mono w-36 truncate shrink-0">{{ span.name }}</span>
              <span class="text-[10px] font-mono text-gray-400">{{ span.duration }}ms</span>
              <span v-if="span.error" class="text-[9px] font-bold px-1.5 py-0.5 bg-status-critical/10 text-status-critical rounded border border-status-critical/20">ERROR</span>
            </div>
            <div class="h-5 bg-gray-100 rounded relative overflow-hidden">
              <div
                class="absolute h-full rounded"
                :class="span.error ? 'bg-status-critical/70' : 'bg-brand/60'"
                :style="{ left: `${barLeft(span, selected.duration)}%`, width: `${barWidth(span, selected.duration)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
