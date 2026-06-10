<script setup lang="ts">
import type { FinOpsRun } from '../types/finops.schema'

defineProps<{
  runs: FinOpsRun[]
  selectedRunId?: string
  isLoading?: boolean
}>()

defineEmits<{
  select: [runId: string]
}>()

const statusClass = (status: string) => ({
  COMPLETED: 'bg-status-ok/10 text-status-ok border-status-ok/20',
  RUNNING: 'bg-status-pending/10 text-status-pending border-status-pending/20',
  FAILED: 'bg-status-critical/10 text-status-critical border-status-critical/20',
}[status] ?? 'bg-gray-100 text-gray-500 border-border')

const approvalClass = (status?: string | null) => ({
  PENDING_REVIEW: 'text-status-warning',
  APPROVED: 'text-status-ok',
  REJECTED: 'text-status-critical',
}[status ?? ''] ?? 'text-gray-400')
</script>

<template>
  <div class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm">
    <div v-if="isLoading" class="p-8 space-y-3">
      <div v-for="i in 3" :key="i" class="h-12 bg-gray-100 animate-pulse rounded-md" />
    </div>
    <div v-else-if="runs.length === 0" class="p-10 text-center text-gray-400 text-sm">
      FinOps run 이력 없음 — 「Run 실행」으로 파이프라인을 시작하세요.
    </div>
    <table v-else class="w-full text-sm">
      <thead class="bg-bg-muted border-b border-border">
        <tr class="text-left text-[10px] uppercase tracking-wider text-gray-400">
          <th class="px-4 py-3 font-bold">서비스</th>
          <th class="px-4 py-3 font-bold">상태</th>
          <th class="px-4 py-3 font-bold">Findings</th>
          <th class="px-4 py-3 font-bold">절감/월</th>
          <th class="px-4 py-3 font-bold">승인</th>
          <th class="px-4 py-3 font-bold">완료</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="run in runs"
          :key="run.run_id"
          class="border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-brand-subtle/40"
          :class="selectedRunId === run.run_id ? 'bg-brand-subtle/60' : ''"
          @click="$emit('select', run.run_id)"
        >
          <td class="px-4 py-3">
            <div class="font-bold text-text-primary">{{ run.service_name ?? run.service_id }}</div>
            <div class="text-[10px] text-gray-400 font-mono">{{ run.run_id.slice(0, 8) }}…</div>
          </td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded border text-[10px] font-bold" :class="statusClass(run.status)">
              {{ run.status }}
            </span>
          </td>
          <td class="px-4 py-3">
            <span class="font-bold">{{ run.findings_count ?? 0 }}</span>
            <span class="text-gray-400"> / eligible {{ run.eligible_count ?? 0 }}</span>
          </td>
          <td class="px-4 py-3 font-bold text-brand">
            ${{ run.findings_snapshot?.total_monthly_waste_usd?.toFixed(2) ?? '—' }}
          </td>
          <td class="px-4 py-3 text-[11px] font-bold" :class="approvalClass(run.approval_status)">
            {{ run.approval_status ?? '—' }}
          </td>
          <td class="px-4 py-3 text-[11px] text-gray-400">
            {{ run.finished_at ? new Date(run.finished_at).toLocaleString('ko-KR') : '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
