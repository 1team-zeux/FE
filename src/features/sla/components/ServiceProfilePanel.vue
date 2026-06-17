<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ContractData } from '../api/useContractQuery'
import type { Service } from '../types/sla.schema'
import type { ServiceMap } from '../api/useServiceMapQuery'
import SchemaModal from '@/components/shared/SchemaModal.vue'
import TopologyModal from '@/components/shared/TopologyModal.vue'

const props = defineProps<{
  contract: ContractData | undefined
  isLoading: boolean
  services?: Service[]
  map?: ServiceMap
}>()

// ── Modal ─────────────────────────────────────────────────────────────
const activeModal = ref<string | null>(null)
const topologyOpen = ref(false)
const contractOpen = ref(false)

const MODAL_CONTENT: Record<string, { title: string; content: string }> = {
  contract: {
    title: 'SKT T-Universe SLA 운영 현황 보고서',
    content: `## 목표 SLA

| 항목 | 목표값 |
|------|-------|
| Availability | ≥ 99.95% |
| API Latency (p95) | ≤ 300ms |
| MTTR | ≤ 15분 |
| Error Budget (월) | 21.6분 |

## Executive Summary

| 항목 | 내용 |
|------|------|
| 기간 | 2026.06.01 ~ 2026.06.30 |
| 고객사 | SK Telecom — T universe 사업부 |
| 서비스 수 | 4개 (Tier 1: 3개, Tier 2: 1개) |
| SLA 준수율 | 99.2% (목표: 99.9%) |
| SLA 위반 건수 | 1건 |
| 주요 장애 | AI Chatbot API Latency Incident |

## 서비스별 SLA 현황

| 서비스 | SLA 목표 | 실제 SLA | Error Budget 잔여 | 상태 |
|--------|----------|----------|-----------------|------|
| Customer Portal Web | 99.9% | 99.97% | 76% | ✓ 준수 |
| Subscription API | 99.95% | 99.94% | 32% | ⚠ 경계 |
| AI Chatbot Service | 99.9% | 99.12% | 12% | ✗ 위반 |
| Billing Settlement | 99.99% | 100.00% | 100% | ✓ 준수 |`,
  },

  errorBudget: {
    title: 'Error Budget 소진 이력',
    content: `## 소진 이벤트 (2026년 6월)

| 발생 시각 | 서비스 | 이벤트 | 소진량 | 잔여 |
|---------|--------|-------|------|------|
| 06-17 13:12 | AI Chatbot Service | LLM Backend 타임아웃 P1 | -24.3분 | 12% |
| 06-15 02:48 | Subscription API | DB 커넥션 풀 고갈 | -3.1분 | 36% |
| 06-12 11:33 | Customer Portal | CDN 원본 응답 지연 | -1.2분 | 68% |
| 06-08 09:15 | Billing Settlement | 배치 완료 기한 초과 | -0.8분 | 76% |

## 서비스별 예산 현황

| 서비스 | 총 예산 (월) | 소진량 | 잔여 | 상태 |
|--------|------------|------|------|------|
| Customer Portal Web | 43.8분 | 10.5분 | 76% | 안정 |
| Subscription API | 21.9분 | 14.9분 | 32% | 경계 |
| AI Chatbot Service | 43.8분 | 38.5분 | 12% | 위험 |
| Billing Settlement | 4.4분 | 0분 | 100% | 안정 |`,
  },

  topology: {
    title: 'SKT T-Universe 인프라 아키텍처 제안서',
    content: `## 서비스 특성 분석

| 서비스 | 워크로드 | 피크 RPS | 확장성 요구 |
|--------|---------|---------|-----------|
| Customer Portal Web | web | 2,400 | 중간 (버스트 대비) |
| Subscription API | api | 850 | 높음 (결제 피크) |
| AI Chatbot Service | ai | 320 | 매우 높음 (LLM GPU) |
| Billing Settlement | batch | — | 스케줄 기반 |

## ZeuX 추천 토폴로지 — Multi-AZ HA Architecture

| 구성 요소 | 선택 옵션 | 근거 |
|---------|---------|------|
| CSP / Region | AWS ap-northeast-2 | SKT 데이터 주권, 기존 계약 |
| Compute | EKS Auto Scaling (HPA) | 컨테이너 기반, 트래픽 자동 대응 |
| Database | Aurora MySQL Multi-AZ | 99.99% 가용성, 자동 Failover |
| Cache | ElastiCache Redis | 세션·캐시, Sub-ms 응답 |
| LLM Gateway | GPU 노드 그룹 (g4dn.2xlarge) | AI Chatbot 전용 격리 |
| CDN | CloudFront | Portal 정적 자산 전 세계 배포 |

## SLA 만족 근거

- **Multi-AZ 구성**: AZ 장애 시 RDS 자동 Failover (60초) → MTTR ≤ 15분 달성
- **HPA 자동 확장**: Subscription API 피크 시 Pod 즉시 증설 → Latency SLA 보호
- **Circuit Breaker**: LLM 타임아웃 시 즉시 차단 → Chatbot 가용성 신속 복구
- **Error Budget 보호**: Slow Burn 감지 시 6시간 내 자동 조치 → 월 21.6분 이내 소진`,
  },

  dependency: {
    title: 'Dependency Risk — 데이터 구조',
    content: `## 관련 테이블

### \`service_catalogs\`
Core Hub. BU 내 개별 마이크로서비스/모놀리스.

- \`criticality_score\` INT(1-10) — 높을수록 장애 영향 큼
- \`service_type\` — java / python / node
- \`environment\` — production / staging

### \`service_dependencies\`
서비스 간 의존 관계 그래프.

- \`source_service_id\` FK → service_catalogs
- \`target_service_id\` FK → service_catalogs
- \`dependency_type\` — sync / async / database

> Blast Radius = source 서비스가 장애 시 영향받는 target 서비스 수

### \`traffic_profiles\`
피크 트래픽 예측값. 토폴로지 자동 설계 입력.

- \`peak_rps\` INT — 초당 최대 요청 수
- \`avg_rps\` INT
- \`traffic_pattern\` — steady / burst / batch

---

## 장애 전파 추적 경로

\`alarm_events\` → \`incidents\` → \`rca_results\` → \`rca_affected_resources\`

- \`rca_affected_resources.resource_id\` → 실제 피해 인프라 자원
- \`action_histories\` → 자동 복구 실행 로그`,
  },
}

function openModal(key: string) { activeModal.value = key }
function closeModal() { activeModal.value = null }

function formatDate(d: string) {
  if (!d) return '—'
  return d.slice(0, 7).replace('-', '.')
}

// ── Computed from services ────────────────────────────────────────────

const criticalCount = computed(() => props.services?.filter(s => s.status === 'critical').length ?? 0)
const warningCount  = computed(() => props.services?.filter(s => s.status === 'warning').length ?? 0)
const totalCount    = computed(() => props.services?.length ?? 0)

const rootService = computed(() => {
  const crit = props.services?.find(s => s.status === 'critical')
  return crit?.name ?? '—'
})

const avgAvailBudget = computed(() => {
  const list = props.services
  if (!list?.length) return 100
  return Math.round(list.reduce((a, s) => a + s.budgetRemaining, 0) / list.length)
})

const latencyBudget = computed(() => {
  const list = props.services
  if (!list?.length) return 100
  const fastCount = list.filter(s => s.burn === 'Fast').length
  const slowCount = list.filter(s => s.burn === 'Slow').length
  return Math.max(0, Math.round(100 - fastCount * 25 - slowCount * 10))
})

const budgetRisk = computed(() => {
  const a = avgAvailBudget.value
  if (a <= 20) return { label: 'CRITICAL', cls: 'text-red-600 bg-red-50 border-red-200' }
  if (a <= 50) return { label: 'HIGH', cls: 'text-orange-600 bg-orange-50 border-orange-200' }
  if (a <= 75) return { label: 'MEDIUM', cls: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
  return { label: 'LOW', cls: 'text-green-700 bg-green-50 border-green-200' }
})

const violations = computed(() => criticalCount.value)
const serviceCredit = computed(() => violations.value * 120)

// ── Contract ──────────────────────────────────────────────────────────

const contractStatus = computed(() => {
  const end = props.contract?.business_unit.contract_end_date
  if (!end) return { label: 'ACTIVE', cls: 'bg-green-50 text-green-700 border-green-200' }
  return new Date(end) >= new Date()
    ? { label: 'ACTIVE', cls: 'bg-green-50 text-green-700 border-green-200' }
    : { label: 'EXPIRED', cls: 'bg-red-50 text-red-600 border-red-200' }
})

// ── Topology Decision ─────────────────────────────────────────────────

const topoDecision = computed(() => {
  const cp = props.contract?.cost_policy
  const ip = props.contract?.infra_policy
  if (!cp || !ip) return null
  const decisionLabel =
    cp.cost_priority === 'Performance First' ? '성능 우선 (Stability)'
    : cp.cost_priority === 'Cost First' ? '비용 최적화 (Economy)'
    : '균형 (Balanced)'
  const db = ip.multi_az_required ? 'Aurora Cluster (Multi-AZ)' : 'RDS Single Instance'
  const compute = cp.auto_scaling_required ? 'ECS Auto Scaling' : 'ECS Fargate Fixed'
  return { decisionLabel, db, compute, region: ip.primary_region || '—', csp: ip.csp || '—' }
})

// ── Budget bar color ──────────────────────────────────────────────────
function budgetBarCls(val: number) {
  if (val <= 30) return 'bg-red-400'
  if (val <= 60) return 'bg-orange-400'
  return 'bg-emerald-400'
}
</script>

<template>
  <aside class="w-80 shrink-0 space-y-3 overflow-y-auto">

    <!-- 로딩 스켈레톤 -->
    <template v-if="isLoading">
      <div v-for="i in 4" :key="i" class="h-28 bg-gray-100 animate-pulse rounded-xl" />
    </template>

    <template v-else-if="contract">

      <!-- ① ERROR BUDGET STATUS ─────────────────────────────────────── -->
      <div class="bg-white border border-border rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-[#2980B9]/40 transition-all group" @click="openModal('errorBudget')">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[11px] font-bold text-text-primary uppercase tracking-widest">Error Budget</span>
          <span class="px-1.5 py-0.5 rounded text-[11px] font-bold border" :class="budgetRisk.cls">
            {{ budgetRisk.label }}
          </span>
        </div>
        <div class="space-y-2.5">
          <!-- Availability -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-text-secondary">가용성 예산</span>
              <span class="text-xs font-bold text-text-primary">{{ avgAvailBudget }}%</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :class="budgetBarCls(avgAvailBudget)" :style="{ width: `${avgAvailBudget}%` }" />
            </div>
          </div>
          <!-- Latency -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-text-secondary">레이턴시 예산</span>
              <span class="text-xs font-bold text-text-primary">{{ latencyBudget }}%</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :class="budgetBarCls(latencyBudget)" :style="{ width: `${latencyBudget}%` }" />
            </div>
          </div>
          <!-- SLO target hint -->
          <div v-if="contract.sla_objectives.length" class="pt-1 border-t border-gray-50">
            <div v-for="obj in contract.sla_objectives.slice(0, 2)" :key="obj.category"
              class="flex items-center justify-between">
              <span class="text-[11px] text-text-muted">목표 {{ obj.category === 'availability' ? '가용성' : obj.category === 'latency_p95' ? 'P95' : obj.category }}</span>
              <span class="text-[11px] font-mono text-text-muted">
                {{ obj.category === 'availability' ? `≥ ${obj.target_value}%` : obj.category === 'latency_p95' ? `≤ ${obj.target_value}ms` : obj.target_value }}
              </span>
            </div>
          </div>
        </div>
        <div class="mt-3 pt-2 border-t border-gray-50 text-right">
          <span class="text-[10px] text-[#2980B9] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">자세히 보기 →</span>
        </div>
      </div>

      <!-- ② SLA CONTRACT ─────────────────────────────────────────────── -->
      <div class="bg-white border border-border rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-[#2980B9]/40 transition-all group" @click="contractOpen = true">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[11px] font-bold text-text-primary uppercase tracking-widest">SLA Contract</span>
          <div class="flex items-center gap-2">
            <span class="px-1.5 py-0.5 rounded text-[11px] font-bold border" :class="contractStatus.cls">{{ contractStatus.label }}</span>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">계약기간</span>
            <span class="text-xs font-semibold text-text-primary">
              {{ formatDate(contract.business_unit.contract_start_date) }}
              {{ contract.business_unit.contract_end_date ? ' ~ ' + formatDate(contract.business_unit.contract_end_date) : '' }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">Tier</span>
            <span class="text-xs font-semibold text-[#2980B9]">{{ contract.business_unit.subscription_tier || '—' }}</span>
          </div>
          <div class="border-t border-gray-50 pt-1.5 mt-1.5 flex items-center justify-between">
            <span class="text-xs text-text-secondary">위반 서비스</span>
            <span class="text-xs font-bold" :class="violations > 0 ? 'text-red-600' : 'text-green-600'">
              {{ violations > 0 ? violations + '건' : '없음' }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">예상 Service Credit</span>
            <span class="text-xs font-bold" :class="serviceCredit > 0 ? 'text-orange-600' : 'text-green-600'">
              ${{ serviceCredit }}
            </span>
          </div>
        </div>
        <div class="mt-3 pt-2 border-t border-gray-50 text-right">
          <span class="text-[10px] text-[#2980B9] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">자세히 보기 →</span>
        </div>
      </div>

      <!-- ③ TOPOLOGY DECISION ──────────────────────────────────────── -->
      <div v-if="topoDecision" class="bg-white border border-border rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-[#2980B9]/40 transition-all group" @click="topologyOpen = true">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-[11px] font-bold text-text-primary uppercase tracking-widest">Topology Decision</span>
        </div>
        <div class="space-y-2">
          <div class="flex items-start justify-between">
            <span class="text-xs text-text-secondary">전략</span>
            <span class="text-xs font-semibold text-[#2980B9] text-right leading-tight ml-2">{{ topoDecision.decisionLabel }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">CSP / Region</span>
            <span class="text-xs font-semibold text-text-primary font-mono">{{ topoDecision.csp }} / {{ topoDecision.region }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">Database</span>
            <span class="text-xs font-semibold text-text-primary text-right ml-2 leading-tight">{{ topoDecision.db }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">Compute</span>
            <span class="text-xs font-semibold text-text-primary text-right ml-2 leading-tight">{{ topoDecision.compute }}</span>
          </div>
          <div v-if="contract.cost_policy.monthly_budget" class="border-t border-gray-50 pt-1.5 flex items-center justify-between">
            <span class="text-xs text-text-secondary">월 예산 한도</span>
            <span class="text-xs font-bold text-text-primary">${{ contract.cost_policy.monthly_budget.toLocaleString() }}/mo</span>
          </div>
        </div>
        <div class="mt-3 pt-2 border-t border-gray-50 text-right">
          <span class="text-[10px] text-[#2980B9] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">자세히 보기 →</span>
        </div>
      </div>

      <!-- ④ DEPENDENCY RISK ──────────────────────────────────────── -->
      <div v-if="services?.length" class="bg-white border border-border rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-[#2980B9]/40 transition-all group" @click="openModal('dependency')">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[11px] font-bold text-text-primary uppercase tracking-widest">Dependency Risk</span>
          <span v-if="criticalCount > 0" class="flex items-center gap-1 text-[11px] font-bold text-red-600">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />위험 전파 가능
          </span>
        </div>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">Critical 서비스</span>
            <span class="text-xs font-bold" :class="criticalCount > 0 ? 'text-red-600' : 'text-green-600'">{{ criticalCount }}개</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">Warning 서비스</span>
            <span class="text-xs font-bold" :class="warningCount > 0 ? 'text-orange-500' : 'text-green-600'">{{ warningCount }}개</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">Root Service</span>
            <span class="text-xs font-semibold text-text-primary">{{ rootService }}</span>
          </div>
          <div class="border-t border-gray-50 pt-1.5 flex items-center justify-between">
            <span class="text-xs text-text-secondary">Blast Radius</span>
            <span class="text-xs font-bold text-orange-600">{{ totalCount }} Services</span>
          </div>
        </div>
        <div class="mt-3 pt-2 border-t border-gray-50 text-right">
          <span class="text-[10px] text-[#2980B9] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">자세히 보기 →</span>
        </div>
      </div>

    </template>

    <!-- 데이터 없음 -->
    <template v-else>
      <div class="bg-gray-50 border border-dashed border-border rounded-xl p-6 text-center">
        <div class="text-xs text-text-muted">계약 정보 없음</div>
      </div>
    </template>

  </aside>

  <!-- 일반 모달 -->
  <SchemaModal
    v-if="activeModal"
    :open="!!activeModal"
    :title="MODAL_CONTENT[activeModal]?.title ?? ''"
    :content="MODAL_CONTENT[activeModal]?.content ?? ''"
    @close="closeModal"
  />

  <!-- SLA CONTRACT 모달 (서비스맵 포함) -->
  <TopologyModal
    :open="contractOpen"
    :title="MODAL_CONTENT.contract.title"
    :content="MODAL_CONTENT.contract.content"
    :map="map"
    @close="contractOpen = false"
  />

  <!-- 토폴로지 전용 모달 (서비스맵 포함) -->
  <TopologyModal
    :open="topologyOpen"
    :title="MODAL_CONTENT.topology.title"
    :content="MODAL_CONTENT.topology.content"
    :map="map"
    @close="topologyOpen = false"
  />
</template>
