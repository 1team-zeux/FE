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
      class="bg-bg-card border border-border rounded-xl shadow-sm"
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
            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">고객사</span>
            <span class="font-bold text-text-primary text-base truncate">{{ group.tenantLabel }}</span>
            <span class="text-[11px] font-mono text-gray-400 truncate">{{ group.tenantId }}</span>
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

      <div v-show="isExpanded(group.tenantId)" class="divide-y divide-border">
        <button
          v-for="run in group.runs"
          :key="run.run_id"
          type="button"
          class="w-full text-left px-5 py-3.5 pl-10 transition-colors hover:bg-brand-subtle/40"
          :class="selectedRunId === run.run_id ? 'bg-brand-subtle/60' : ''"
          @click="$emit('select', run.run_id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="font-bold text-text-primary text-sm truncate">
                {{ run.service_name ?? run.service_id }}
              </div>
              <div class="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                {{ run.run_id.slice(0, 8) }}… · {{ run.schedule_window ?? '—' }}
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span class="px-2 py-0.5 rounded border text-[10px] font-bold" :class="statusClass(run.status)">
                  {{ run.status }}
                </span>
                <span class="text-[11px] text-gray-500">
                  findings <strong class="text-text-primary">{{ run.findings_count ?? 0 }}</strong>
                  / eligible {{ run.eligible_count ?? 0 }}
                </span>
                <span class="text-[10px] font-bold" :class="approvalClass(run.approval_status)">
                  {{ run.approval_status ?? '—' }}
                </span>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <div class="text-[10px] text-gray-400 uppercase font-bold">절감/월</div>
              <div class="text-sm font-bold text-brand">
                ${{ run.findings_snapshot?.total_monthly_waste_usd?.toFixed(2) ?? '—' }}
              </div>
              <div class="text-[10px] text-gray-400 mt-1 max-w-[88px] truncate" :title="run.finished_at ?? ''">
                {{ run.finished_at ? new Date(run.finished_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' }}
              </div>
            </div>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>
