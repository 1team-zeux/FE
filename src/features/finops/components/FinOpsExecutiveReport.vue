<script setup lang="ts">
import { computed } from 'vue'
import type { FinOpsRun } from '../types/finops.schema'
import {
  formatDate,
  formatKrw,
  formatUsd,
  resolveExecutiveReport,
  statusBadgeClass,
} from '../utils/executiveReport'

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
const rca = computed(() => exec.value.rca_summary)

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
</script>

<template>
  <article class="finops-exec-report space-y-6 print:space-y-4">
    <!-- Cover -->
    <header class="bg-bg-card border border-border rounded-xl p-6 print:border-gray-300">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[10px] font-bold text-brand uppercase tracking-widest mb-1">경영 보고서</p>
          <h2 class="text-2xl font-bold text-text-primary tracking-tight">
            {{ run.service_name ?? run.service_id }}
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            {{ run.tenant_id }} · {{ run.team_id ?? '—' }} · {{ run.schedule_window ?? '—' }}
          </p>
        </div>
        <div class="text-right text-sm">
          <span
            class="inline-block px-3 py-1 rounded-full border text-[11px] font-bold uppercase"
            :class="statusBadgeClass(run.status)"
          >
            {{ run.status }}
          </span>
          <p class="text-gray-400 text-[11px] mt-2">생성 {{ formatDate(run.finished_at ?? run.created_at) }}</p>
          <p class="text-gray-400 text-[11px] font-mono">run {{ run.run_id }}</p>
        </div>
      </div>
    </header>

    <!-- Executive summary -->
    <section class="bg-gradient-to-br from-brand/5 to-transparent border border-brand/20 rounded-xl p-6">
      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">경영 요약</h3>
      <p v-if="exec.report_summary" class="text-[15px] leading-relaxed text-text-primary">
        {{ exec.report_summary }}
      </p>
      <p v-else class="text-sm text-gray-500 italic">
        이번 주기 eligible {{ funnel?.eligible ?? 0 }}건, 예상 절감 {{ formatUsd(exec.total_monthly_waste_usd) }}/월.
        SLA 가드로 defer {{ funnel?.defer ?? 0 }}건, blocked {{ funnel?.blocked ?? 0 }}건이 별도 관리됩니다.
      </p>
      <p class="text-[11px] text-gray-400 mt-3 border-t border-border/60 pt-3">
        MVP: 자동 실행 없음 — 본 보고서는 권유·승인(HITL)용 제안서입니다.
      </p>
    </section>

    <!-- KPI row -->
    <section class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <div class="bg-bg-card border border-border rounded-lg p-4">
        <div class="text-[10px] text-gray-400 uppercase font-bold">예상 절감/월</div>
        <div class="text-xl font-bold text-brand mt-1">{{ formatUsd(exec.total_monthly_waste_usd) }}</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg p-4">
        <div class="text-[10px] text-gray-400 uppercase font-bold">P0 즉시</div>
        <div class="text-xl font-bold text-status-critical mt-1">{{ p0Count }}</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg p-4">
        <div class="text-[10px] text-gray-400 uppercase font-bold">Eligible</div>
        <div class="text-xl font-bold text-status-ok mt-1">{{ funnel?.eligible ?? 0 }}</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg p-4">
        <div class="text-[10px] text-gray-400 uppercase font-bold">Defer / Block</div>
        <div class="text-xl font-bold mt-1">{{ funnel?.defer ?? 0 }} / {{ funnel?.blocked ?? 0 }}</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg p-4">
        <div class="text-[10px] text-gray-400 uppercase font-bold">월 예산</div>
        <div class="text-lg font-bold mt-1">{{ formatKrw(sla?.monthly_budget_krw) }}</div>
      </div>
      <div v-if="budgetVsSavings" class="bg-bg-card border border-border rounded-lg p-4">
        <div class="text-[10px] text-gray-400 uppercase font-bold">절감/예산</div>
        <div class="text-xl font-bold mt-1">{{ budgetVsSavings.pct }}%</div>
        <div class="text-[10px] text-gray-400">≈ {{ formatKrw(budgetVsSavings.wasteKrw) }}</div>
      </div>
    </section>

    <!-- Context + funnel -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="bg-bg-card border border-border rounded-xl p-5">
        <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">운영·SLA 맥락</h3>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt class="text-gray-400 text-[11px]">환경</dt><dd class="font-bold">{{ sla?.environment ?? '—' }}</dd></div>
          <div><dt class="text-gray-400 text-[11px]">리전</dt><dd class="font-bold">{{ sla?.primary_region ?? '—' }}</dd></div>
          <div><dt class="text-gray-400 text-[11px]">평가 기간</dt><dd class="font-bold">{{ scope?.evaluation_days ? `${scope.evaluation_days}일` : '—' }}</dd></div>
          <div><dt class="text-gray-400 text-[11px]">Prod 차단</dt><dd class="font-bold">{{ scope?.prod_recommend_block ? 'Y' : 'N' }}</dd></div>
          <div class="col-span-2"><dt class="text-gray-400 text-[11px]">리전 스코프</dt><dd class="font-mono text-[12px]">{{ (scope?.regions ?? []).join(', ') || '—' }}</dd></div>
        </dl>
      </section>

      <section class="bg-bg-card border border-border rounded-xl p-5">
        <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">기회 퍼널</h3>
        <div v-if="funnel" class="space-y-2">
          <div v-for="row in [
            { label: '탐지 Findings', val: funnel.findings_total, cls: 'bg-gray-200' },
            { label: '가드 적용', val: funnel.guarded_total, cls: 'bg-gray-300' },
            { label: 'Eligible (권유)', val: funnel.eligible, cls: 'bg-status-ok' },
            { label: 'Defer', val: funnel.defer, cls: 'bg-status-warning' },
            { label: 'Blocked', val: funnel.blocked, cls: 'bg-status-critical' },
          ]" :key="row.label" class="flex items-center gap-3 text-sm">
            <span class="w-28 text-[11px] text-gray-500 shrink-0">{{ row.label }}</span>
            <div class="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
              <div class="h-full rounded transition-all" :class="row.cls" :style="{ width: `${(row.val / funnelMax) * 100}%` }" />
            </div>
            <span class="w-8 text-right font-bold">{{ row.val }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- Priority mix -->
    <section v-if="priority" class="grid grid-cols-3 gap-3">
      <div
        v-for="band in (['P0', 'P1', 'P2'] as const)"
        :key="band"
        class="bg-bg-card border border-border rounded-lg p-4 text-center"
      >
        <span class="inline-block px-2 py-0.5 rounded border text-[10px] font-bold" :class="priorityClass(band)">{{ band }}</span>
        <div class="text-2xl font-bold mt-2">{{ priority[band].count }}</div>
        <div class="text-sm text-brand font-bold">{{ formatUsd(priority[band].waste_usd) }}</div>
      </div>
    </section>

    <!-- Pattern rollup -->
    <section v-if="patterns.length" class="bg-bg-card border border-border rounded-xl p-5">
      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">패턴별 절감 (Eligible)</h3>
      <div class="space-y-2">
        <div v-for="p in patterns" :key="p.pattern_id" class="flex items-center gap-3 text-sm">
          <span class="w-40 font-mono text-[11px] text-gray-600 truncate" :title="p.pattern_id">{{ p.pattern_id }}</span>
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

    <!-- Top actions -->
    <section class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="px-5 py-3 border-b border-border bg-bg-muted">
        <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">우선 조치 권유 (Top {{ backlog.length }})</h3>
      </div>
      <div v-if="!backlog.length" class="p-8 text-center text-gray-400 text-sm">eligible backlog 없음</div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-border text-[10px] uppercase tracking-wider text-gray-400">
          <tr class="text-left">
            <th class="px-4 py-3 font-bold">우선</th>
            <th class="px-4 py-3 font-bold">패턴</th>
            <th class="px-4 py-3 font-bold">리소스</th>
            <th class="px-4 py-3 font-bold">권유</th>
            <th class="px-4 py-3 font-bold">절감/월</th>
            <th class="px-4 py-3 font-bold">신뢰도</th>
            <th class="px-4 py-3 font-bold">근거</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in backlog" :key="item.resource_id + i" class="border-b border-border last:border-0 hover:bg-bg-muted/50">
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded border text-[10px] font-bold" :class="priorityClass(item.priority_band)">
                {{ item.priority_band ?? '—' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-500 text-[12px]">{{ item.pattern_id ?? '—' }}</td>
            <td class="px-4 py-3 font-mono text-[11px]">{{ item.resource_id }}</td>
            <td class="px-4 py-3 font-bold">{{ item.recommended_action ?? '—' }}</td>
            <td class="px-4 py-3 font-bold text-brand">{{ formatUsd(item.monthly_waste_usd) }}</td>
            <td class="px-4 py-3">{{ item.confidence_score != null ? `${Math.round(item.confidence_score * 100)}%` : '—' }}</td>
            <td class="px-4 py-3 text-[11px] text-gray-500 max-w-[200px] truncate" :title="item.reason ?? undefined">{{ item.reason ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- RCA -->
    <section v-if="rca" class="bg-bg-card border border-border rounded-xl p-5">
      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">RCA 연동</h3>
      <p class="text-sm text-gray-500 mb-3">FinOps 판단에 RCA 힌트 {{ rca.hint_count }}건 반영</p>
      <ul class="text-sm space-y-1 list-disc list-inside text-gray-600">
        <li v-for="(h, i) in rca.hints" :key="i">
          <b>{{ h.cause_type }}</b>
          <span v-if="h.confidence != null"> ({{ Math.round(h.confidence * 100) }}%)</span>
          — {{ h.rationale }}
        </li>
      </ul>
      <p v-if="rca.rules_applied?.length" class="text-[11px] text-gray-400 mt-2">
        적용 규칙: {{ rca.rules_applied.join(', ') }}
      </p>
    </section>

    <!-- Blocked / defer appendix -->
    <section v-if="blockedDefer.length" class="bg-bg-card border border-dashed border-border rounded-xl p-5">
      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">부록 — SLA 가드 (Defer / Blocked)</h3>
      <ul class="space-y-2 text-sm">
        <li v-for="(item, i) in blockedDefer" :key="item.resource_id + i" class="flex flex-wrap gap-2 items-baseline">
          <code class="text-[11px] bg-gray-100 px-1 rounded">{{ item.resource_id }}</code>
          <span class="px-2 py-0.5 rounded border text-[10px] font-bold uppercase" :class="priorityClass(item.guard_status === 'defer' ? 'P1' : 'P0')">
            {{ item.guard_status }}
          </span>
          <span class="text-gray-500 text-[12px]">{{ item.guard_reason }}</span>
          <span v-if="item.monthly_waste_usd" class="text-brand font-bold ml-auto">{{ formatUsd(item.monthly_waste_usd) }}</span>
        </li>
      </ul>
    </section>

    <!-- Data quality -->
    <section
      v-if="dq"
      class="px-5 py-4 rounded-xl border text-[12px]"
      :class="dq.overall_quality === 'ok' || dq.overall_quality === 'real' ? 'bg-status-ok/5 border-status-ok/20' : 'bg-status-warning/5 border-status-warning/20'"
    >
      <span class="font-bold uppercase">데이터 신뢰도: {{ dq.overall_quality ?? 'unknown' }}</span>
      <span class="text-gray-500 ml-2">
        CMDB {{ dq.cmdb_source }} · 이용률 {{ dq.utilization_source }}
        <template v-if="dq.eb_available != null"> · EB {{ dq.eb_available ? 'OK' : 'N/A' }}</template>
        <template v-if="dq.rca_linked != null"> · RCA {{ dq.rca_linked ? '연동' : '없음' }}</template>
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
