<script setup lang="ts">
import type { LogSample } from '../fixtures/billing-context';

defineProps<{ logs: LogSample[] }>();

// 로그 레벨별 배지
const levelBadge = (level: string) => ({
  ERROR: 'bg-status-critical/10 text-status-critical border-status-critical/30',
  WARN:  'bg-status-warning/10 text-status-warning border-status-warning/30',
  INFO:  'bg-gray-100 text-gray-500 border-border',
}[level] ?? 'bg-gray-100 text-gray-500 border-border');
</script>

<template>
  <div class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm">
    <div class="px-4 py-3 border-b border-border bg-gray-50/50 flex items-center justify-between">
      <div class="text-sm font-bold text-text-primary">Loki 로그 샘플 — 알람 발생 전후 30분</div>
      <span class="text-xs text-gray-400">{{ logs.length }}건</span>
    </div>
    <div class="max-h-96 overflow-y-auto">
      <div v-for="(log, i) in logs" :key="i" class="px-4 py-3 border-b border-border last:border-b-0 hover:bg-gray-50">
        <div class="flex items-start gap-3 text-xs">
          <span class="font-mono text-gray-400 w-14 shrink-0">{{ log.ts }}</span>
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border w-14 justify-center shrink-0" :class="levelBadge(log.level)">
            {{ log.level }}
          </span>
          <span class="font-mono text-text-secondary text-xs w-32 shrink-0 truncate">{{ log.service }}</span>
          <div class="flex-1 min-w-0">
            <div class="font-mono text-xs text-text-primary break-all leading-relaxed">{{ log.message }}</div>
            <div v-if="log.occurrence && log.occurrence > 1" class="mt-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-600 font-bold">
                ×{{ log.occurrence }}회
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
