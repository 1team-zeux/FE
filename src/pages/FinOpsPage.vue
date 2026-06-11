<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useFinOpsRunsQuery,
  useFinOpsRunQuery,
  useFinOpsRunMutation,
  FinOpsRunTable,
  FinOpsFindingsTable,
  FinOpsApprovalPanel,
} from '@/features/finops'

const route = useRoute()
const router = useRouter()

const serviceFilter = ref('')
const selectedRunId = ref<string | undefined>(
  typeof route.params.runId === 'string' ? route.params.runId : undefined,
)

const { data: runs, isLoading, isError, refetch } = useFinOpsRunsQuery(
  computed(() => ({ serviceId: serviceFilter.value || undefined })),
)

watch(runs, (list) => {
  const items = list ?? []
  if (!items.length) {
    selectedRunId.value = undefined
    return
  }
  if (!selectedRunId.value || !items.some((r) => r.run_id === selectedRunId.value)) {
    selectedRunId.value = items[0].run_id
  }
}, { immediate: true })

const { data: selectedRun, isLoading: detailLoading } = useFinOpsRunQuery(selectedRunId)

const { mutate: triggerRun, isPending: runPending, isSuccess: runSuccess, reset: resetRun } = useFinOpsRunMutation()

watch(selectedRunId, (id) => {
  if (id) {
    router.replace({ name: 'finops', params: { runId: id } })
  }
})

const selectRun = (runId: string) => {
  selectedRunId.value = runId
}

const onTriggerRun = () => {
  resetRun()
  triggerRun(
    { serviceId: serviceFilter.value || 'api-gateway', force: true },
    {
      onSuccess: (data) => {
        if (data.run_id) selectedRunId.value = data.run_id
        refetch()
      },
    },
  )
}

const snapshot = computed(() => selectedRun.value?.findings_snapshot)
const dq = computed(() => selectedRun.value?.data_quality_summary)

const guardSummary = computed(() => snapshot.value?.guard_summary ?? { eligible: 0, defer: 0, blocked: 0 })
</script>

<template>
  <div class="py-8 px-8">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">FinOps Agent</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">Report & Proposal</h1>
        <p class="text-gray-500 mt-1 text-sm">유휴·과잉 탐지 → SLA 가드 → 절감 추정 → 관리자 권유 (MVP: 실행 없음)</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="serviceFilter"
          class="text-[12px] border border-border rounded-md px-3 py-2 bg-bg-card text-text-primary font-bold cursor-pointer focus:outline-none focus:border-brand"
        >
          <option value="">모든 서비스</option>
          <option value="api-gateway">api-gateway</option>
          <option value="payment-api">payment-api</option>
        </select>
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-brand text-white text-sm font-bold hover:brightness-110 disabled:opacity-50"
          :disabled="runPending"
          @click="onTriggerRun"
        >
          {{ runPending ? '실행 중…' : 'Run 실행' }}
        </button>
      </div>
    </div>

    <div v-if="runSuccess" class="mb-4 px-4 py-2 rounded-md bg-status-ok/10 border border-status-ok/20 text-status-ok text-sm font-bold">
      FinOps 파이프라인 실행 요청 완료
    </div>

    <div v-if="isError" class="mb-4 p-4 rounded-lg bg-status-critical/5 border border-status-critical/20 text-status-critical text-sm">
      Run 목록 로드 실패 — MSW mock 또는 sla-agent-service 연결을 확인하세요.
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div class="xl:col-span-2">
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Run 이력</div>
        <FinOpsRunTable
          :runs="runs ?? []"
          :selected-run-id="selectedRunId"
          :is-loading="isLoading"
          @select="selectRun"
        />
      </div>

      <div class="xl:col-span-3 space-y-4">
        <div v-if="detailLoading" class="h-48 bg-gray-100 animate-pulse rounded-lg" />
        <template v-else-if="selectedRun">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-bg-card border border-border rounded-lg p-4">
              <div class="text-[10px] text-gray-400 uppercase font-bold">예상 절감/월</div>
              <div class="text-2xl font-bold text-brand mt-1">${{ snapshot?.total_monthly_waste_usd?.toFixed(2) ?? '0' }}</div>
            </div>
            <div class="bg-bg-card border border-border rounded-lg p-4">
              <div class="text-[10px] text-gray-400 uppercase font-bold">Findings</div>
              <div class="text-2xl font-bold mt-1">{{ snapshot?.findings_count ?? 0 }}</div>
            </div>
            <div class="bg-bg-card border border-border rounded-lg p-4">
              <div class="text-[10px] text-gray-400 uppercase font-bold">Eligible</div>
              <div class="text-2xl font-bold text-status-ok mt-1">{{ guardSummary.eligible }}</div>
            </div>
            <div class="bg-bg-card border border-border rounded-lg p-4">
              <div class="text-[10px] text-gray-400 uppercase font-bold">Defer / Blocked</div>
              <div class="text-2xl font-bold mt-1">{{ guardSummary.defer }} / {{ guardSummary.blocked }}</div>
            </div>
          </div>

          <div
            v-if="dq"
            class="px-4 py-3 rounded-lg border text-[12px]"
            :class="dq.overall_quality === 'ok' ? 'bg-status-ok/5 border-status-ok/20' : 'bg-status-warning/5 border-status-warning/20'"
          >
            <span class="font-bold uppercase">데이터 품질: {{ dq.overall_quality ?? 'unknown' }}</span>
            <span class="text-gray-500 ml-2">CMDB {{ dq.cmdb_source }} · 이용률 {{ dq.utilization_source }}</span>
            <ul v-if="dq.warnings?.length" class="mt-2 text-gray-500 list-disc list-inside">
              <li v-for="(w, i) in dq.warnings" :key="i">{{ w }}</li>
            </ul>
          </div>

          <div>
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Findings (guarded)</div>
            <FinOpsFindingsTable :findings="snapshot?.findings ?? []" />
          </div>

          <FinOpsApprovalPanel :run="selectedRun" />
        </template>
        <div v-else class="p-12 text-center text-gray-400 bg-bg-card border border-border rounded-lg">
          Run을 선택하세요
        </div>
      </div>
    </div>
  </div>
</template>
