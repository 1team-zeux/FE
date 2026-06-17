<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { z } from 'zod';
import { api } from '@/services/api';

const props = defineProps<{ svcId: string; tenantId: string }>();

const LogSchema = z.object({
  id: z.string(), timestamp: z.string(), level: z.enum(['ERROR','WARN','INFO']),
  message: z.string(), traceId: z.string().nullable(), container: z.string(),
});

// AI Chatbot LLM 타임아웃 장애 시나리오 mock 로그
const MOCK_LOGS = [
  { id: 'log-001', timestamp: '13:12:04', level: 'ERROR' as const, container: 'chatbot-svc',
    message: '[llm-backend-svc] Request timeout after 30000ms: POST https://api.llm-provider.io/v1/chat/completions',
    traceId: 'trc-2026-0616-004' },
  { id: 'log-002', timestamp: '13:12:04', level: 'ERROR' as const, container: 'chatbot-svc',
    message: '[chatbot-svc] LLM API timeout — ASR degraded: returning 503 to client (no fallback configured)',
    traceId: 'trc-2026-0616-004' },
  { id: 'log-003', timestamp: '13:12:09', level: 'WARN' as const, container: 'subscription-svc',
    message: '[subscription-svc] Slow DB query: INSERT INTO subscriptions took 1760ms (threshold: 500ms)',
    traceId: 'trc-2026-0616-001' },
  { id: 'log-004', timestamp: '13:12:15', level: 'ERROR' as const, container: 'chatbot-svc',
    message: '[llm-backend-svc] circuit_breaker.enabled=false — Circuit Breaker OPEN would reduce cascading failures',
    traceId: null },
  { id: 'log-005', timestamp: '13:13:21', level: 'ERROR' as const, container: 'chatbot-svc',
    message: '[chatbot-svc] Answer Success Rate dropped to 74.4%: SLA threshold breach (target: 95%)',
    traceId: null },
  { id: 'log-006', timestamp: '13:14:00', level: 'WARN' as const, container: 'sla-agent',
    message: '[monitoring] Fast Burn Rate 8.73× detected on ASR error budget. Escalating incident to P1.',
    traceId: null },
  { id: 'log-007', timestamp: '13:14:33', level: 'WARN' as const, container: 'subscription-svc',
    message: '[subscription-svc] DB connection pool exhausted (pool_size=20/20). Requests queuing.',
    traceId: null },
  { id: 'log-008', timestamp: '13:15:02', level: 'ERROR' as const, container: 'chatbot-svc',
    message: '[llm-backend-svc] All retry attempts failed (max_retries=3). Raising LLMTimeoutException.',
    traceId: 'trc-2026-0616-004' },
  { id: 'log-009', timestamp: '13:15:18', level: 'INFO' as const, container: 'api-gateway',
    message: '[api-gateway] Upstream chatbot-svc error rate: 43.2% (5m window). Health check degraded.',
    traceId: null },
];

const { data: logs, isLoading } = useQuery({
  queryKey: ['logs', props.svcId, props.tenantId],
  queryFn: async () => {
    try {
      const res = await api.get(
        `/monitoring/api/v1/services/${encodeURIComponent(props.svcId)}/logs`,
        { params: { tenant_id: props.tenantId } },
      );
      const parsed = z.array(LogSchema).parse(res.data);
      if (parsed.length > 0) return parsed;
    } catch {
      // API 실패 시 mock fallback
    }
    return MOCK_LOGS;
  },
  enabled: !!props.tenantId,
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
  ERROR: 'bg-status-critical/10 border-status-critical/30',
  WARN:  'bg-status-warning/10 border-status-warning/30',
  INFO:  'bg-gray-100 border-border',
}[l] ?? 'bg-gray-100 border-border');
</script>
<template>
  <div class="space-y-4">
    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex gap-1">
        <button v-for="lv in ['ALL','ERROR','WARN','INFO'] as const" :key="lv"
          class="px-3 py-1.5 text-sm font-bold rounded-md transition-colors min-w-[52px]"
          :class="levelFilter === lv ? 'bg-brand text-white' : 'bg-bg-card border border-border text-gray-500 hover:border-brand'"
          @click="levelFilter = lv"
        >{{ lv }}</button>
      </div>
      <input
        v-model="search"
        type="text"
        placeholder="trace_id, container, message 검색..."
        class="flex-1 min-w-48 text-sm px-3 py-1.5 border border-border rounded-md bg-bg-card focus:outline-none focus:border-brand"
      />
    </div>

    <div v-if="isLoading" class="h-48 bg-gray-100 animate-pulse rounded-lg"></div>
    <div v-else-if="filtered.length === 0" class="p-8 text-center text-sm text-gray-400 bg-bg-card border border-border rounded-lg">
      로그 없음
    </div>
    <div v-else class="bg-bg-card border border-border rounded-lg overflow-hidden font-mono">
      <div v-for="log in filtered" :key="log.id" class="flex gap-3 px-4 py-2.5 border-b border-border last:border-b-0 text-sm hover:bg-gray-50 items-start">
        <span class="text-gray-400 shrink-0 w-16 font-mono text-sm pt-0.5">{{ log.timestamp }}</span>
        <span class="font-bold shrink-0 w-14 text-center px-2 py-0.5 rounded border text-xs" :class="levelBg(log.level)">
          <span :class="levelColor(log.level)">{{ log.level }}</span>
        </span>
        <span class="flex-1 text-text-primary break-all leading-relaxed">{{ log.message }}</span>
        <div class="shrink-0 text-right space-y-0.5 min-w-[100px]">
          <div v-if="log.traceId" class="text-xs text-brand font-mono truncate max-w-[120px]">{{ log.traceId }}</div>
          <div class="text-xs text-gray-400">{{ log.container }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
