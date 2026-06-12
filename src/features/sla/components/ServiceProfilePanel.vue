<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ContractData } from '../api/useContractQuery'
import type { Service } from '../types/sla.schema'
import SchemaModal from '@/components/shared/SchemaModal.vue'

const props = defineProps<{
  contract: ContractData | undefined
  isLoading: boolean
  services?: Service[]
}>()

// ── Modal ─────────────────────────────────────────────────────────────
const activeModal = ref<string | null>(null)

const MODAL_CONTENT: Record<string, { title: string; content: string }> = {
  contract: {
    title: 'SLA Contract — 데이터 구조',
    content: `## 관련 테이블

### \`customers\`
고객사(테넌트) 최상위 엔티티. \`customer_code\`로 멀티테넌트 격리.

- \`id\` BIGINT PK
- \`customer_name\` VARCHAR(255)
- \`customer_code\` VARCHAR(100) UNIQUE — JWT 클레임에 포함
- \`contact_email\` VARCHAR(255)

### \`business_units\`
고객사 내 비즈니스 경계 단위. 구독 티어와 계약 기간 관리.

- \`customer_id\` FK → customers
- \`bu_name\`, \`bu_code\`, \`application_name\`
- \`subscription_tier\` — Standard / Professional / Enterprise
- \`contract_start_date\`, \`contract_end_date\` DATE

---

## 위반 서비스 계산 방법
\`sla_policies\` → \`error_budgets\` → \`budget_remaining_percent\` 가 0 이하이면 위반 처리.

## Service Credit 산정
위반 건당 계약서 상 credit 조항에 따라 산정. 현재는 **위반 서비스 수 × $120** 추산값.`,
  },

  errorBudget: {
    title: 'Error Budget — 데이터 구조',
    content: `## 관련 테이블

### \`sla_policies\`
서비스별 SLO 목표치 정의.

- \`service_catalog_id\` FK → service_catalogs
- \`metric_type\` — availability / latency_p95 / error_rate
- \`target_value\` DECIMAL — e.g. 99.9 (%), 300 (ms)
- \`measurement_window\` — 5m / 1h / 30d

### \`error_budgets\`
SLA Burn-Down Chart. 실시간 잔여 예산 추적.

- \`service_catalog_id\` FK
- \`sla_policy_id\` FK
- \`budget_remaining_percent\` DECIMAL — **이 값이 우측 바 차트**
- \`consumed_minutes\` INT
- \`total_budget_minutes\` INT

### \`burn_rate_status\`
Early Warning System. 단기/장기 Burn Rate 계산.

- \`short_window_rate\` DECIMAL — 1시간 소각률
- \`long_window_rate\` DECIMAL — 6시간 소각률
- \`alert_stage\` INT — 0=정상, 1=경고, 2=위험
- \`is_fast_burn\` BOOLEAN

### \`sli_records\`
5분 단위 실제 지표 버킷.

- \`measured_value\` DECIMAL — 실측 가용성 / 레이턴시
- \`is_slo_met\` BOOLEAN`,
  },

  topology: {
    title: 'Topology Decision — 데이터 구조',
    content: `## 관련 테이블

### \`business_unit_requirements\`
AI Topology Agent의 인프라 요구사항 입력값.

- \`business_unit_id\` FK
- \`csp\` — AWS / GCP / Azure
- \`primary_region\` VARCHAR
- \`multi_az_required\` BOOLEAN
- \`db_required\`, \`backup_required\` BOOLEAN
- \`data_type\` — Relational / NoSQL / Cache

### \`cost_constraints\`
비용 제약 및 스케일링 정책.

- \`monthly_budget\` DECIMAL
- \`cost_priority\` — Performance First / Balanced / Cost First
- \`auto_scaling_required\` BOOLEAN
- \`max_compute_instance_count\`, \`max_storage_size_gb\` INT

### \`topologies\`
AI가 생성한 인프라 토폴로지 결정.

- \`business_unit_id\` FK
- \`status\` — draft / approved / deployed / rolled_back

### \`topology_decisions\`
토폴로지 내 개별 아키텍처 결정.

- \`component_type\` — compute / database / networking
- \`selected_option\` — ECS / Aurora / Multi-AZ 등
- \`rationale\` TEXT — AI 추론 근거

### \`terraform_artifacts\`
IaC 컴파일 결과.

- \`hcl_content\` LONGTEXT
- \`tfsec_result\` JSON — 보안 스캔 결과
- \`deployment_status\` — pending / applying / applied`,
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

      <!-- ① SLA CONTRACT ─────────────────────────────────────────────── -->
      <div class="bg-white border border-border rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-[#2980B9]/40 transition-all group" @click="openModal('contract')">
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

      <!-- ② ERROR BUDGET STATUS ─────────────────────────────────────── -->
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

      <!-- ③ TOPOLOGY DECISION ──────────────────────────────────────── -->
      <div v-if="topoDecision" class="bg-white border border-border rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-[#2980B9]/40 transition-all group" @click="openModal('topology')">
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

  <!-- 스키마 설명 모달 -->
  <SchemaModal
    v-if="activeModal"
    :open="!!activeModal"
    :title="MODAL_CONTENT[activeModal]?.title ?? ''"
    :content="MODAL_CONTENT[activeModal]?.content ?? ''"
    @close="closeModal"
  />
</template>
