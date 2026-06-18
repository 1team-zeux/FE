<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  useIacStore,
  useGenerateTerraform, useTerraformPlan, useTerraformApply, useTerraformVerify,
  IacHclPanel, IacPlanPanel, IacApplyPanel, IacVerifyPanel,
} from '@/features/iac'
import AppStepper from '@/components/AppStepper.vue'
import type { PlanResult } from '@/features/iac'

const store = useIacStore()
const router = useRouter()
const { deployStatus, selectedTopologyId } = storeToRefs(store)

const planId = ref<string | null>(null)
const hclPreview = ref<string | null>(null)
const planData = ref<PlanResult | null>(null)
const failedDuringApply = ref(false)
const planPanelVisible = ref(false)

const { mutate: generateCode } = useGenerateTerraform()
const { mutate: runPlan, isPending: isPlanning } = useTerraformPlan()
const { resources, isApplyDone, startApply, stopApply } = useTerraformApply()
const { data: verifyData } = useTerraformVerify(planId)

const STEPS = [
  { label: '코드 생성' },
  { label: 'Plan 검토' },
  { label: 'Apply' },
  { label: '검증' },
]

const currentStep = computed(() => {
  switch (deployStatus.value) {
    case 'generating': return 1
    case 'planning':   return 2
    case 'applying':   return 3
    case 'verifying':
    case 'done':       return 4
    default:           return 0
  }
})

// ── Panel position states ──────────────────────────────────

const isApplying = computed(() =>
  deployStatus.value === 'applying' ||
  (deployStatus.value === 'error' && failedDuringApply.value)
)

const EASE = 'cubic-bezier(0.4,0,0.2,1)'
const DUR  = '0.52s'

// HCL: left-anchored, right 속성으로 너비 조절 + transform으로 좌측 퇴장
const hclPanelStyle = computed(() => ({
  right: (planPanelVisible.value || isApplying.value) ? '50%' : '0',
  transform: isApplying.value ? 'translateX(-100%)' : 'translateX(0)',
  transition: `right ${DUR} ${EASE}, transform ${DUR} ${EASE}`,
}))

// Plan: right-anchored, w-1/2, transform으로 오른쪽 등장 → 오른쪽 절반 → 왼쪽 절반
const planPanelStyle = computed(() => {
  let transform: string
  if (isApplying.value)           transform = 'translateX(-100%)'
  else if (planPanelVisible.value) transform = 'translateX(0)'
  else                             transform = 'translateX(100%)'
  return { transform, transition: `transform ${DUR} ${EASE}` }
})

// Apply: right-anchored, w-1/2, 오른쪽 밖에서 등장
// isVerifying 시엔 wrapper가 통째로 퇴장하므로 개별 transform 고정
const applyPanelStyle = computed(() => ({
  transform: (isApplying.value || isVerifying.value) ? 'translateX(0)' : 'translateX(100%)',
  transition: `transform ${DUR} ${EASE}`,
  zIndex: '2',
}))

// Verify: 기존 패널들 왼쪽으로 밀고, 검증 패널 오른쪽에서 등장
const isVerifying = computed(() => deployStatus.value === 'verifying' || deployStatus.value === 'done')
const existingPanelsStyle = computed(() => ({
  transform: isVerifying.value ? 'translateX(-100%)' : 'translateX(0)',
  transition: `transform ${DUR} ${EASE}`,
}))
const verifyPanelStyle = computed(() => ({
  transform: isVerifying.value ? 'translateX(0)' : 'translateX(100%)',
  transition: `transform ${DUR} ${EASE}`,
}))

// ── Handlers ──────────────────────────────────────────────

watch(deployStatus, (newVal, oldVal) => {
  if (newVal === 'error' && oldVal === 'applying') failedDuringApply.value = true
  if (newVal === 'applying') failedDuringApply.value = false
})

onMounted(() => {
  if (deployStatus.value === 'idle' && selectedTopologyId.value) {
    handleGenerate()
  }
})

function handleGenerate() {
  if (!selectedTopologyId.value) return
  generateCode(selectedTopologyId.value, {
    onSuccess(data) {
      planId.value = data.planId
      hclPreview.value = data.hclPreview
    },
  })
}

function handlePlanClick() {
  planPanelVisible.value = true
  handlePlan()
}

function handlePlan() {
  if (!planId.value) return
  runPlan(planId.value, {
    onSuccess(data) { planData.value = data },
  })
}

function handleApply() {
  if (!planId.value) return
  const initialResources = planData.value?.items.map(i => i.address) ?? []
  startApply(planId.value, initialResources)
}

function handleVerifyStart() {
  store.setDeployStatus('verifying')
}

function handleRetryApply() {
  failedDuringApply.value = false
  handleApply()
}

function handleKeepPartial() {
  failedDuringApply.value = false
  store.setDeployStatus('verifying')
}

// Apply 패널에서 롤백 → Plan 패널 닫고 HCL 전체 화면 복귀
function handleRollback() {
  failedDuringApply.value = false
  planData.value = null
  planPanelVisible.value = false
  store.setDeployStatus('planning')
}

// Plan 패널 "처음으로" → Plan 패널 닫고 HCL 전체 화면
function handleRegen() {
  planData.value = null
  planPanelVisible.value = false
}

function handleEditCode() {
  planData.value = null
  planPanelVisible.value = false
  store.setDeployStatus('planning')
}

function handleReviewTopology() {
  store.setDeployStatus('idle')
  planId.value = null
  hclPreview.value = null
  planData.value = null
  planPanelVisible.value = false
  router.push('/iac/topology-select')
}

function handleBackStep() {
  store.setDeployStatus('idle')
  planId.value = null
  hclPreview.value = null
  planData.value = null
  planPanelVisible.value = false
  router.push('/iac/topology-select')
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- 헤더 -->
    <div class="px-8 pt-5 pb-3 shrink-0">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h1 class="text-xl font-bold text-text-primary">Terraform 배포</h1>
          <p class="text-xs text-text-secondary mt-0.5">인프라 코드를 생성하고 실제 리소스를 프로비저닝합니다.</p>
        </div>
        <span v-if="deployStatus === 'done'"
          class="flex items-center gap-1.5 text-xs font-medium text-status-ok bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          배포 완료
        </span>
      </div>
      <AppStepper :steps="STEPS" :currentStep="currentStep" compact />
    </div>

    <!-- 바디: 3-패널 CSS transition -->
    <div class="flex-1 relative overflow-hidden">

      <!-- 1~3. 기존 패널 wrapper (검증 시 왼쪽으로 퇴장) -->
      <div class="absolute inset-0" :style="existingPanelsStyle">

        <!-- 1. HCL 패널 (left-anchored, right로 너비 조절) -->
        <div class="absolute inset-y-0 left-0 overflow-hidden" :style="hclPanelStyle">
          <IacHclPanel
            :hclPreview="hclPreview"
            :isGenerating="deployStatus === 'generating'"
            :isPlanning="isPlanning"
            :planStarted="planPanelVisible"
            @plan="handlePlanClick"
          />
        </div>

        <!-- 2. Plan 패널 (right-anchored, w-1/2) -->
        <div class="absolute inset-y-0 right-0 w-1/2 overflow-hidden" :style="planPanelStyle">
          <IacPlanPanel
            :planData="planData"
            :isPlanning="isPlanning"
            @apply="handleApply"
            @regen="handleRegen"
          />
        </div>

        <!-- 3. Apply 패널 (right-anchored, w-1/2, z-index 2) -->
        <div class="absolute inset-y-0 right-0 w-1/2 overflow-hidden" :style="applyPanelStyle">
          <IacApplyPanel
            :resources="resources"
            :failedDuringApply="failedDuringApply"
            :isApplyDone="isApplyDone"
            @retryApply="handleRetryApply"
            @keepPartial="handleKeepPartial"
            @rollback="handleRollback"
            @stop="stopApply"
            @verifyStart="handleVerifyStart"
          />
        </div>

      </div>

      <!-- 4. 검증 패널 (full-screen, 오른쪽에서 진입하며 push) -->
      <div
        class="absolute inset-0 px-8 pt-3 pb-4 overflow-y-auto bg-white"
        style="mask-image: linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 24px), transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)"
        :style="verifyPanelStyle"
      >
        <IacVerifyPanel
          :verifyData="verifyData ?? null"
          :visible="isVerifying"
          @retryVerify="store.setDeployStatus('verifying')"
          @editCode="handleEditCode"
          @reviewTopology="handleReviewTopology"
        />
      </div>

    </div>

    <!-- 푸터 -->
    <div class="px-6 py-4 flex items-center justify-between shrink-0">
      <button
        :disabled="deployStatus === 'applying'"
        @click="handleBackStep"
        class="flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        이전 단계
      </button>
      <button
        :disabled="deployStatus !== 'done'"
        @click="router.push('/dashboard')"
        class="btn-brand min-w-[200px] flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        모니터링 대시보드로 이동
      </button>
    </div>

  </div>
</template>
