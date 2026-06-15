<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useFinOpsRunsQuery,
  useFinOpsRunQuery,
  FinOpsRunTable,
  FinOpsFindingsTable,
  FinOpsApprovalPanel,
  FinOpsExecutiveReport,
  FinOpsMarkdownReport,
  FinOpsRunConsole,
  FinOpsOptimizationReport,
  FinOpsPolicyRationale,
  FinOpsLlmNotice,
  FinOpsRcaBanner,
  useFinOpsRunStream,
  downloadExecutiveReportMarkdown,
} from '@/features/finops'
import type { OptimizationProposal } from '@/features/finops/types/finops.schema'

const route = useRoute()
const router = useRouter()

const tenantFilter = ref('')
const serviceFilter = ref('')
const detailTab = ref<'optimization' | 'markdown' | 'report' | 'findings'>('optimization')
const showConsole = ref(false)
const reportReveal = ref(true)
const adoptedProposal = ref<OptimizationProposal | null>(null)
const selectedRunId = ref<string | undefined>(
  typeof route.params.runId === 'string' ? route.params.runId : undefined,
)

const { data: runs, isLoading, isError, refetch } = useFinOpsRunsQuery(
  computed(() => ({
    tenantId: tenantFilter.value || undefined,
    serviceId: serviceFilter.value || undefined,
  })),
)

const tenantOptions = computed(() => {
  const ids = [...new Set((runs.value ?? []).map((r) => r.tenant_id).filter(Boolean))]
  return ids.sort((a, b) => a.localeCompare(b, 'ko'))
})

const { lines, isStreaming, isDone, donePayload, start: startStream, stop: stopStream } = useFinOpsRunStream()

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

watch(selectedRunId, (id, prevId) => {
  if (id) {
    router.replace({ name: 'finops', params: { runId: id } })
  }
  adoptedProposal.value = null
  if (id && id !== prevId) {
    reportReveal.value = false
    requestAnimationFrame(() => {
      reportReveal.value = true
    })
  }
}, { immediate: true })

watch(selectedRun, (run) => {
  if (run && !isStreaming.value) {
    reportReveal.value = true
  }
})

watch(isDone, async (done) => {
  if (!done) return
  await refetch()
  if (donePayload.value?.run_id) {
    selectedRunId.value = donePayload.value.run_id
    detailTab.value = 'optimization'
  }
})

const selectRun = (runId: string) => {
  selectedRunId.value = runId
  detailTab.value = 'optimization'
}

const onTriggerRun = () => {
  stopStream()
  showConsole.value = true
  reportReveal.value = false
  startStream({
    serviceId: serviceFilter.value || 'api-gateway',
    force: true,
  })
}

const onAdoptProposal = (proposal: OptimizationProposal) => {
  adoptedProposal.value = proposal
  const el = document.getElementById('finops-approval-panel')
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const onPrint = () => window.print()

const onDownloadMarkdown = () => {
  if (selectedRun.value) {
    downloadExecutiveReportMarkdown(selectedRun.value)
  }
}
const onViewRcaDetail = () => {
  detailTab.value = 'report'
  nextTick(() => {
    document.getElementById('finops-rca-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
</script>

<template>
  <div class="py-8 px-8 print:py-4 print:px-4">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
      <div>
        <div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">⑦ FinOps Agent</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">최적화·비용절감 리포트</h1>
        <p class="text-gray-500 mt-1 text-sm max-w-2xl">
          장애가 없는 날에도 Agent는 일합니다 — 실측 기반 절감 제안 + SLA 검증 + 월간 이행 증빙
        </p>
        <div class="mt-2">
          <FinOpsLlmNotice />
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="tenantFilter"
          class="text-[12px] border border-border rounded-md px-3 py-2 bg-bg-card text-text-primary font-bold cursor-pointer focus:outline-none focus:border-brand"
        >
          <option value="">모든 고객사</option>
          <option v-for="tenantId in tenantOptions" :key="tenantId" :value="tenantId">
            {{ tenantId }}
          </option>
        </select>
        <select
          v-model="serviceFilter"
          class="text-[12px] border border-border rounded-md px-3 py-2 bg-bg-card text-text-primary font-bold cursor-pointer focus:outline-none focus:border-brand"
        >
          <option value="">모든 서비스</option>
          <option value="api-gateway">api-gateway</option>
          <option value="payment-api">payment-api</option>
          <option value="order-service">order-service</option>
        </select>
        <button
          type="button"
          class="px-4 py-2 rounded-md border border-border bg-bg-card text-sm font-bold hover:bg-bg-muted disabled:opacity-40"
          :disabled="!selectedRun"
          @click="onDownloadMarkdown"
        >
          Markdown ↓
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-md border border-border bg-bg-card text-sm font-bold hover:bg-bg-muted disabled:opacity-50"
          :disabled="!selectedRun"
          @click="onPrint"
        >
          인쇄 / PDF
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-brand text-white text-sm font-bold hover:brightness-110 disabled:opacity-50"
          :disabled="isStreaming"
          @click="onTriggerRun"
        >
          {{ isStreaming ? '분석 중…' : '상시 분석 실행' }}
        </button>
      </div>
    </div>

    <div v-if="isError" class="mb-4 p-4 rounded-lg bg-status-critical/5 border border-status-critical/20 text-status-critical text-sm print:hidden">
      Run 목록 로드 실패 — MSW mock 또는 sla-agent-service(:8090) /api/finops 연결을 확인하세요.
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 print:block">
      <div class="xl:col-span-5 min-w-0 print:hidden">
        <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">분석 이력 (상시 배치)</div>
        <FinOpsRunTable
          :runs="runs ?? []"
          :selected-run-id="selectedRunId"
          :is-loading="isLoading"
          @select="selectRun"
        />
      </div>

      <div class="xl:col-span-7 min-w-0 space-y-4">
        <div v-if="showConsole || isStreaming" class="print:hidden">
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Agent Console</div>
          <FinOpsRunConsole :lines="lines" :is-streaming="isStreaming" :is-done="isDone" />
        </div>

        <div v-if="detailLoading && !isStreaming" class="h-48 bg-gray-100 animate-pulse rounded-lg print:hidden" />
        <template v-else-if="selectedRun">
          <FinOpsRcaBanner :run="selectedRun" class="print:hidden" @view-detail="onViewRcaDetail" />
          <div class="flex gap-2 border-b border-border print:hidden overflow-x-auto">
            <button
              type="button"
              class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors whitespace-nowrap"
              :class="detailTab === 'optimization' ? 'border-brand text-brand' : 'border-transparent text-gray-400'"
              @click="detailTab = 'optimization'"
            >
              절감 리포트
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors whitespace-nowrap"
              :class="detailTab === 'markdown' ? 'border-brand text-brand' : 'border-transparent text-gray-400'"
              @click="detailTab = 'markdown'"
            >
              경영 Markdown
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors whitespace-nowrap"
              :class="detailTab === 'report' ? 'border-brand text-brand' : 'border-transparent text-gray-400'"
              @click="detailTab = 'report'"
            >
              KPI 대시보드
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors whitespace-nowrap"
              :class="detailTab === 'findings' ? 'border-brand text-brand' : 'border-transparent text-gray-400'"
              @click="detailTab = 'findings'"
            >
              전체 Findings
            </button>
          </div>

          <div
            :class="[
              'transition-all duration-500',
              reportReveal && !isStreaming ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
            ]"
          >
            <FinOpsOptimizationReport
              v-if="detailTab === 'optimization' && !isStreaming"
              :run="selectedRun"
              @adopt="onAdoptProposal"
            />

            <FinOpsMarkdownReport v-else-if="detailTab === 'markdown' && !isStreaming" :run="selectedRun" />

            <FinOpsExecutiveReport v-else-if="detailTab === 'report' && !isStreaming" :run="selectedRun" />

            <div v-else-if="detailTab === 'findings' && !isStreaming" class="space-y-4">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Findings (guarded, 전체)</div>
              <FinOpsFindingsTable :findings="selectedRun.findings_snapshot?.findings ?? []" />
            </div>

            <div v-else-if="isStreaming" class="p-8 text-center text-gray-400 text-sm">
              FinOps 파이프라인 실행 중 — 완료 후 절감 리포트가 표시됩니다.
            </div>
          </div>

          <div v-if="!isStreaming" id="finops-approval-panel" class="print:hidden">
            <FinOpsApprovalPanel :run="selectedRun" :adopted-proposal="adoptedProposal" />
          </div>
        </template>
        <div v-else-if="!isStreaming" class="p-12 text-center text-gray-400 bg-bg-card border border-border rounded-lg print:hidden">
          Run을 선택하거나 「상시 분석 실행」을 눌러 주세요
        </div>
      </div>
    </div>

    <FinOpsPolicyRationale />
  </div>
</template>
