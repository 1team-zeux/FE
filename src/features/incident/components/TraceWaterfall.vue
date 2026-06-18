<script setup lang="ts">
// Tempo 스타일 trace waterfall — 서비스 호출 체인 + span bar chart
import { computed } from 'vue';
import type { TraceWaterfallData, TraceSpan } from '../fixtures/triage-blueprints';

const props = defineProps<{ data: TraceWaterfallData }>();

// 트리 구조 → flat list with depth
interface FlatSpan extends TraceSpan { depth: number }

const flatSpans = computed<FlatSpan[]>(() => {
  const byId = new Map(props.data.spans.map(s => [s.spanId, s]));
  const childrenOf = new Map<string | undefined, TraceSpan[]>();
  for (const s of props.data.spans) {
    const key = s.parentSpanId;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(s);
  }
  const out: FlatSpan[] = [];
  const visit = (parentId: string | undefined, depth: number) => {
    const kids = (childrenOf.get(parentId) ?? []).slice().sort((a, b) => a.startMs - b.startMs);
    for (const s of kids) {
      out.push({ ...s, depth });
      visit(s.spanId, depth + 1);
    }
  };
  visit(undefined, 0);
  // root spans (no parent) — first call already covers parentId=undefined
  return out;
});

// 서비스별 색
const serviceColor = (svc: string): string => {
  if (svc.startsWith('Client')) return 'bg-gray-200 text-text-secondary';
  if (svc.startsWith('ALB'))    return 'bg-purple-100 text-purple-800';
  if (svc.startsWith('ECS'))    return 'bg-blue-100 text-blue-800';
  if (svc.startsWith('RDS'))    return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-text-secondary';
};

// span bar 색 (status)
const barColor = (status: TraceSpan['status']): string => {
  if (status === 'slow' || status === 'error') return 'bg-status-critical';
  return 'bg-status-ok';
};

// span bar 위치 / 길이 (%)
const barLeftPct  = (s: TraceSpan): number => (s.startMs / props.data.totalDurationMs) * 100;
const barWidthPct = (s: TraceSpan): number => Math.max(0.5, (s.durationMs / props.data.totalDurationMs) * 100);
</script>

<template>
  <div class="space-y-3">
    <!-- 서비스 호출 체인 -->
    <div class="flex items-center gap-1 flex-wrap">
      <template v-for="(svc, i) in data.services" :key="svc">
        <span
          class="text-sm font-bold px-2.5 py-1 rounded border border-border"
          :class="serviceColor(svc)"
        >{{ svc }}</span>
        <span v-if="i < data.services.length - 1" class="text-text-secondary">→</span>
      </template>
      <span class="ml-auto text-xs font-mono text-text-secondary">trace_id={{ data.traceId }} · total {{ data.totalDurationMs }}ms</span>
    </div>

    <!-- Waterfall -->
    <div class="border border-border rounded-md bg-white overflow-hidden">
      <!-- header (시간 축) -->
      <div class="grid grid-cols-12 gap-2 px-3 py-1.5 bg-bg-card border-b border-border text-xs text-text-secondary">
        <div class="col-span-5">Service · Operation</div>
        <div class="col-span-6 relative">
          <span class="absolute left-0">0</span>
          <span class="absolute left-1/4">{{ Math.round(data.totalDurationMs * 0.25) }}ms</span>
          <span class="absolute left-1/2">{{ Math.round(data.totalDurationMs * 0.5) }}ms</span>
          <span class="absolute left-3/4">{{ Math.round(data.totalDurationMs * 0.75) }}ms</span>
          <span class="absolute right-0">{{ data.totalDurationMs }}ms</span>
        </div>
        <div class="col-span-1 text-right">duration</div>
      </div>

      <!-- spans -->
      <div class="divide-y divide-border">
        <div
          v-for="span in flatSpans"
          :key="span.spanId"
          class="grid grid-cols-12 gap-2 items-center px-3 py-2"
        >
          <!-- Service + Operation (들여쓰기 by depth) -->
          <div class="col-span-5 min-w-0" :style="{ paddingLeft: `${span.depth * 14}px` }">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-bold px-1.5 py-0.5 rounded" :class="serviceColor(span.service)">{{ span.service }}</span>
              <span class="font-mono text-sm text-text-primary truncate">{{ span.operationName }}</span>
            </div>
            <div v-if="span.description" class="text-xs text-text-secondary mt-1 line-clamp-1" :title="span.description">{{ span.description }}</div>
          </div>

          <!-- Bar -->
          <div class="col-span-6 relative h-5 bg-gray-50 rounded">
            <div
              class="absolute top-0 bottom-0 rounded"
              :class="barColor(span.status)"
              :style="{ left: `${barLeftPct(span)}%`, width: `${barWidthPct(span)}%` }"
            />
          </div>

          <!-- Duration -->
          <div class="col-span-1 text-right">
            <div class="font-mono font-bold text-sm" :class="span.status === 'slow' ? 'text-status-critical' : 'text-text-primary'">{{ span.durationMs }}ms</div>
            <div v-if="span.baselineMs != null" class="text-xs text-text-secondary">vs {{ span.baselineMs }}ms</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
