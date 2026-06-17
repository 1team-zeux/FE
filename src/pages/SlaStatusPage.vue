<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSlaStatusQuery } from '@/features/sla'
import { useServiceMapQuery } from '@/features/sla/api/useServiceMapQuery'
import { useContractQuery } from '@/features/sla/api/useContractQuery'
import ServiceProfilePanel from '@/features/sla/components/ServiceProfilePanel.vue'
import ServiceMap from '@/features/sla/components/ServiceMap.vue'

const route = useRoute()
const router = useRouter()
const buId = route.params.buId as string

const { data: services, isLoading, isError } = useSlaStatusQuery(buId)
const { data: serviceMap } = useServiceMapQuery(buId)
const { data: contract, isLoading: contractLoading } = useContractQuery(buId)

const summary = computed(() => {
  const list = services.value
  if (!list?.length) return null
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const slos = list.map(s => s.availability ?? 0)
  const budgets = list.map(s => s.budgetRemaining ?? 0)
  // burn: 'Fast'|'Slow'|null → numeric 근사
  const burnRates = list.map(s => s.burn === 'Fast' ? 2.5 : s.burn === 'Slow' ? 1.2 : 1.0)
  return {
    compliance: avg(slos).toFixed(2),
    budget: avg(budgets).toFixed(0),
    burnRate: avg(burnRates).toFixed(1),
    penalty: '0',
  }
})

const statusColor = (s: string) => ({
  Critical: 'text-status-critical',
  Warning: 'text-status-warning',
  Healthy: 'text-status-ok',
  critical: 'text-status-critical',
  warning: 'text-status-warning',
  healthy: 'text-status-ok',
}[s] ?? 'text-gray-400')

const statusDot = (s: string) => ({
  Critical: 'bg-status-critical animate-pulse',
  Warning: 'bg-status-warning',
  Healthy: 'bg-status-ok',
  critical: 'bg-status-critical animate-pulse',
  warning: 'bg-status-warning',
  healthy: 'bg-status-ok',
}[s] ?? 'bg-gray-300')

const statusLabel = (s: string) => ({
  Critical: '위험', Warning: '경고', Healthy: '정상',
  critical: '위험', warning: '경고', healthy: '정상',
}[s] ?? s)

const statusBadgeCls = (s: string) => ({
  Critical: 'bg-red-50 text-red-600 border-red-200',
  Warning: 'bg-orange-50 text-orange-600 border-orange-200',
  Healthy: 'bg-green-50 text-green-700 border-green-200',
  critical: 'bg-red-50 text-red-600 border-red-200',
  warning: 'bg-orange-50 text-orange-600 border-orange-200',
  healthy: 'bg-green-50 text-green-700 border-green-200',
}[s] ?? 'bg-gray-50 text-gray-500 border-gray-200')

</script>

<template>
  <div class="p-6 flex flex-col h-full">
    <!-- 헤더 -->
    <div class="flex items-center justify-between mb-3">
      <div>
        <div class="text-sm font-bold text-[#2980B9] uppercase tracking-widest mb-1">SLA 현황</div>
        <h1 class="text-xl font-bold text-text-primary">
          {{ contract?.business_unit?.bu_name || buId }}
        </h1>
      </div>
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        @click="router.push('/dashboard')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        고객사 목록
      </button>
    </div>

    <!-- Business Profile 배너 -->
    <div v-if="contract" class="bg-white border border-border rounded-xl px-5 py-3 mb-4 flex items-center gap-6 flex-wrap">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-[#2980B9]/10 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-[#2980B9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <div class="min-w-0">
          <div class="text-sm text-text-muted">고객사</div>
          <div class="text-sm font-bold text-text-primary truncate">{{ contract.customer.customer_name }}</div>
        </div>
      </div>
      <div class="h-8 w-px bg-gray-100 hidden sm:block" />
      <div class="min-w-0">
        <div class="text-sm text-text-muted">Business Unit</div>
        <div class="text-sm font-semibold text-text-primary truncate">{{ contract.business_unit.bu_name || '—' }}</div>
      </div>
      <div class="h-8 w-px bg-gray-100 hidden sm:block" />
      <div>
        <div class="text-sm text-text-muted">Tier</div>
        <div class="text-sm font-semibold text-[#2980B9]">{{ contract.business_unit.subscription_tier || '—' }}</div>
      </div>
      <div class="h-8 w-px bg-gray-100 hidden sm:block" />
      <div>
        <div class="text-sm text-text-muted">계약기간</div>
        <div class="text-sm font-semibold text-text-primary">
          {{ contract.business_unit.contract_start_date?.slice(0,7).replace('-','.') || '—' }}
          {{ contract.business_unit.contract_end_date ? ' ~ ' + contract.business_unit.contract_end_date.slice(0,7).replace('-','.') : '' }}
        </div>
      </div>
      <div v-if="contract.customer.contact_email" class="h-8 w-px bg-gray-100 hidden sm:block" />
      <div v-if="contract.customer.contact_email" class="min-w-0">
        <div class="text-sm text-text-muted">담당자</div>
        <div class="text-sm text-text-secondary truncate">{{ contract.customer.contact_email }}</div>
      </div>
    </div>

    <!-- Summary 배너 -->
    <div v-if="summary" class="grid grid-cols-4 gap-3 mb-5">
      <div class="bg-white border border-border rounded-xl p-4">
        <div class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">SLA 준수율</div>
        <div class="text-2xl font-bold" :class="Number(summary.compliance) >= 99.9 ? 'text-status-ok' : Number(summary.compliance) >= 99 ? 'text-status-warning' : 'text-status-critical'">
          {{ summary.compliance }}%
        </div>
      </div>
      <div class="bg-white border border-border rounded-xl p-4">
        <div class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">잔여 에러 예산</div>
        <div class="text-2xl font-bold" :class="Number(summary.budget) > 60 ? 'text-status-ok' : Number(summary.budget) > 30 ? 'text-status-warning' : 'text-status-critical'">
          {{ summary.budget }}%
        </div>
      </div>
      <div class="bg-white border border-border rounded-xl p-4">
        <div class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">번률 (Burn Rate)</div>
        <div class="text-2xl font-bold" :class="Number(summary.burnRate) <= 1 ? 'text-status-ok' : Number(summary.burnRate) <= 2 ? 'text-status-warning' : 'text-status-critical'">
          {{ summary.burnRate }}x
        </div>
      </div>
      <div class="bg-white border border-border rounded-xl p-4">
        <div class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">예상 패널티</div>
        <div class="text-2xl font-bold" :class="Number(summary.penalty) === 0 ? 'text-status-ok' : Number(summary.penalty) < 500 ? 'text-status-warning' : 'text-status-critical'">
          ${{ summary.penalty }}
        </div>
      </div>
    </div>

    <!-- 메인 2-column 레이아웃 -->
    <div class="flex gap-4 flex-1 min-h-0">

      <!-- 좌: 서비스 카드 그리드 + 서비스맵 (운영 현황) -->
      <div class="flex-1 overflow-y-auto space-y-4">
        <div v-if="isLoading" class="grid grid-cols-2 gap-3">
          <div v-for="i in 4" :key="i" class="h-36 bg-gray-100 animate-pulse rounded-xl" />
        </div>
        <div v-else-if="isError" class="p-8 text-center bg-red-50 rounded-xl border border-red-200">
          <div class="text-red-600 font-bold text-sm">서비스 데이터를 불러오지 못했습니다.</div>
        </div>
        <div v-else class="grid grid-cols-2 gap-3">
          <div
            v-for="svc in services"
            :key="svc.id"
            class="bg-white border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group"
            :class="{ 'border-l-4 border-l-red-400': svc.status === 'critical' }"
            @click="svc.drillable && router.push({ path: `/dashboard/service/${svc.name}`, query: { tenantId: buId } })"
          >
            <!-- 서비스 헤더 -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm text-text-primary truncate">{{ svc.name }}</div>
                <div v-if="svc.tier" class="text-sm text-text-muted mt-0.5">{{ svc.tier }}</div>
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold border shrink-0 ml-2" :class="statusBadgeCls(svc.status)">
                <span class="w-1.5 h-1.5 rounded-full" :class="statusDot(svc.status)" />
                {{ statusLabel(svc.status) }}
              </span>
            </div>

            <!-- SLA 지표 -->
            <div class="space-y-2">
              <!-- SLO % -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-text-muted">가용성</span>
                <span class="text-sm font-bold font-mono" :class="statusColor(svc.status)">
                  {{ svc.availability > 0 ? svc.availability.toFixed(2) + '%' : '—' }}
                </span>
              </div>

              <!-- 에러 예산 바 -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-text-muted">에러 예산</span>
                  <span class="text-sm font-semibold text-text-primary">{{ svc.budgetRemaining }}%</span>
                </div>
                <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-500"
                    :class="{
                      'bg-status-critical': svc.budgetRemaining <= 30,
                      'bg-status-warning': svc.budgetRemaining > 30 && svc.budgetRemaining <= 60,
                      'bg-status-ok': svc.budgetRemaining > 60,
                    }"
                    :style="{ width: `${svc.budgetRemaining}%` }"
                  />
                </div>
              </div>

              <!-- Burn Rate -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-text-muted">Burn Rate</span>
                <span class="text-sm font-semibold" :class="svc.burn ? 'text-status-warning' : 'text-status-ok'">
                  {{ svc.burn ?? 'Stable' }}
                </span>
              </div>
            </div>

            <!-- 분석 링크 -->
            <div class="mt-3 pt-2 border-t border-gray-50 flex justify-end">
              <span class="text-sm font-semibold text-[#2980B9] opacity-0 group-hover:opacity-100 transition-opacity">
                상세 분석 →
              </span>
            </div>
          </div>
        </div>

        <!-- 서비스 의존성 맵 -->
        <ServiceMap v-if="serviceMap" :map="serviceMap" @node-click="(id) => router.push({ path: `/dashboard/service/${id}`, query: { tenantId: buId } })" />
      </div>

      <!-- 우: Service Profile 패널 (운영 기준) -->
      <ServiceProfilePanel :contract="contract" :is-loading="contractLoading" :services="services ?? []" :map="serviceMap" />
    </div>
  </div>
</template>
