<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  useFinOpsRunStream,
  downloadExecutiveReportMarkdown,
} from '@/features/finops'

const route = useRoute()
const router = useRouter()

const serviceFilter = ref('')
const detailTab = ref<'markdown' | 'report' | 'findings'>('markdown')
const showConsole = ref(false)
const reportReveal = ref(false)
const selectedRunId = ref<string | undefined>(
  typeof route.params.runId === 'string' ? route.params.runId : undefined,
)

const { data: runs, isLoading, isError, refetch } = useFinOpsRunsQuery(
  computed(() => ({ serviceId: serviceFilter.value || undefined })),
)

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

watch(selectedRunId, (id) => {
  if (id) {
    router.replace({ name: 'finops', params: { runId: id } })
  }
  reportReveal.value = false
  requestAnimationFrame(() => {
    reportReveal.value = true
  })
})

watch(isDone, async (done) => {
  if (!done) return
  await refetch()
  if (donePayload.value?.run_id) {
    selectedRunId.value = donePayload.value.run_id
    detailTab.value = 'markdown'
  }
})

const selectRun = (runId: string) => {
  selectedRunId.value = runId
  detailTab.value = 'markdown'
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

const onPrint = () => window.print()

const onDownloadMarkdown = () => {
  if (selectedRun.value) {
    downloadExecutiveReportMarkdown(selectedRun.value)
  }
}
</script>

<template>
  <div class="py-8 px-8 print:py-4 print:px-4">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
      <div>
        <div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">FinOps Agent</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">경영 보고서</h1>
        <p class="text-gray-500 mt-1 text-sm">유휴·과잉 탐지 → SLA 가드 → 절감 추정 → 경영 권유 (MVP: 실행 없음)</p>
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
          {{ isStreaming ? '실행 중…' : 'Run 실행' }}
        </button>
      </div>
    </div>

    <div v-if="isError" class="mb-4 p-4 rounded-lg bg-status-critical/5 border border-status-critical/20 text-status-critical text-sm print:hidden">
      Run 목록 로드 실패 — MSW mock 또는 sla-agent-service 연결을 확인하세요.
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6 print:block">
      <div class="xl:col-span-2 print:hidden">
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Run 이력</div>
        <FinOpsRunTable
          :runs="runs ?? []"
          :selected-run-id="selectedRunId"
          :is-loading="isLoading"
          @select="selectRun"
        />
      </div>

      <div class="xl:col-span-3 space-y-4">
        <div v-if="showConsole || isStreaming" class="print:hidden">
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Agent Console</div>
          <FinOpsRunConsole :lines="lines" :is-streaming="isStreaming" :is-done="isDone" />
        </div>

        <div v-if="detailLoading && !isStreaming" class="h-48 bg-gray-100 animate-pulse rounded-lg print:hidden" />
        <template v-else-if="selectedRun">
          <div class="flex gap-2 border-b border-border print:hidden">
            <button
              type="button"
              class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors"
              :class="detailTab === 'markdown' ? 'border-brand text-brand' : 'border-transparent text-gray-400'"
              @click="detailTab = 'markdown'"
            >
              마크다운 보고서
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors"
              :class="detailTab === 'report' ? 'border-brand text-brand' : 'border-transparent text-gray-400'"
              @click="detailTab = 'report'"
            >
              대시보드
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors"
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
            <FinOpsMarkdownReport v-if="detailTab === 'markdown' && !isStreaming" :run="selectedRun" />

            <FinOpsExecutiveReport v-else-if="detailTab === 'report' && !isStreaming" :run="selectedRun" />

            <div v-else-if="detailTab === 'findings' && !isStreaming" class="space-y-4">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Findings (guarded, 전체)</div>
              <FinOpsFindingsTable :findings="selectedRun.findings_snapshot?.findings ?? []" />
            </div>

            <div v-else-if="isStreaming" class="p-8 text-center text-gray-400 text-sm">
              파이프라인 실행 중 — 완료 후 마크다운 보고서가 표시됩니다.
            </div>
          </div>

          <div v-if="!isStreaming" class="print:hidden">
            <FinOpsApprovalPanel :run="selectedRun" />
          </div>
        </template>
        <div v-else-if="!isStreaming" class="p-12 text-center text-gray-400 bg-bg-card border border-border rounded-lg print:hidden">
          Run을 선택하거나 실행하세요
        </div>
      </div>
    </div>
  </div>
</template>
