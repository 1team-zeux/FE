<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { z } from 'zod';
import { api } from '@/services/api';

const props = defineProps<{ svcId: string; tenantId: string }>();

const SpanSchema = z.object({
  name: z.string(), service: z.string().default('unknown'),
  start: z.number(), duration: z.number(), error: z.boolean(), depth: z.number().default(0),
});
const TraceSchema = z.object({
  traceId: z.string(), duration: z.number(), status: z.string(), label: z.string(),
  spans: z.array(SpanSchema),
});
const TracesSchema = z.object({ traces: z.array(TraceSchema) });

// 서비스 → bar 색
const SVC_COLOR: Record<string, string> = {
  'frontend':           '#92400E',
  'api-gateway':        '#374151',
  'subscription-svc':   '#0F766E',
  'chatbot-svc':        '#0F766E',
  'mariadb':            '#D97706',
  'redis':              '#B91C1C',
  'llm-backend':        '#6D28D9',
};
const barColor = (svc: string, err: boolean) => err ? '#EF4444' : (SVC_COLOR[svc] ?? '#6B7280');

// T-Universe frontend → gateway → svc → DB 계층 mock
const MOCK_TRACES = {
  traces: [
    {
      traceId: 'trc-slow-db',
      duration: 1840,
      status: 'error',
      label: 'POST /subscriptions — DB 과부하',
      spans: [
        { service: 'frontend',         name: 'HTTP POST /api/subscriptions',   start: 0,    duration: 1840, error: false, depth: 0 },
        { service: 'api-gateway',      name: 'HTTP POST /subscriptions',        start: 8,    duration: 1824, error: true,  depth: 1 },
        { service: 'subscription-svc', name: 'handleCreateSubscription',        start: 15,   duration: 1814, error: true,  depth: 2 },
        { service: 'subscription-svc', name: 'auth:validateToken',              start: 17,   duration: 18,   error: false, depth: 3 },
        { service: 'mariadb',          name: 'SQL INSERT subscriptions',        start: 38,   duration: 1760, error: true,  depth: 3 },
      ],
    },
    {
      traceId: 'trc-llm-timeout',
      duration: 5720,
      status: 'error',
      label: 'POST /ai/chat — LLM 타임아웃',
      spans: [
        { service: 'frontend',         name: 'HTTP POST /api/ai/chat',          start: 0,    duration: 5720, error: false, depth: 0 },
        { service: 'api-gateway',      name: 'HTTP POST /ai/chat',              start: 9,    duration: 5706, error: true,  depth: 1 },
        { service: 'chatbot-svc',      name: 'handleChatRequest',               start: 16,   duration: 5696, error: true,  depth: 2 },
        { service: 'chatbot-svc',      name: 'intent:parseQuery',               start: 18,   duration: 42,   error: false, depth: 3 },
        { service: 'llm-backend',      name: 'HTTP POST /v1/chat/completions',  start: 62,   duration: 5600, error: true,  depth: 3 },
      ],
    },
    {
      traceId: 'trc-normal-get',
      duration: 280,
      status: 'ok',
      label: 'GET /subscriptions/:id — 정상',
      spans: [
        { service: 'frontend',         name: 'HTTP GET /api/subscriptions/123', start: 0,   duration: 280, error: false, depth: 0 },
        { service: 'api-gateway',      name: 'HTTP GET /subscriptions/123',     start: 6,   duration: 270, error: false, depth: 1 },
        { service: 'subscription-svc', name: 'handleGetSubscription',           start: 11,  duration: 263, error: false, depth: 2 },
        { service: 'redis',            name: 'GET sub:cache:123',               start: 13,  duration: 6,   error: false, depth: 3 },
        { service: 'mariadb',          name: 'SQL SELECT subscriptions',        start: 22,  duration: 240, error: false, depth: 3 },
      ],
    },
    {
      traceId: 'trc-portal',
      duration: 380,
      status: 'ok',
      label: 'GET /portal/dashboard — 정상',
      spans: [
        { service: 'frontend',         name: 'HTTP GET /portal/dashboard',      start: 0,   duration: 380, error: false, depth: 0 },
        { service: 'api-gateway',      name: 'HTTP GET /portal/dashboard',      start: 7,   duration: 368, error: false, depth: 1 },
        { service: 'subscription-svc', name: 'getUserProfile',                  start: 13,  duration: 240, error: false, depth: 2 },
        { service: 'redis',            name: 'GET user:profile:cache',          start: 15,  duration: 8,   error: false, depth: 3 },
        { service: 'mariadb',          name: 'SQL SELECT users JOIN sub',       start: 26,  duration: 195, error: false, depth: 3 },
        { service: 'subscription-svc', name: 'getActiveServices',               start: 258, duration: 112, error: false, depth: 2 },
        { service: 'mariadb',          name: 'SQL SELECT service_catalogs',     start: 260, duration: 106, error: false, depth: 3 },
      ],
    },
  ],
};

const { data, isLoading } = useQuery({
  queryKey: ['traces', props.svcId, props.tenantId],
  queryFn: async () => {
    try {
      const res = await api.get(
        `/monitoring/api/v1/services/${encodeURIComponent(props.svcId)}/traces`,
        { params: { tenant_id: props.tenantId } },
      );
      const parsed = TracesSchema.parse(res.data);
      if (parsed.traces.length > 0) return parsed;
    } catch { /* API 실패 시 mock fallback */ }
    return MOCK_TRACES;
  },
  enabled: !!props.tenantId,
});

type Filter = 'all' | 'error' | 'ok';
const filter     = ref<Filter>('all');
const selectedId = ref<string | null>(null);

const filtered = computed(() => {
  const traces = data.value?.traces ?? [];
  if (filter.value === 'error') return traces.filter(t => t.status === 'error');
  if (filter.value === 'ok')    return traces.filter(t => t.status === 'ok');
  return traces;
});

const selected = computed(() =>
  filtered.value.find(t => t.traceId === selectedId.value) ?? filtered.value[0] ?? null,
);

const durationLabel = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
const barW = (dur: number, total: number) => `${Math.max((dur / total) * 100, 0.5)}%`;
const barL = (start: number, total: number) => `${(start / total) * 100}%`;
</script>

<template>
  <div class="space-y-4">
    <!-- Filter -->
    <div class="flex gap-2">
      <button
        v-for="f in [['all','전체'],['error','에러'],['ok','정상']] as const" :key="f[0]"
        class="px-3 py-1.5 text-sm font-bold rounded-md transition-colors"
        :class="filter === f[0] ? 'bg-brand text-white' : 'bg-bg-card border border-border text-gray-500 hover:border-brand'"
        @click="filter = f[0]"
      >{{ f[1] }}</button>
    </div>

    <div v-if="isLoading" class="h-32 bg-gray-100 animate-pulse rounded-lg" />
    <div v-else class="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">

      <!-- Trace list -->
      <div class="space-y-2">
        <div
          v-for="trace in filtered" :key="trace.traceId"
          class="bg-bg-card border rounded-lg p-3 cursor-pointer transition-all"
          :class="selected?.traceId === trace.traceId ? 'border-brand shadow-sm' : 'border-border hover:border-gray-300'"
          @click="selectedId = trace.traceId"
        >
          <div class="flex items-center gap-2 mb-1.5">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="trace.status === 'error' ? 'bg-status-critical animate-pulse' : 'bg-status-ok'"
            />
            <span class="text-sm font-bold truncate leading-tight">{{ trace.label }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="font-mono text-sm font-bold"
              :class="trace.status === 'error' ? 'text-status-critical' : 'text-gray-500'"
            >{{ durationLabel(trace.duration) }}</span>
            <span class="text-xs text-gray-400">· {{ trace.spans.length }} spans</span>
          </div>
        </div>
        <div v-if="filtered.length === 0" class="p-6 text-center text-sm text-gray-400">trace 없음</div>
      </div>

      <!-- Waterfall -->
      <div v-if="selected" class="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div class="bg-gray-50 border-b border-border px-4 py-3 flex justify-between items-center">
          <span class="text-sm font-bold truncate flex-1 mr-4">{{ selected.label }}</span>
          <span
            class="font-mono text-sm font-bold shrink-0"
            :class="selected.status === 'error' ? 'text-status-critical' : 'text-gray-500'"
          >Total: {{ durationLabel(selected.duration) }}</span>
        </div>

        <div class="p-4 space-y-3">
          <div v-for="(span, i) in selected.spans" :key="i">
            <!-- Span label row -->
            <div
              class="flex items-center gap-2 mb-1"
              :style="{ paddingLeft: `${span.depth * 14}px` }"
            >
              <!-- Service color dot -->
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0"
                :style="{ backgroundColor: barColor(span.service, span.error) }"
              />
              <!-- Service name -->
              <span
                class="text-xs font-bold shrink-0"
                :style="{ color: barColor(span.service, span.error) }"
              >{{ span.service }}</span>
              <!-- Operation name -->
              <span class="text-sm text-gray-600 font-mono truncate flex-1">{{ span.name }}</span>
              <!-- Duration -->
              <span
                class="text-sm font-mono font-bold shrink-0"
                :class="span.error ? 'text-status-critical' : 'text-gray-400'"
              >{{ durationLabel(span.duration) }}</span>
              <span
                v-if="span.error"
                class="text-xs font-bold px-1.5 py-0.5 bg-status-critical/10 text-status-critical rounded border border-status-critical/20 shrink-0"
              >ERR</span>
            </div>

            <!-- Bar -->
            <div
              class="h-5 bg-gray-100 rounded relative overflow-hidden"
              :style="{ marginLeft: `${span.depth * 14}px` }"
            >
              <div
                class="absolute h-full rounded transition-all"
                :style="{
                  left: barL(span.start, selected.duration),
                  width: barW(span.duration, selected.duration),
                  backgroundColor: barColor(span.service, span.error),
                  opacity: span.error ? '1' : '0.75',
                }"
              />
              <!-- inline duration label for wide bars -->
              <span
                v-if="(span.duration / selected.duration) > 0.12"
                class="absolute inset-0 flex items-center pl-2 text-xs font-mono font-bold text-white pointer-events-none"
                :style="{ left: barL(span.start, selected.duration) }"
              >{{ durationLabel(span.duration) }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
