<script setup lang="ts">
import type { FinOpsFinding } from '../types/finops.schema'

defineProps<{
  findings: FinOpsFinding[]
}>()

const guardClass = (status?: string) => ({
  eligible: 'bg-status-ok/10 text-status-ok border-status-ok/20',
  defer: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  blocked: 'bg-status-critical/10 text-status-critical border-status-critical/20',
}[status ?? ''] ?? 'bg-gray-100 text-gray-500 border-border')
</script>

<template>
  <div class="bg-bg-card border border-border rounded-lg overflow-hidden">
    <div v-if="findings.length === 0" class="p-8 text-center text-gray-400 text-sm">
      finding 없음
    </div>
    <table v-else class="w-full text-sm">
      <thead class="bg-bg-muted border-b border-border">
        <tr class="text-left text-[10px] uppercase tracking-wider text-gray-400">
          <th class="px-4 py-3 font-bold">Guard</th>
          <th class="px-4 py-3 font-bold">리소스</th>
          <th class="px-4 py-3 font-bold">패턴</th>
          <th class="px-4 py-3 font-bold">권유</th>
          <th class="px-4 py-3 font-bold">절감/월</th>
          <th class="px-4 py-3 font-bold">사유</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(f, i) in findings" :key="f.finding_id ?? i" class="border-b border-border last:border-0">
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded border text-[10px] font-bold uppercase" :class="guardClass(f.guard_status)">
              {{ f.guard_status ?? '—' }}
            </span>
          </td>
          <td class="px-4 py-3 font-mono text-[12px]">{{ f.resource_id }}</td>
          <td class="px-4 py-3 text-gray-500">{{ f.pattern_id ?? '—' }}</td>
          <td class="px-4 py-3 font-bold">{{ f.recommended_action ?? '—' }}</td>
          <td class="px-4 py-3 font-bold text-brand">${{ f.monthly_waste_usd?.toFixed(2) ?? '—' }}</td>
          <td class="px-4 py-3 text-[11px] text-gray-500 max-w-[220px] truncate" :title="f.guard_reason">
            {{ f.guard_reason ?? '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
