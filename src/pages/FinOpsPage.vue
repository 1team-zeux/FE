<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useFinOpsRunsQuery,
  useFinOpsRunQuery,
  FinOpsRunTable,
  FinOpsApprovalPanel,
  FinOpsExecutiveReport,
  FinOpsRunConsole,
  FinOpsOptimizationReport,
  FinOpsRcaBanner,
  useFinOpsRunStream,
  downloadExecutiveReportMarkdown,
} from '@/features/finops'
import type { OptimizationProposal } from '@/features/finops/types/finops.schema'

const route = useRoute()
const router = useRouter()

const tenantFilter = ref('')
const detailTab = ref<'optimization' | 'report'>('optimization')
const showExportMenu = ref(false)
const showConsole = ref(false)
const reportReveal = ref(true)
const adoptedProposal = ref<OptimizationProposal | null>(null)
const selectedRunId = ref<string | undefined>(
  typeof route.params.runId === 'string' ? route.params.runId : undefined,
)

const { data: runs, isLoading, isError, refetch } = useFinOpsRunsQuery(
  computed(() => ({
    tenantId: tenantFilter.value || undefined,
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
    tenantId: tenantFilter.value || 'skala-commerce',
    teamId: 'platform-team',
    serviceId: 'payment-api',
    force: true,
  })
}

const onAdoptProposal = (proposal: OptimizationProposal) => {
  adoptedProposal.value = proposal
  const el = document.getElementById('finops-approval-panel')
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const onDownloadMarkdown = () => {
  if (selectedRun.value) downloadExecutiveReportMarkdown(selectedRun.value)
  showExportMenu.value = false
}

const onPrint = () => {
  showExportMenu.value = false
  window.print()
}

const onViewRcaDetail = () => {
  detailTab.value = 'report'
  nextTick(() => {
    document.getElementById('finops-rca-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
</script>

<template>
  <div class="py-6 px-8 print:py-4 print:px-4">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-text-primary">비용 절감</h1>
        <select
          v-model="tenantFilter"
          class="text-[12px] border border-border rounded-md px-2.5 py-1.5 bg-bg-card text-text-primary cursor-pointer focus:outline-none focus:border-brand"
        >
          <option value="">모든 고객사</option>
          <option v-for="tenantId in tenantOptions" :key="tenantId" :value="tenantId">
            {{ tenantId }}
          </option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <button
            type="button"
            class="px-3 py-1.5 rounded-md border border-border bg-bg-card text-sm font-bold hover:bg-bg-muted disabled:opacity-40 flex items-center gap-1"
            :disabled="!selectedRun"
            @click="showExportMenu = !showExportMenu"
          >
            내보내기
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div
            v-if="showExportMenu"
            class="absolute right-0 top-full mt-1 w-40 bg-bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden"
          >
            <button type="button" class="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-muted" @click="onDownloadMarkdown">Markdown 다운로드</button>
            <button type="button" class="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-muted" @click="onPrint">인쇄 / PDF</button>
          </div>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 rounded-md bg-brand text-white text-sm font-bold hover:brightness-110 disabled:opacity-50"
          :disabled="isStreaming"
          @click="onTriggerRun"
        >
          {{ isStreaming ? '분석 중…' : '분석 실행' }}
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

          <div class="flex gap-1 border-b border-border print:hidden mb-1">
            <button
              type="button"
              class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors"
              :class="detailTab === 'optimization' ? 'border-brand text-brand' : 'border-transparent text-gray-400 hover:text-text-primary'"
              @click="detailTab = 'optimization'"
            >
              절감 제안
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors"
              :class="detailTab === 'report' ? 'border-brand text-brand' : 'border-transparent text-gray-400 hover:text-text-primary'"
              @click="detailTab = 'report'"
            >
              KPI 현황
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
            <FinOpsExecutiveReport v-else-if="detailTab === 'report' && !isStreaming" :run="selectedRun" />
            <div v-else-if="isStreaming" class="p-8 text-center text-gray-400 text-sm">
              분석 중입니다. 완료되면 결과가 표시됩니다.
            </div>
          </div>

          <div v-if="adoptedProposal && !isStreaming" id="finops-approval-panel" class="print:hidden mt-4">
            <FinOpsApprovalPanel :run="selectedRun" :adopted-proposal="adoptedProposal" />
          </div>
        </template>
        <div v-else-if="!isStreaming" class="p-12 text-center text-gray-400 bg-bg-card border border-border rounded-lg print:hidden">
          Run을 선택하거나 「분석 실행」을 눌러 주세요
        </div>
      </div>
    </div>
  </div>
</template>
