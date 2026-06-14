<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { useCustomersQuery, type CustomerSummary } from '@/features/customer/api/useCustomersQuery'
import { useOnboardMutation, type OnboardPayload } from '@/features/customer/api/useOnboardMutation'
import { UploadZone } from '@/features/iac'
import { parseOnboardFile } from '@/utils/parseOnboardFile'

const router = useRouter()
const { data: customers, isLoading } = useCustomersQuery()
const { mutateAsync: onboard, isPending } = useOnboardMutation()
const queryClient = useQueryClient()

// 고객 상세 모달
const selectedCust = ref<CustomerSummary | null>(null)
const showCredPw = ref(false)

// 위저드 상태
const showWizard = ref(false)
const step = ref(0)
const totalSteps = 5
const result = ref<{ curl_command: string; registration_token: string; loginEmail: string; loginPassword: string } | null>(null)
const wizardError = ref('')

// 파일 업로드 상태
const showFileUpload = ref(false)
const fileParseError = ref('')
const isParsingFile = ref(false)

async function loadFromFile(file: File) {
  isParsingFile.value = true
  fileParseError.value = ''
  const parsed = await parseOnboardFile(file)
  isParsingFile.value = false
  if (!parsed.ok) {
    fileParseError.value = parsed.error
    return
  }
  const d = parsed.data
  if (d.customer) Object.assign(form.value.customer, d.customer)
  if (d.business_unit) Object.assign(form.value.business_unit, d.business_unit)
  if (d.requirements) Object.assign(form.value.requirements!, d.requirements)
  if (d.cost_constraints) Object.assign(form.value.cost_constraints!, d.cost_constraints)
  if (d.services?.length) form.value.services = d.services
  if (d.loginEmail) form.value.loginEmail = d.loginEmail
  if (d.loginPassword) form.value.loginPassword = d.loginPassword
  step.value = 1
}

// 폼 데이터
const form = ref<OnboardPayload>({
  customer: { customer_name: '', customer_code: '', contact_email: '' },
  business_unit: { bu_name: '', bu_code: '', application_name: '', manager_email: '', business_domain: '', subscription_tier: 'Standard', contract_start_date: '', contract_end_date: '' },
  requirements: { csp: 'AWS', primary_region: 'ap-northeast-2', multi_az_required: false, db_required: false, data_type: '', backup_required: false },
  cost_constraints: { monthly_budget: undefined, cost_priority: 'Balanced', auto_scaling_required: true, max_compute_instance_count: undefined, max_storage_size_gb: undefined },
  services: [{ service_name: '', service_type: 'java', service_tier: 'standard', criticality_score: 5, environment: 'production', sla_target_availability: 99.9, sla_target_latency_ms: 500 }],
  loginEmail: '',
  loginPassword: '',
})

function openWizard() {
  step.value = 0
  result.value = null
  wizardError.value = ''
  showFileUpload.value = false
  fileParseError.value = ''
  showWizard.value = true
}

function addService() {
  form.value.services.push({ service_name: '', service_type: 'java', service_tier: 'standard', criticality_score: 5, environment: 'production', sla_target_availability: 99.9, sla_target_latency_ms: 500 })
}

function removeService(i: number) {
  if (form.value.services.length > 1) form.value.services.splice(i, 1)
}

async function submitWizard() {
  wizardError.value = ''
  try {
    const res = await onboard(form.value)
    result.value = { curl_command: res.curl_command, registration_token: res.registration_token, loginEmail: form.value.loginEmail, loginPassword: form.value.loginPassword }
    queryClient.invalidateQueries({ queryKey: ['customers'] })
  } catch (e: any) {
    wizardError.value = e.message ?? '등록에 실패했습니다.'
  }
}

const copied = ref<string | null>(null)
function copyText(text: string, key: string) {
  navigator.clipboard.writeText(text)
  copied.value = key
  setTimeout(() => { copied.value = null }, 2000)
}

const showPassword = ref(false)
</script>

<template>
  <div class="p-6">
    <!-- 헤더 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold text-text-primary">고객사 관리</h1>
        <p class="text-sm text-text-secondary mt-0.5">고객사 온보딩 및 BU/서비스 등록</p>
      </div>
      <button
        @click="openWizard"
        class="flex items-center gap-2 px-4 py-2 bg-[#2980B9] hover:bg-[#2471a3] text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        고객사 등록
      </button>
    </div>

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <svg class="animate-spin w-6 h-6 text-[#2980B9]" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>

    <!-- 빈 상태 -->
    <div v-else-if="!customers?.length" class="text-center py-20 text-text-muted">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <p class="text-sm">등록된 고객사가 없습니다.</p>
      <p class="text-xs mt-1">위 버튼으로 첫 고객사를 등록하세요.</p>
    </div>

    <!-- 고객사 카드 목록 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="cust in customers"
        :key="cust.customer_id"
        class="bg-white border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="min-w-0">
            <div class="font-semibold text-text-primary text-sm truncate">{{ cust.customer_name }}</div>
            <div class="text-xs text-text-muted mt-0.5 font-mono">{{ cust.customer_code }}</div>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-2">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700">Active</span>
            <button
              class="text-[10px] text-[#2980B9] hover:underline font-medium"
              @click.stop="selectedCust = cust; showCredPw = false"
            >계정 정보</button>
          </div>
        </div>

        <!-- BU 목록 -->
        <div class="space-y-1.5 mb-3">
          <div
            v-for="bu in cust.business_units"
            :key="bu.bu_id"
            class="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-[#2980B9]/5 hover:border-[#2980B9]/20 border border-transparent transition-colors"
            @click="router.push(`/dashboard/bu/${bu.bu_id}`)"
          >
            <div class="min-w-0">
              <div class="text-xs font-semibold text-text-primary truncate">{{ bu.bu_name }}</div>
              <div v-if="bu.business_domain" class="text-[10px] text-text-muted">{{ bu.business_domain }}</div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0 ml-2">
              <span v-if="bu.subscription_tier" class="text-[10px] font-semibold text-[#2980B9]">{{ bu.subscription_tier }}</span>
              <svg class="w-3 h-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="text-[10px] text-text-muted border-t border-gray-50 pt-2">
          {{ cust.contact_email || '—' }} · 등록일 {{ cust.created_at ? new Date(cust.created_at).toLocaleDateString('ko-KR') : '—' }}
        </div>
      </div>
    </div>
  </div>

  <!-- 고객 계정 정보 모달 -->
  <Teleport to="body">
    <div v-if="selectedCust" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="selectedCust = null">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 class="font-bold text-text-primary">{{ selectedCust.customer_name }}</h2>
            <p class="text-xs text-text-muted font-mono mt-0.5">{{ selectedCust.customer_code }}</p>
          </div>
          <button @click="selectedCust = null" class="text-text-muted hover:text-text-primary">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="px-6 py-5 space-y-4">
          <!-- 로그인 계정 -->
          <div>
            <p class="text-xs font-semibold text-text-secondary mb-2">로그인 계정</p>
            <div class="bg-gray-50 rounded-xl p-3 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-text-muted">이메일 (ID)</span>
                <span class="text-sm font-mono text-text-primary">{{ selectedCust.login_email || selectedCust.contact_email || '—' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-text-muted">비밀번호</span>
                <span class="text-xs text-text-muted italic">등록 시 설정됨 (재확인 불가)</span>
              </div>
            </div>
          </div>
          <!-- 담당자 -->
          <div v-if="selectedCust.contact_email">
            <p class="text-xs font-semibold text-text-secondary mb-2">담당자 이메일</p>
            <p class="text-sm font-mono text-text-primary bg-gray-50 rounded-xl px-3 py-2">{{ selectedCust.contact_email }}</p>
          </div>
          <!-- BU 목록 -->
          <div v-if="selectedCust.business_units?.length">
            <p class="text-xs font-semibold text-text-secondary mb-2">비즈니스 유닛</p>
            <div class="space-y-1">
              <div
                v-for="bu in selectedCust.business_units"
                :key="bu.bu_id"
                class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-[#2980B9]/5 transition-colors"
                @click="router.push(`/dashboard/bu/${bu.bu_id}`); selectedCust = null"
              >
                <span class="text-xs font-medium text-text-primary">{{ bu.bu_name }}</span>
                <span class="text-[10px] text-[#2980B9] font-semibold">{{ bu.subscription_tier }}</span>
              </div>
            </div>
          </div>
          <p class="text-[10px] text-text-muted">등록일 {{ selectedCust.created_at ? new Date(selectedCust.created_at).toLocaleDateString('ko-KR') : '—' }}</p>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 온보딩 위저드 모달 -->
  <Teleport to="body">
    <div v-if="showWizard" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        <!-- 모달 헤더 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 class="font-bold text-text-primary">고객사 온보딩</h2>
            <p v-if="step > 0" class="text-xs text-text-secondary mt-0.5">{{ step }} / {{ totalSteps }} 단계</p>
            <p v-else class="text-xs text-text-secondary mt-0.5">등록 방식 선택</p>
          </div>
          <button @click="showWizard = false" class="text-text-muted hover:text-text-primary">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Progress bar -->
        <div v-if="step > 0" class="h-1 bg-gray-100">
          <div
            class="h-full bg-[#2980B9] transition-all duration-300"
            :style="{ width: `${(step / totalSteps) * 100}%` }"
          />
        </div>

        <!-- 완료 화면 -->
        <div v-if="result" class="flex-1 overflow-y-auto px-6 py-6">
          <div class="flex flex-col items-center mb-6">
            <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 class="text-lg font-bold text-text-primary">등록 완료!</h3>
            <p class="text-sm text-text-secondary mt-1">고객사에 아래 로그인 정보를 전달하세요.</p>
          </div>

          <!-- 로그인 계정 정보 -->
          <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
            <p class="text-xs font-semibold text-blue-700 mb-3">로그인 계정 정보</p>
            <div class="space-y-2">
              <div class="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
                <div class="min-w-0">
                  <span class="text-[10px] text-gray-400 block">ID (이메일)</span>
                  <span class="text-sm font-mono text-text-primary">{{ result.loginEmail }}</span>
                </div>
                <button @click="copyText(result.loginEmail, 'email')" class="shrink-0 ml-2 text-xs text-[#2980B9] hover:underline">
                  {{ copied === 'email' ? '복사됨!' : '복사' }}
                </button>
              </div>
              <div class="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
                <div class="min-w-0">
                  <span class="text-[10px] text-gray-400 block">비밀번호</span>
                  <span class="text-sm font-mono text-text-primary">{{ showPassword ? result.loginPassword : '••••••••' }}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0 ml-2">
                  <button @click="showPassword = !showPassword" class="text-xs text-gray-400 hover:text-gray-600">
                    {{ showPassword ? '숨기기' : '보기' }}
                  </button>
                  <button @click="copyText(result.loginPassword, 'pw')" class="text-xs text-[#2980B9] hover:underline">
                    {{ copied === 'pw' ? '복사됨!' : '복사' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 에이전트 설치 토큰 -->
          <div class="mb-3">
            <div class="flex items-center justify-between mb-1.5">
              <p class="text-xs font-semibold text-text-secondary">Registration Token</p>
              <button @click="copyText(result.registration_token, 'token')" class="text-xs text-[#2980B9] hover:underline">
                {{ copied === 'token' ? '복사됨!' : '복사' }}
              </button>
            </div>
            <div class="bg-gray-900 rounded-lg px-3 py-2">
              <code class="text-xs text-yellow-300 break-all">{{ result.registration_token }}</code>
            </div>
          </div>

          <!-- curl 명령어 -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-1.5">
              <p class="text-xs font-semibold text-text-secondary">에이전트 설치 명령어</p>
              <button @click="copyText(result.curl_command, 'curl')" class="text-xs text-[#2980B9] hover:underline">
                {{ copied === 'curl' ? '복사됨!' : '복사' }}
              </button>
            </div>
            <div class="bg-gray-900 rounded-xl p-3">
              <code class="text-xs text-green-400 break-all">{{ result.curl_command }}</code>
            </div>
          </div>

          <div class="flex justify-end">
            <button @click="showWizard = false" class="px-4 py-2 border border-border text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              닫기
            </button>
          </div>
        </div>

        <!-- 위저드 폼 -->
        <div v-else class="flex-1 overflow-y-auto px-6 py-5">

          <!-- Step 0: 등록 방식 선택 -->
          <div v-if="step === 0">
            <div v-if="!showFileUpload" class="grid grid-cols-2 gap-4 mt-2">
              <button
                @click="showFileUpload = true"
                class="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-2xl hover:border-[#2980B9] hover:bg-[#2980B9]/5 transition-colors text-left"
              >
                <div class="w-10 h-10 rounded-xl bg-[#2980B9]/10 flex items-center justify-center">
                  <svg class="w-5 h-5 text-[#2980B9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                </div>
                <div>
                  <p class="font-semibold text-sm text-text-primary">파일로 등록</p>
                  <p class="text-xs text-text-muted mt-0.5">YAML/JSON 파일 업로드</p>
                </div>
              </button>
              <button
                @click="step = 1"
                class="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-2xl hover:border-[#2980B9] hover:bg-[#2980B9]/5 transition-colors text-left"
              >
                <div class="w-10 h-10 rounded-xl bg-[#2980B9]/10 flex items-center justify-center">
                  <svg class="w-5 h-5 text-[#2980B9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </div>
                <div>
                  <p class="font-semibold text-sm text-text-primary">직접 입력</p>
                  <p class="text-xs text-text-muted mt-0.5">단계별 폼으로 직접 작성</p>
                </div>
              </button>
            </div>

            <div v-else class="space-y-3 mt-2">
              <button
                @click="showFileUpload = false; fileParseError = ''"
                class="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                뒤로
              </button>
              <UploadZone
                label="고객사 등록 파일"
                accept=".yaml,.yml,.json"
                :allowed-extensions="['.yaml', '.yml', '.json']"
                description="customer, business_unit, requirements, services 섹션을 포함한 YAML/JSON 파일"
                @select="loadFromFile"
              />
              <p v-if="fileParseError" class="text-xs text-red-500">{{ fileParseError }}</p>
              <p v-if="isParsingFile" class="text-xs text-text-muted">파일 파싱 중...</p>
            </div>
          </div>

          <!-- Step 1: 고객사 기본정보 + 로그인 계정 -->
          <div v-if="step === 1" class="space-y-4">
            <h3 class="font-semibold text-text-primary mb-4">고객사 기본 정보</h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">고객사명 *</label>
                <input v-model="form.customer.customer_name" class="input" placeholder="SKT Digital" />
              </div>
              <div>
                <label class="label">고객사 코드 *</label>
                <input v-model="form.customer.customer_code" class="input" placeholder="skt-digital" />
              </div>
            </div>
            <div>
              <label class="label">담당자 이메일</label>
              <input v-model="form.customer.contact_email" type="email" class="input" placeholder="ops@company.com" />
            </div>
            <div class="border-t border-border pt-4 mt-4">
              <p class="text-xs font-semibold text-text-secondary mb-3">로그인 계정 정보</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">로그인 이메일 *</label>
                  <input v-model="form.loginEmail" type="email" class="input" placeholder="login@company.com" />
                </div>
                <div>
                  <label class="label">초기 비밀번호 *</label>
                  <input v-model="form.loginPassword" type="password" class="input" placeholder="••••••••" />
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: BU 정보 -->
          <div v-if="step === 2" class="space-y-4">
            <h3 class="font-semibold text-text-primary mb-4">비즈니스 유닛 정보</h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">BU 이름 *</label>
                <input v-model="form.business_unit.bu_name" class="input" placeholder="API Platform" />
              </div>
              <div>
                <label class="label">BU 코드</label>
                <input v-model="form.business_unit.bu_code" class="input" placeholder="api-pf" />
              </div>
              <div>
                <label class="label">애플리케이션명</label>
                <input v-model="form.business_unit.application_name" class="input" placeholder="API Gateway" />
              </div>
              <div>
                <label class="label">비즈니스 도메인</label>
                <input v-model="form.business_unit.business_domain" class="input" placeholder="Telecom" />
              </div>
              <div>
                <label class="label">구독 티어</label>
                <select v-model="form.business_unit.subscription_tier" class="input">
                  <option>Standard</option>
                  <option>Professional</option>
                  <option>Enterprise</option>
                </select>
              </div>
              <div>
                <label class="label">담당자 이메일</label>
                <input v-model="form.business_unit.manager_email" type="email" class="input" />
              </div>
              <div>
                <label class="label">계약 시작일</label>
                <input v-model="form.business_unit.contract_start_date" type="date" class="input" />
              </div>
              <div>
                <label class="label">계약 종료일</label>
                <input v-model="form.business_unit.contract_end_date" type="date" class="input" />
              </div>
            </div>
          </div>

          <!-- Step 3: 인프라 요구사항 -->
          <div v-if="step === 3" class="space-y-4">
            <h3 class="font-semibold text-text-primary mb-4">인프라 요구사항</h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">CSP</label>
                <select v-model="form.requirements!.csp" class="input">
                  <option>AWS</option>
                  <option>GCP</option>
                  <option>Azure</option>
                </select>
              </div>
              <div>
                <label class="label">Primary 리전</label>
                <input v-model="form.requirements!.primary_region" class="input" placeholder="ap-northeast-2" />
              </div>
              <div>
                <label class="label">데이터 타입</label>
                <input v-model="form.requirements!.data_type" class="input" placeholder="Relational" />
              </div>
            </div>
            <div class="space-y-2 mt-2">
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" v-model="form.requirements!.multi_az_required" class="w-4 h-4 accent-[#2980B9]" />
                <span class="text-sm text-text-primary">Multi-AZ 필요</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" v-model="form.requirements!.db_required" class="w-4 h-4 accent-[#2980B9]" />
                <span class="text-sm text-text-primary">데이터베이스 필요</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" v-model="form.requirements!.backup_required" class="w-4 h-4 accent-[#2980B9]" />
                <span class="text-sm text-text-primary">백업 필요</span>
              </label>
            </div>
          </div>

          <!-- Step 4: 비용 제약 -->
          <div v-if="step === 4" class="space-y-4">
            <h3 class="font-semibold text-text-primary mb-4">비용 제약</h3>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">월 예산 ($)</label>
                <input v-model.number="form.cost_constraints!.monthly_budget" type="number" class="input" placeholder="5000" />
              </div>
              <div>
                <label class="label">비용 우선순위</label>
                <select v-model="form.cost_constraints!.cost_priority" class="input">
                  <option>Performance First</option>
                  <option>Balanced</option>
                  <option>Cost First</option>
                </select>
              </div>
              <div>
                <label class="label">최대 컴퓨트 인스턴스 수</label>
                <input v-model.number="form.cost_constraints!.max_compute_instance_count" type="number" class="input" placeholder="10" />
              </div>
              <div>
                <label class="label">최대 스토리지 (GB)</label>
                <input v-model.number="form.cost_constraints!.max_storage_size_gb" type="number" class="input" placeholder="500" />
              </div>
            </div>
            <label class="flex items-center gap-3 cursor-pointer mt-2">
              <input type="checkbox" v-model="form.cost_constraints!.auto_scaling_required" class="w-4 h-4 accent-[#2980B9]" />
              <span class="text-sm text-text-primary">Auto Scaling 필요</span>
            </label>
          </div>

          <!-- Step 5: 서비스 목록 -->
          <div v-if="step === 5" class="space-y-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-text-primary">서비스 등록</h3>
              <button @click="addService" class="flex items-center gap-1.5 text-xs text-[#2980B9] hover:underline">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                서비스 추가
              </button>
            </div>
            <div
              v-for="(svc, i) in form.services"
              :key="i"
              class="border border-border rounded-xl p-4 space-y-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-text-secondary">서비스 {{ i + 1 }}</span>
                <button v-if="form.services.length > 1" @click="removeService(i)" class="text-xs text-red-400 hover:text-red-600">삭제</button>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">서비스명 *</label>
                  <input v-model="svc.service_name" class="input" placeholder="auth-api" />
                </div>
                <div>
                  <label class="label">서비스 타입</label>
                  <select v-model="svc.service_type" class="input">
                    <option>java</option>
                    <option>python</option>
                    <option>node</option>
                    <option>all</option>
                  </select>
                </div>
                <div>
                  <label class="label">티어</label>
                  <select v-model="svc.service_tier" class="input">
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>
                <div>
                  <label class="label">환경</label>
                  <select v-model="svc.environment" class="input">
                    <option>production</option>
                    <option>staging</option>
                  </select>
                </div>
                <div>
                  <label class="label">SLO 가용성 목표 (%)</label>
                  <input v-model.number="svc.sla_target_availability" type="number" step="0.1" class="input" />
                </div>
                <div>
                  <label class="label">P95 레이턴시 목표 (ms)</label>
                  <input v-model.number="svc.sla_target_latency_ms" type="number" class="input" />
                </div>
              </div>
            </div>
          </div>

          <!-- 에러 -->
          <div v-if="wizardError" class="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            {{ wizardError }}
          </div>
        </div>

        <!-- 위저드 푸터 -->
        <div v-if="!result" class="flex items-center justify-between px-6 py-4 border-t border-border">
          <button
            v-if="step > 1"
            @click="step--"
            class="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-gray-50 transition-colors"
          >
            이전
          </button>
          <div v-else />

          <button
            v-if="step > 0 && step < totalSteps"
            @click="step++"
            class="px-4 py-2 text-sm font-semibold bg-[#2980B9] text-white rounded-xl hover:bg-[#2471a3] transition-colors"
          >
            다음
          </button>
          <button
            v-else-if="step === totalSteps"
            @click="submitWizard"
            :disabled="isPending"
            class="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#2980B9] text-white rounded-xl hover:bg-[#2471a3] transition-colors disabled:opacity-60"
          >
            <svg v-if="isPending" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ isPending ? '등록 중...' : '완료' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.label {
  @apply block text-xs font-medium text-gray-600 mb-1;
}
.input {
  @apply w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/30 focus:border-[#2980B9] bg-gray-50 focus:bg-white transition-colors;
}
</style>
