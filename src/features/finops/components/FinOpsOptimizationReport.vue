<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FinOpsRun, OptimizationCategory, OptimizationProposal } from '../types/finops.schema'
import {
  CATEGORY_LABELS,
  filterByCategory,
  formatKrwCompact,
  resolveOptimizationReport,
  slaImpactClass,
  slaImpactLabel,
  sortBySavings,
  totalSavingsKrw,
} from '../utils/optimizationReport'

const props = defineProps<{
  run: FinOpsRun
}>()

const emit = defineEmits<{
  adopt: [proposal: OptimizationProposal]
}>()

const router = useRouter()
const activeCategory = ref<OptimizationCategory | 'all'>('all')
const selectedId = ref<string | null>(null)
const showTerraformPeek = ref(false)

const report = computed(() => resolveOptimizationReport(props.run))
const allProposals = computed(() => sortBySavings(report.value.proposals))
const filtered = computed(() =>
  sortBySavings(filterByCategory(allProposals.value, activeCategory.value)),
)
const totalKrw = computed(() => totalSavingsKrw(allProposals.value))

const selected = computed(() =>
  filtered.value.find((p) => p.id === selectedId.value) ?? filtered.value[0] ?? null,
)

const categories = computed(() => {
  const counts: Record<string, number> = { all: allProposals.value.length }
  for (const p of allProposals.value) {
    counts[p.category] = (counts[p.category] ?? 0) + 1
  }
  return counts
})

function selectProposal(p: OptimizationProposal) {
  selectedId.value = p.id
}

function sparklinePoints(values: number[]): string {
  if (!values.length) return ''
  const w = 200
  const h = 48
  const max = Math.max(...values, 1)
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - (v / max) * (h - 8) - 4
      return `${x},${y}`
    })
    .join(' ')
}

function onAdopt() {
  if (!selected.value) return
  emit('adopt', selected.value)
  if (selected.value.terraform_handoff) {
    showTerraformPeek.value = true
    setTimeout(() => {
      router.push({ path: '/iac/deploy', query: { from: 'finops', proposal: selected.value!.id } })
    }, 1200)
  }
}

const priorityClass = (band?: string) =>
  ({
    P0: 'bg-status-critical/10 text-status-critical',
    P1: 'bg-status-warning/10 text-status-warning',
    P2: 'bg-gray-100 text-gray-600',
  })[band ?? ''] ?? 'bg-gray-100 text-gray-500'
</script>

<template>
  <article class="finops-opt-report space-y-6">
    <!-- Beat 1: Hero + category tabs -->
    <header class="bg-gradient-to-br from-brand/8 via-bg-card to-bg-card border border-brand/25 rounded-2xl p-6">
      <p class="text-[10px] font-bold text-brand uppercase tracking-widest mb-1">⑦ 최적화·비용절감 리포트</p>
      <h2 class="text-2xl font-bold text-text-primary leading-tight">
        SLA 검증을 거친 비용 절감
      </h2>
      <p class="text-sm text-gray-600 mt-3 max-w-3xl leading-relaxed">
        {{ report.lead_message }}
      </p>
      <div class="mt-5 flex flex-wrap items-end gap-6">
        <div>
          <div class="text-[10px] text-gray-400 uppercase font-bold">총 절감 가능액</div>
          <div class="text-3xl font-bold text-brand mt-0.5">
            월 ₩{{ totalKrw.toLocaleString('ko-KR') }}
          </div>
          <div class="text-[11px] text-gray-400">{{ allProposals.length }}건 eligible · {{ run.schedule_window }}</div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in (['all', 'rightsizing', 'unused', 'scheduling', 'reserved'] as const)"
            :key="cat"
            type="button"
            class="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors"
            :class="
              activeCategory === cat
                ? 'bg-brand text-white border-brand'
                : 'bg-bg-card text-gray-600 border-border hover:border-brand/40'
            "
            @click="activeCategory = cat"
          >
            {{ cat === 'all' ? '전체' : CATEGORY_LABELS[cat] }}
            <span class="opacity-70 ml-1">({{ categories[cat] ?? 0 }})</span>
          </button>
        </div>
      </div>
      <p class="text-[10px] text-gray-400 mt-4 border-t border-border/60 pt-3">
        ②~⑥ 실측 축적 → ⑦ 절감 제안 → 채택 시 ③ Terraform 검증 / 증빙은 SLA Owner 발송
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <!-- Proposal cards -->
      <section class="lg:col-span-2 space-y-2">
        <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
          절감 제안 (예상 절감액 순)
        </h3>
        <button
          v-for="p in filtered"
          :key="p.id"
          type="button"
          class="w-full text-left p-4 rounded-xl border transition-all"
          :class="
            selected?.id === p.id
              ? 'border-brand bg-brand/5 shadow-sm ring-1 ring-brand/20'
              : 'border-border bg-bg-card hover:border-brand/30'
          "
          @click="selectProposal(p)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <span class="text-[10px] font-bold text-gray-400 uppercase">{{ CATEGORY_LABELS[p.category] }}</span>
              <p class="font-bold text-text-primary text-sm mt-0.5 truncate">{{ p.service_name }}</p>
              <p class="text-[12px] text-gray-500 truncate">{{ p.title }}</p>
            </div>
            <div class="text-right shrink-0">
              <div class="text-lg font-bold text-brand">{{ formatKrwCompact(p.monthly_savings_krw) }}</div>
              <span
                v-if="p.priority_band"
                class="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                :class="priorityClass(p.priority_band)"
              >
                {{ p.priority_band }}
              </span>
            </div>
          </div>
          <span
            class="inline-block mt-2 px-2 py-0.5 rounded border text-[10px] font-bold"
            :class="slaImpactClass(p.sla_impact)"
          >
            SLA {{ slaImpactLabel(p.sla_impact) }}
          </span>
        </button>
        <p v-if="!filtered.length" class="text-sm text-gray-400 text-center py-8">해당 분류에 제안 없음</p>
      </section>

      <!-- Beat 2: Detail panel -->
      <section v-if="selected" class="lg:col-span-3 bg-bg-card border border-border rounded-2xl p-6 space-y-5">
        <div>
          <span class="text-[10px] font-bold text-brand uppercase tracking-widest">제안 상세</span>
          <h3 class="text-xl font-bold text-text-primary mt-1">
            {{ selected.service_name }}: {{ selected.title }}
          </h3>
          <p class="text-2xl font-bold text-brand mt-2">{{ formatKrwCompact(selected.monthly_savings_krw) }} 절감</p>
        </div>

        <div v-if="selected.cpu_utilization_trend?.length" class="rounded-xl bg-bg-muted/60 border border-border p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-gray-400 uppercase">실측 CPU 사용률 (14일)</span>
            <span v-if="selected.event_spike_note" class="text-[10px] text-amber-600 font-medium">
              {{ selected.event_spike_note }}
            </span>
          </div>
          <svg viewBox="0 0 200 48" class="w-full h-12" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="text-brand"
              :points="sparklinePoints(selected.cpu_utilization_trend)"
            />
          </svg>
          <p class="text-[11px] text-gray-500 mt-2">{{ selected.evidence_summary }}</p>
        </div>

        <div class="rounded-xl border p-4" :class="slaImpactClass(selected.sla_impact)">
          <div class="text-[10px] font-bold uppercase mb-1">SLA 영향 검증</div>
          <p class="text-sm font-medium leading-relaxed">
            <template v-if="selected.sla_target">목표 {{ selected.sla_target }} · </template>
            {{ selected.sla_impact_detail }}
          </p>
          <p class="text-[10px] mt-2 opacity-80">
            "영향 없음"은 단정이 아니라 목표 대비 Error Budget 여유 계산 결과입니다.
          </p>
        </div>

        <!-- Beat 3: Tradeoff (inline for selected context) -->
        <div v-if="report.tradeoff_rows?.length">
          <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">SLA–비용 트레이드오프</h4>
          <table class="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead class="bg-bg-muted text-[10px] uppercase text-gray-400">
              <tr>
                <th class="text-left px-3 py-2 font-bold">시나리오</th>
                <th class="text-right px-3 py-2 font-bold">월 비용</th>
                <th class="text-left px-3 py-2 font-bold">가용성 예상</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in report.tradeoff_rows"
                :key="row.label"
                class="border-t border-border"
                :class="row.is_recommended ? 'bg-brand/5' : ''"
              >
                <td class="px-3 py-2.5 font-medium">
                  {{ row.label }}
                  <span v-if="row.is_recommended" class="ml-1 text-[9px] text-brand font-bold">권장</span>
                </td>
                <td class="px-3 py-2.5 text-right font-bold">₩{{ row.monthly_cost_krw.toLocaleString('ko-KR') }}</td>
                <td class="px-3 py-2.5 text-gray-600 text-[12px]">{{ row.availability_forecast }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Beat 4: Adopt + Terraform handoff -->
        <div class="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
          <button
            type="button"
            class="px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-bold hover:brightness-110"
            @click="onAdopt"
          >
            운영자 검토 → 채택
          </button>
          <span
            v-if="selected.terraform_handoff"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-brand/50 text-[11px] font-bold text-brand"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            ③ Terraform 흐름 핸드오프
            <span v-if="selected.iac_change_label" class="font-normal text-gray-500">· {{ selected.iac_change_label }}</span>
          </span>
        </div>

        <Transition name="fade">
          <div
            v-if="showTerraformPeek"
            class="rounded-xl border-2 border-brand/40 bg-brand/5 p-4 text-sm"
          >
            <p class="font-bold text-brand">③ Plan 검증 — 비용 차원 (Infracost)</p>
            <p class="mt-1 text-gray-600">
              {{ selected.title }} 적용 시 예상 <strong class="text-brand">월 -{{ formatKrwCompact(selected.monthly_savings_krw) }}</strong>
              · SLA 영향 차원 재검증 중…
            </p>
            <p class="text-[11px] text-gray-400 mt-2">IaC Deploy(③) 화면으로 이동합니다</p>
          </div>
        </Transition>
      </section>
    </div>

    <!-- Beat 5: SLA evidence -->
    <section
      v-if="report.sla_evidence"
      class="bg-bg-card border border-border rounded-2xl p-6 space-y-5"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-[10px] font-bold text-brand uppercase tracking-widest">월간 SLA 이행 증빙</p>
          <h3 class="text-lg font-bold text-text-primary">{{ report.sla_evidence.period_label }}</h3>
        </div>
        <div
          v-if="report.sla_evidence.recipient"
          class="text-right text-[12px]"
        >
          <span class="text-gray-400">SLA Owner 발송</span>
          <p class="font-bold text-text-primary">{{ report.sla_evidence.recipient }}</p>
          <span
            class="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold"
            :class="
              report.sla_evidence.send_status === 'sent'
                ? 'bg-status-ok/10 text-status-ok'
                : 'bg-status-warning/10 text-status-warning'
            "
          >
            {{ report.sla_evidence.send_status === 'sent' ? '발송 완료' : '발송 대기' }}
          </span>
        </div>
      </div>

      <p class="text-sm text-gray-600 leading-relaxed bg-bg-muted/50 rounded-lg p-4 border border-border/60">
        <span class="text-[10px] font-bold text-gray-400 uppercase block mb-1">Executive Summary (LLM 초안)</span>
        {{ report.sla_evidence.executive_summary }}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          v-for="svc in report.sla_evidence.services"
          :key="svc.service_name"
          class="rounded-lg border border-border p-4"
        >
          <p class="text-[11px] font-bold text-gray-500 truncate">{{ svc.service_name }}</p>
          <p class="text-2xl font-bold text-text-primary mt-1">{{ svc.availability_actual }}</p>
          <p class="text-[10px] text-gray-400">목표 {{ svc.availability_target }}</p>
          <span
            class="inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold"
            :class="svc.status === 'met' ? 'bg-status-ok/10 text-status-ok' : 'bg-status-warning/10 text-status-warning'"
          >
            {{ svc.status === 'met' ? '충족' : '주의' }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 class="text-[10px] font-bold text-gray-400 uppercase mb-2">Error Budget 추이</h4>
          <div class="flex items-end gap-2 h-24">
            <div
              v-for="pt in report.sla_evidence.error_budget_trend"
              :key="pt.label"
              class="flex-1 flex flex-col items-center gap-1"
            >
              <div
                class="w-full bg-brand/70 rounded-t"
                :style="{ height: `${pt.remaining_pct}%` }"
              />
              <span class="text-[9px] text-gray-400">{{ pt.label }}</span>
              <span class="text-[10px] font-bold">{{ pt.remaining_pct }}%</span>
            </div>
          </div>
        </div>
        <div>
          <h4 class="text-[10px] font-bold text-gray-400 uppercase mb-2">인시던트 요약</h4>
          <p class="text-sm text-gray-600 leading-relaxed">{{ report.sla_evidence.incidents_summary }}</p>
        </div>
      </div>
    </section>
  </article>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
