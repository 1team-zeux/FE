<script setup lang="ts">
import { computed } from 'vue'
import type { FinOpsRun } from '../types/finops.schema'
import FinOpsRcaDetail from './FinOpsRcaDetail.vue'
import {
  formatDate,
  formatKrw,
  formatUsd,
  resolveExecutiveReport,
  statusBadgeClass,
} from '../utils/executiveReport'
import { actionLabel, patternLabel } from '../utils/proposalNarrative'

const props = defineProps<{
  run: FinOpsRun
}>()

const exec = computed(() => resolveExecutiveReport(props.run))
const dq = computed(() => props.run.data_quality_summary)
const funnel = computed(() => exec.value.funnel)
const priority = computed(() => exec.value.priority_summary)
const backlog = computed(() => exec.value.prioritized_backlog ?? [])
const patterns = computed(() => exec.value.pattern_rollup ?? [])
const blockedDefer = computed(() => exec.value.blocked_defer ?? [])
const sla = computed(() => exec.value.sla_context)
const scope = computed(() => exec.value.scope)

const p0Count = computed(() => priority.value?.P0.count ?? 0)
const budgetVsSavings = computed(() => {
  const budget = sla.value?.monthly_budget_krw
  const waste = exec.value.total_monthly_waste_usd
  if (!budget || waste == null) return null
  const wasteKrw = waste * 1350
  const pct = budget > 0 ? Math.round((wasteKrw / budget) * 100) : 0
  return { wasteKrw, pct }
})

const funnelMax = computed(() => {
  const f = funnel.value
  if (!f) return 1
  return Math.max(f.findings_total, 1)
})

const priorityClass = (band?: string) =>
  ({
    P0: 'bg-status-critical/10 text-status-critical border-status-critical/30',
    P1: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    P2: 'bg-gray-100 text-gray-600 border-border',
  }[band ?? ''] ?? 'bg-gray-100 text-gray-500 border-border')

function guardStatusClass(status?: string) {
  if (status === 'defer') return 'bg-status-warning/10 text-status-warning border-status-warning/30'
  if (status === 'blocked') return 'bg-status-critical/10 text-status-critical border-status-critical/30'
  return 'bg-gray-100 text-gray-500 border-border'
}

const GUARD_LABELS: Record<string, string> = {
  defer: '보류',
  blocked: '차단',
  eligible: '제안 가능',
}
</script>

<template>
  <article class="finops-exec-report space-y-5 print:space-y-4">
    <!-- 헤더 -->
    <header class="bg-bg-card border border-border rounded-xl px-5 py-4 print:border-gray-300">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-text-primary tracking-tight">
            {{ run.service_name ?? run.service_id }}
          </h2>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ run.tenant_id }} · {{ run.schedule_window ?? '—' }}
          </p>
        </div>
        <div class="text-right text-sm">
          <span
            class="inline-block px-3 py-1 rounded-full border text-[11px] font-bold uppercase"
            :class="statusBadgeClass(run.status)"
          >
            {{ run.status }}
          </span>
          <p class="text-gray-400 text-[11px] mt-1.5">{{ formatDate(run.finished_at ?? run.created_at) }}</p>
        </div>
      </div>
    </header>

    <!-- 요약 문장 -->
    <section class="bg-brand/5 border border-brand/20 rounded-xl px-5 py-4">
      <p v-if="exec.report_summary" class="text-[15px] leading-relaxed text-text-primary">
        {{ exec.report_summary }}
      </p>
      <p v-else class="text-sm text-gray-600 leading-relaxed">
        이번 주기에 제안 가능한 항목 <strong>{{ funnel?.eligible ?? 0 }}건</strong>을 발견했습니다.
        예상 절감액은 <strong>{{ formatUsd(exec.total_monthly_waste_usd) }}/월</strong>입니다.
        보류 {{ funnel?.defer ?? 0 }}건 · 차단 {{ funnel?.blocked ?? 0 }}건은 SLA 검토 후 별도 조치가 필요합니다.
      </p>
      <p class="text-[11px] text-gray-400 mt-3 border-t border-border/60 pt-2.5">
        이 보고서는 권유·검토용입니다. 자동 실행 없음.
      </p>
    </section>

    <!-- KPI -->
    <section class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <div class="bg-bg-card border border-border rounded-lg px-4 py-3">
        <div class="text-[10px] text-gray-400 font-bold">월 절감 예상</div>
        <div class="text-xl font-bold text-brand mt-1">{{ formatUsd(exec.total_monthly_waste_usd) }}</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg px-4 py-3">
        <div class="text-[10px] text-gray-400 font-bold">긴급 항목</div>
        <div class="text-xl font-bold text-status-critical mt-1">{{ p0Count }}</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg px-4 py-3">
        <div class="text-[10px] text-gray-400 font-bold">제안 가능</div>
        <div class="text-xl font-bold text-status-ok mt-1">{{ funnel?.eligible ?? 0 }}</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg px-4 py-3">
        <div class="text-[10px] text-gray-400 font-bold">보류 / 차단</div>
        <div class="text-xl font-bold mt-1">{{ funnel?.defer ?? 0 }} / {{ funnel?.blocked ?? 0 }}</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg px-4 py-3">
        <div class="text-[10px] text-gray-400 font-bold">월 예산</div>
        <div class="text-lg font-bold mt-1">{{ formatKrw(sla?.monthly_budget_krw) }}</div>
      </div>
      <div v-if="budgetVsSavings" class="bg-bg-card border border-border rounded-lg px-4 py-3">
        <div class="text-[10px] text-gray-400 font-bold">예산 대비 절감</div>
        <div class="text-xl font-bold mt-1">{{ budgetVsSavings.pct }}%</div>
        <div class="text-[10px] text-gray-400">≈ {{ formatKrw(budgetVsSavings.wasteKrw) }}</div>
      </div>
    </section>

    <!-- 운영 맥락 + 기회 퍼널 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="bg-bg-card border border-border rounded-xl px-5 py-4">
        <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">운영 환경</h3>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt class="text-gray-400 text-[11px]">환경</dt><dd class="font-bold">{{ sla?.environment ?? '—' }}</dd></div>
          <div><dt class="text-gray-400 text-[11px]">리전</dt><dd class="font-bold">{{ sla?.primary_region ?? '—' }}</dd></div>
          <div><dt class="text-gray-400 text-[11px]">평가 기간</dt><dd class="font-bold">{{ scope?.evaluation_days ? `${scope.evaluation_days}일` : '—' }}</dd></div>
          <div>
            <dt class="text-gray-400 text-[11px]">운영 보수 모드</dt>
            <dd class="font-bold">{{ scope?.prod_recommend_block ? '활성' : '비활성' }}</dd>
          </div>
        </dl>
      </section>

      <section class="bg-bg-card border border-border rounded-xl px-5 py-4">
        <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">절감 기회 흐름</h3>
        <div v-if="funnel" class="space-y-2">
          <div v-for="row in [
            { label: '탐지된 항목', val: funnel.findings_total, cls: 'bg-gray-300' },
            { label: '가드 검토 후', val: funnel.guarded_total, cls: 'bg-gray-400' },
            { label: '제안 가능', val: funnel.eligible, cls: 'bg-status-ok' },
            { label: '보류', val: funnel.defer, cls: 'bg-status-warning' },
            { label: '차단', val: funnel.blocked, cls: 'bg-status-critical' },
          ]" :key="row.label" class="flex items-center gap-3 text-sm">
            <span class="w-24 text-[11px] text-gray-500 shrink-0">{{ row.label }}</span>
            <div class="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
              <div class="h-full rounded transition-all" :class="row.cls" :style="{ width: `${(row.val / funnelMax) * 100}%` }" />
            </div>
            <span class="w-8 text-right font-bold text-sm">{{ row.val }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- 우선순위 분포 -->
    <section v-if="priority" class="grid grid-cols-3 gap-3">
      <div
        v-for="(band, key) in ({ P0: '긴급', P1: '주의', P2: '일반' } as const)"
        :key="key"
        class="bg-bg-card border border-border rounded-lg px-4 py-3 text-center"
      >
        <span class="inline-block px-2 py-0.5 rounded border text-[10px] font-bold" :class="priorityClass(key)">{{ band }}</span>
        <div class="text-2xl font-bold mt-2">{{ priority[key].count }}</div>
        <div class="text-sm text-brand font-bold">{{ formatUsd(priority[key].waste_usd) }}</div>
      </div>
    </section>

    <!-- 유형별 절감 -->
    <section v-if="patterns.length" class="bg-bg-card border border-border rounded-xl px-5 py-4">
      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">유형별 절감 기회</h3>
      <div class="space-y-2">
        <div v-for="p in patterns" :key="p.pattern_id" class="flex items-center gap-3 text-sm">
          <span class="w-40 text-[11px] text-gray-600 truncate" :title="p.pattern_id">
            {{ patternLabel(p.pattern_id) ?? p.pattern_id }}
          </span>
          <div class="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
            <div
              class="h-full bg-brand/70 rounded"
              :style="{ width: `${patterns[0]?.waste_usd ? (p.waste_usd / patterns[0].waste_usd) * 100 : 0}%` }"
            />
          </div>
          <span class="w-16 text-right font-bold text-brand">{{ formatUsd(p.waste_usd) }}</span>
          <span class="w-10 text-right text-gray-400 text-[11px]">{{ p.count }}건</span>
        </div>
      </div>
    </section>

    <!-- 우선 조치 목록 -->
    <section class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="px-5 py-3 border-b border-border bg-bg-muted">
        <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">우선 조치 목록 ({{ backlog.length }}건)</h3>
      </div>
      <div v-if="!backlog.length" class="p-8 text-center text-gray-400 text-sm">제안 가능한 항목이 없습니다.</div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-border text-[10px] uppercase tracking-wider text-gray-400">
          <tr class="text-left">
            <th class="px-4 py-2.5 font-bold">우선순위</th>
            <th class="px-4 py-2.5 font-bold">유형</th>
            <th class="px-4 py-2.5 font-bold">리소스</th>
            <th class="px-4 py-2.5 font-bold">조치</th>
            <th class="px-4 py-2.5 font-bold">절감/월</th>
            <th class="px-4 py-2.5 font-bold">신뢰도</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in backlog" :key="item.resource_id + i" class="border-b border-border last:border-0 hover:bg-bg-muted/50">
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded border text-[10px] font-bold" :class="priorityClass(item.priority_band)">
                {{ item.priority_band === 'P0' ? '긴급' : item.priority_band === 'P1' ? '주의' : item.priority_band ?? '—' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-600 text-[12px]">{{ patternLabel(item.pattern_id) ?? item.pattern_id ?? '—' }}</td>
            <td class="px-4 py-3 font-mono text-[11px]">{{ item.resource_id }}</td>
            <td class="px-4 py-3 font-bold">{{ actionLabel(item.recommended_action) }}</td>
            <td class="px-4 py-3 font-bold text-brand">{{ formatUsd(item.monthly_waste_usd) }}</td>
            <td class="px-4 py-3 text-gray-500">{{ item.confidence_score != null ? `${Math.round(item.confidence_score * 100)}%` : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 보류·차단 목록 -->
    <section v-if="blockedDefer.length" class="bg-bg-card border border-dashed border-border rounded-xl px-5 py-4">
      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">보류·차단 항목</h3>
      <ul class="space-y-2 text-sm">
        <li v-for="(item, i) in blockedDefer" :key="item.resource_id + i" class="flex flex-wrap gap-2 items-baseline">
          <code class="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded font-mono">{{ item.resource_id }}</code>
          <span
            class="px-2 py-0.5 rounded border text-[10px] font-bold uppercase"
            :class="guardStatusClass(item.guard_status)"
          >
            {{ GUARD_LABELS[item.guard_status ?? ''] ?? item.guard_status }}
          </span>
          <span class="text-gray-500 text-[12px]">{{ item.guard_reason }}</span>
          <span v-if="item.monthly_waste_usd" class="text-brand font-bold ml-auto">{{ formatUsd(item.monthly_waste_usd) }}</span>
        </li>
      </ul>
    </section>

    <!-- 장애 이력 연동 (접혀 있음) -->
    <details v-if="dq?.rca_linked" class="rounded-xl border border-border overflow-hidden group">
      <summary class="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-bg-muted list-none text-[11px] font-bold text-gray-500">
        장애 이력 연동 상세
        <svg class="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </summary>
      <div class="border-t border-border">
        <FinOpsRcaDetail :run="run" />
      </div>
    </details>

    <!-- 데이터 신뢰도 -->
    <section
      v-if="dq"
      class="px-4 py-3 rounded-xl border text-[12px]"
      :class="dq.overall_quality === 'ok' || dq.overall_quality === 'real' ? 'bg-status-ok/5 border-status-ok/20' : 'bg-status-warning/5 border-status-warning/20'"
    >
      <span class="font-bold">데이터 신뢰도: {{ dq.overall_quality === 'ok' || dq.overall_quality === 'real' ? '정상' : '주의' }}</span>
      <span class="text-gray-500 ml-2">
        인프라 데이터: {{ dq.cmdb_source }}
        <template v-if="dq.utilization_source"> · 이용률: {{ dq.utilization_source }}</template>
        <template v-if="dq.eb_available != null"> · Error Budget: {{ dq.eb_available ? '연동됨' : '없음' }}</template>
        <template v-if="dq.rca_linked != null"> · 장애 이력: {{ dq.rca_linked ? '연동됨' : '없음' }}</template>
      </span>
      <ul v-if="dq.warnings?.length" class="mt-2 text-gray-500 list-disc list-inside">
        <li v-for="(w, i) in dq.warnings" :key="i">{{ w }}</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
@media print {
  .finops-exec-report {
    font-size: 11px;
  }
}
</style>
