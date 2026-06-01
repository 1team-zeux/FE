<script setup lang="ts">
import type { TopologyDraft } from '../types/topology.schema'

defineProps<{
  topology: TopologyDraft
}>()
</script>

<template>
  <div class="space-y-5 h-full overflow-y-auto">
    <!-- SLA 충족 -->
    <div class="bg-bg-card rounded-xl border border-border p-4">
      <h3 class="text-sm font-semibold text-text-primary mb-3">SLA 충족 수치</h3>
      <dl class="space-y-2">
        <div v-for="(value, key) in topology.slaSatisfaction" :key="key" class="flex justify-between text-sm">
          <dt class="text-text-secondary">{{ key }}</dt>
          <dd class="font-medium text-status-ok">{{ value }}</dd>
        </div>
      </dl>
    </div>

    <!-- 예상 비용 -->
    <div class="bg-bg-card rounded-xl border border-border p-4">
      <h3 class="text-sm font-semibold text-text-primary mb-2">예상 월 비용</h3>
      <p class="text-2xl font-bold text-brand">
        ₩{{ topology.estimatedMonthlyCost.toLocaleString() }}
      </p>
    </div>

    <!-- 핵심 결정 근거 -->
    <div class="bg-bg-card rounded-xl border border-border p-4">
      <h3 class="text-sm font-semibold text-text-primary mb-3">핵심 결정 근거</h3>
      <ul class="space-y-2">
        <li
          v-for="(reason, i) in topology.rationale"
          :key="i"
          class="flex gap-2 text-sm text-text-secondary"
        >
          <span class="text-brand mt-0.5">•</span>
          <span>{{ reason }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
