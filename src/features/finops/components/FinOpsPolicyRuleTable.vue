<script setup lang="ts">
import type { PolicyRuleRow } from '../data/policyRuleRegistry'

defineProps<{
  rows: PolicyRuleRow[]
}>()
</script>

<template>
  <div class="overflow-x-auto rounded border border-border/30">
    <table class="w-full min-w-[640px] border-collapse">
      <thead>
        <tr class="bg-bg-muted/50 text-left">
          <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30 w-14">규칙 ID</th>
          <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30 w-28">명칭</th>
          <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30">판정 조건</th>
          <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30">결과</th>
          <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30">근거·출처</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.ruleId"
          class="border-b border-border/20 last:border-0 align-top"
        >
          <td class="px-2 py-1.5 font-mono text-gray-500">{{ row.ruleId }}</td>
          <td class="px-2 py-1.5 text-gray-500 font-medium">{{ row.name }}</td>
          <td class="px-2 py-1.5 font-mono text-[9px] leading-relaxed">{{ row.condition }}</td>
          <td class="px-2 py-1.5 font-mono text-[9px] leading-relaxed">{{ row.outcome }}</td>
          <td class="px-2 py-1.5">
            <a
              v-if="row.sourceUrl"
              :href="row.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-brand/70 hover:text-brand underline underline-offset-2 text-[10px] leading-snug"
            >{{ row.sourceRef }}</a>
            <span v-else class="text-[10px]">{{ row.sourceRef }}</span>
            <span v-if="row.sourceNote" class="block text-[9px] text-gray-400/90 mt-1 leading-relaxed">
              {{ row.sourceNote }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
