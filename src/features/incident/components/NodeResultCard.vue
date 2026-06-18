<script setup lang="ts">
import type { NodeResult } from '../fixtures/billing-context';

// 노드 1개의 실행 결과 요약 카드
defineProps<{ node: NodeResult }>();

// highlight state → 색상
const stateColor = (state: string | undefined) => ({
  critical: 'text-status-critical',
  warning:  'text-status-warning',
  healthy:  'text-status-ok',
  normal:   'text-text-primary',
}[state ?? 'normal'] ?? 'text-text-primary');

// 노드 상태 → 배지
const statusBadge = (s: string) => s === 'done'
  ? { text: '✓ done',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  : { text: '✗ failed', cls: 'bg-status-critical/10 text-status-critical border-status-critical/30' };
</script>

<template>
  <div class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm flex flex-col">
    <!-- 헤더: 노드명 + 상태 -->
    <div class="px-4 py-3 border-b border-border bg-gray-50/50">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="font-mono text-sm font-bold text-text-primary">{{ node.nodeName }}</span>
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border" :class="statusBadge(node.status).cls">
          {{ statusBadge(node.status).text }}
        </span>
      </div>
      <div class="text-xs text-text-secondary">{{ node.summaryHeadline }}</div>
    </div>

    <!-- 하이라이트 (3그리드) -->
    <div class="grid grid-cols-3 divide-x divide-border">
      <div v-for="(h, i) in node.highlights" :key="i" class="px-3 py-3 text-center">
        <div class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">{{ h.label }}</div>
        <div class="text-sm font-bold font-mono" :class="stateColor(h.state)">{{ h.value }}</div>
      </div>
    </div>

    <!-- 상세 행 -->
    <div v-if="node.detailRows && node.detailRows.length > 0" class="px-4 py-3 border-t border-border bg-gray-50/30">
      <div class="space-y-1">
        <div v-for="(row, i) in node.detailRows" :key="i" class="text-xs text-gray-600 font-mono flex items-start gap-2">
          <span class="text-brand shrink-0">›</span>
          <span class="break-all">{{ row }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
