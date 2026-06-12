<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FinOpsRun } from '../types/finops.schema'
import { groupFinOpsRunsByTenant } from '../utils/groupFinOpsRuns'

const props = defineProps<{
  runs: FinOpsRun[]
  selectedRunId?: string
  isLoading?: boolean
}>()

defineEmits<{
  select: [runId: string]
}>()

const expandedTenants = ref<Record<string, boolean>>({})

const tenantGroups = computed(() => groupFinOpsRunsByTenant(props.runs))

watch(
  tenantGroups,
  (groups) => {
    for (const group of groups) {
      if (expandedTenants.value[group.tenantId] === undefined) {
        expandedTenants.value[group.tenantId] = true
      }
    }
  },
  { immediate: true },
)

function toggleTenant(tenantId: string) {
  expandedTenants.value[tenantId] = !expandedTenants.value[tenantId]
}

function isExpanded(tenantId: string) {
  return expandedTenants.value[tenantId] !== false
}

const statusClass = (status: string) => ({
  COMPLETED: 'bg-status-ok/10 text-status-ok border-status-ok/20',
  PROPOSAL_SENT: 'bg-brand/10 text-brand border-brand/20',
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
  <div class="space-y-4">
    <div v-if="isLoading" class="bg-bg-card border border-border rounded-xl overflow-hidden shadow-sm p-10 space-y-4">
      <div v-for="i in 3" :key="i" class="h-14 bg-gray-100 animate-pulse rounded-lg" />
    </div>

    <div
      v-else-if="runs.length === 0"
      class="bg-bg-card border border-border rounded-xl overflow-hidden shadow-sm p-12 text-center text-gray-400 text-base"
    >
      FinOps run 이력 없음 — 「상시 분석 실행」으로 파이프라인을 시작하세요.
    </div>

    <section
      v-for="group in tenantGroups"
      v-else
      :key="group.tenantId"
      class="bg-bg-card border border-border rounded-xl overflow-hidden shadow-sm"
    >
      <button
        type="button"
        class="w-full flex items-center gap-4 px-5 py-4 bg-bg-muted/70 border-b border-border hover:bg-bg-muted transition-colors text-left"
        @click="toggleTenant(group.tenantId)"
      >
        <svg
          class="w-5 h-5 shrink-0 text-gray-400 transition-transform"
          :class="isExpanded(group.tenantId) ? 'rotate-90' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">고객사</span>
            <span class="font-bold text-text-primary text-base">{{ group.tenantLabel }}</span>
            <span class="text-[11px] font-mono text-gray-400">{{ group.tenantId }}</span>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ group.runs.length }}개 서비스 · findings {{ group.totalFindings }} · eligible {{ group.totalEligible }}
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-[11px] text-gray-400 uppercase font-bold">절감/월</div>
          <div class="text-base font-bold text-brand">${{ group.totalMonthlyWasteUsd.toFixed(2) }}</div>
        </div>
      </button>

      <div v-show="isExpanded(group.tenantId)">
        <table class="w-full text-[15px]">
          <thead class="bg-bg-muted/40 border-b border-border">
            <tr class="text-left text-[11px] uppercase tracking-wider text-gray-400">
              <th class="px-5 py-3.5 font-bold pl-12">서비스</th>
              <th class="px-5 py-3.5 font-bold">상태</th>
              <th class="px-5 py-3.5 font-bold">Findings</th>
              <th class="px-5 py-3.5 font-bold">절감/월</th>
              <th class="px-5 py-3.5 font-bold">승인</th>
              <th class="px-5 py-3.5 font-bold">완료</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="run in group.runs"
              :key="run.run_id"
              class="border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-brand-subtle/40"
              :class="selectedRunId === run.run_id ? 'bg-brand-subtle/60' : ''"
              @click="$emit('select', run.run_id)"
            >
              <td class="px-5 py-4 pl-12">
                <div class="font-bold text-text-primary text-[15px]">{{ run.service_name ?? run.service_id }}</div>
                <div class="text-[11px] text-gray-400 font-mono mt-0.5">{{ run.run_id.slice(0, 8) }}…</div>
              </td>
              <td class="px-5 py-4">
                <span class="px-2.5 py-1 rounded border text-[11px] font-bold" :class="statusClass(run.status)">
                  {{ run.status }}
                </span>
              </td>
              <td class="px-5 py-4">
                <span class="font-bold">{{ run.findings_count ?? 0 }}</span>
                <span class="text-gray-400 text-sm"> / eligible {{ run.eligible_count ?? 0 }}</span>
              </td>
              <td class="px-5 py-4 font-bold text-brand">
                ${{ run.findings_snapshot?.total_monthly_waste_usd?.toFixed(2) ?? '—' }}
              </td>
              <td class="px-5 py-4 text-xs font-bold" :class="approvalClass(run.approval_status)">
                {{ run.approval_status ?? '—' }}
              </td>
              <td class="px-5 py-4 text-xs text-gray-400">
                {{ run.finished_at ? new Date(run.finished_at).toLocaleString('ko-KR') : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
