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
  <div class="space-y-5">
    <div class="rounded-xl border p-4" :class="slaImpactClass(proposal.sla_impact)">
      <div class="text-[10px] font-bold uppercase mb-1">SLA 영향 검증</div>
      <p class="text-sm font-medium leading-relaxed">
        <template v-if="proposal.sla_target">목표 {{ proposal.sla_target }} · </template>
        {{ proposal.sla_impact_detail ?? 'Error Budget·서비스 티어 기준으로 검토되었습니다.' }}
      </p>
      <p class="text-[10px] mt-2 opacity-80">
        SLA {{ slaImpactLabel(proposal.sla_impact) }} — 단정이 아니라 목표 대비 여유 계산 결과입니다.
      </p>
    </div>

    <div v-if="finding?.guard_status || finding?.guard_reason" class="rounded-xl border border-border bg-bg-card p-4 space-y-2">
      <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Guard 판정</div>
      <div class="flex flex-wrap gap-2">
        <span
          v-if="finding?.guard_status"
          class="px-2 py-0.5 rounded border text-[10px] font-bold uppercase"
          :class="{
            'bg-status-ok/10 text-status-ok border-status-ok/30': finding.guard_status === 'eligible',
            'bg-status-warning/10 text-status-warning border-status-warning/30': finding.guard_status === 'defer',
            'bg-status-critical/10 text-status-critical border-status-critical/30': finding.guard_status === 'blocked',
          }"
        >
          {{ finding.guard_status }}
        </span>
      </div>
      <p v-if="finding?.guard_reason" class="text-sm text-gray-600 leading-relaxed">{{ finding.guard_reason }}</p>
    </div>

    <FinOpsRcaDetail v-if="run.data_quality_summary?.rca_linked" :run="run" />

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
      <p class="text-[10px] text-gray-400 mt-2">
        선택 제안: {{ formatKrwCompact(proposal.monthly_savings_krw) }} 절감 · {{ proposal.recommended_action ?? proposal.title }}
      </p>
    </div>
  </div>
</template>
