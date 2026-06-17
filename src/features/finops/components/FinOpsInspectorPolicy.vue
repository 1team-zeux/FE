<script setup lang="ts">
import type { FinOpsFinding, FinOpsRun, OptimizationProposal, TradeoffRow } from '../types/finops.schema'
import FinOpsRcaDetail from './FinOpsRcaDetail.vue'
import { formatKrwCompact, slaImpactClass, slaImpactLabel } from '../utils/optimizationReport'

defineProps<{
  run: FinOpsRun
  finding: FinOpsFinding | null
  proposal: OptimizationProposal
  tradeoffRows?: TradeoffRow[]
}>()
</script>

<template>
  <div class="space-y-3">
    <!-- SLA 판정 + Guard 통합 -->
    <div class="rounded-xl border px-4 py-4 space-y-2" :class="slaImpactClass(proposal.sla_impact)">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[10px] font-bold uppercase tracking-wider">SLA 영향</span>
        <span
          v-if="finding?.guard_status"
          class="px-2 py-0.5 rounded border text-[9px] font-bold uppercase"
          :class="{
            'bg-status-ok/10 text-status-ok border-status-ok/30': finding.guard_status === 'eligible',
            'bg-status-warning/10 text-status-warning border-status-warning/30': finding.guard_status === 'defer',
            'bg-status-critical/10 text-status-critical border-status-critical/30': finding.guard_status === 'blocked',
          }"
        >
          {{ finding.guard_status }}
        </span>
      </div>
      <p class="text-sm font-medium leading-relaxed">
        <template v-if="proposal.sla_target">목표 {{ proposal.sla_target }} · </template>
        {{ proposal.sla_impact_detail ?? 'Error Budget · 서비스 티어 기준으로 검토되었습니다.' }}
      </p>
      <p v-if="finding?.guard_reason" class="text-[12px] opacity-80 border-t border-current/15 pt-2">
        {{ finding.guard_reason }}
      </p>
      <p class="text-[10px] opacity-70">
        SLA {{ slaImpactLabel(proposal.sla_impact) }} — 목표 대비 여유 계산 결과입니다.
      </p>
    </div>

    <!-- SLA–비용 트레이드오프 -->
    <div v-if="tradeoffRows?.length">
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
            v-for="row in tradeoffRows"
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
      <p class="text-[10px] text-gray-400 mt-1.5">
        선택 제안: {{ formatKrwCompact(proposal.monthly_savings_krw) }} 절감 · {{ proposal.recommended_action ?? proposal.title }}
      </p>
    </div>

    <!-- RCA 연동 (접혀 있음) -->
    <details v-if="run.data_quality_summary?.rca_linked" class="rounded-xl border border-border overflow-hidden group">
      <summary class="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-bg-muted list-none text-[11px] font-bold text-gray-400">
        RCA 연동 상세
        <svg class="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </summary>
      <div class="border-t border-border">
        <FinOpsRcaDetail :run="run" />
      </div>
    </details>
  </div>
</template>
