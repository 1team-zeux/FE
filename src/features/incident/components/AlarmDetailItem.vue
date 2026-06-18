<script setup lang="ts">
import type { Alarm } from '../types/incident.schema';

// 개별 알람 한 줄 — 그룹 안에서 펼친 상태로만 보임
defineProps<{ alarm: Alarm }>();

// 출처별 배지 색상
const sourceBadge = (source: string | undefined) => ({
  metric: 'bg-blue-50 text-blue-700 border-blue-200',
  log:    'bg-purple-50 text-purple-700 border-purple-200',
  trace:  'bg-emerald-50 text-emerald-700 border-emerald-200',
}[source ?? ''] ?? 'bg-gray-100 text-gray-500 border-border');

const sourceLabel = (source: string | undefined) => ({
  metric: 'METRIC',
  log:    'LOG',
  trace:  'TRACE',
}[source ?? ''] ?? 'EVENT');

// severity 점 색상
const severityDot = (sev: string) => ({
  critical: 'bg-status-critical',
  warning:  'bg-status-warning',
  info:     'bg-gray-400',
}[sev] ?? 'bg-gray-400');
</script>

<template>
  <div class="flex items-start gap-3 px-4 py-3 border-t border-border bg-white text-xs">
    <span class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" :class="severityDot(alarm.severity)" />
    <span class="font-mono text-gray-500 w-16 shrink-0">{{ alarm.ts }}</span>
    <span class="inline-flex items-center px-1.5 py-0.5 rounded font-bold border text-xs shrink-0 w-16 justify-center" :class="sourceBadge(alarm.source)">
      {{ sourceLabel(alarm.source) }}
    </span>
    <div class="flex-1 min-w-0">
      <div class="font-bold text-text-primary">{{ alarm.alert_name ?? alarm.id }}</div>
      <div v-if="alarm.source === 'metric'" class="text-gray-500 mt-0.5">
        <span class="font-mono">{{ alarm.metric }}</span>:
        <span class="font-bold text-status-critical">{{ alarm.current_value }}</span>
        <span class="text-gray-400"> (baseline {{ alarm.baseline }})</span>
        <span v-if="alarm.unit" class="text-gray-400 ml-1">{{ alarm.unit }}</span>
      </div>
      <div v-else-if="alarm.source === 'log'" class="text-gray-500 mt-0.5 font-mono break-all">
        {{ alarm.log_message }}
        <span v-if="alarm.occurrence" class="ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-sans">×{{ alarm.occurrence }}</span>
      </div>
      <div v-else-if="alarm.source === 'trace'" class="text-gray-500 mt-0.5 font-mono">
        trace_id <span class="font-bold">{{ alarm.trace_id }}</span> — span {{ alarm.span_duration_ms }}ms
      </div>
    </div>
  </div>
</template>
