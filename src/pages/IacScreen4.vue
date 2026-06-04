<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  useIacStore,
  useGenerateTerraform, useTerraformPlan, useTerraformApply, useTerraformVerify,
  DeployProgress,
} from '@/features/iac'
import type { PlanResult } from '@/features/iac'

const store = useIacStore()
const { deployStatus, selectedTopologyId } = storeToRefs(store)

const planId = ref<string | null>(null)
const hclPreview = ref<string | null>(null)
const planData = ref<PlanResult | null>(null)

const { mutate: generateCode } = useGenerateTerraform()
const { mutate: runPlan, isPending: isPlanning } = useTerraformPlan()
const { resources, startApply, stopApply } = useTerraformApply()
const { data: verifyData } = useTerraformVerify(planId)

const subStep = computed(() => {
  switch (deployStatus.value) {
    case 'generating': return 1
    case 'planning': return 2
    case 'applying': return 3
    case 'verifying': case 'done': return 4
    default: return 0
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

function handlePlan() {
  if (!planId.value) return
  runPlan(planId.value, {
    onSuccess(data) {
      planData.value = data
    },
  })
}

function handleApply() {
  if (!planId.value) return
  startApply(planId.value)
}
</script>

<template>
  <div class="flex flex-col h-full">
  <div class="flex-1 overflow-y-auto">
  <div class="py-8 px-8 space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">Terraform 배포</h1>
      <p class="text-text-secondary mt-1">인프라 코드를 생성하고 실제 리소스를 프로비저닝합니다.</p>
    </div>

    <!-- 서브스텝 표시 -->
    <div class="flex gap-0 border border-border rounded-xl overflow-hidden">
      <div
        v-for="(label, i) in ['코드 생성', 'Plan 검토', 'Apply', '검증']"
        :key="i"
        class="flex-1 py-3 text-center text-sm font-medium border-r last:border-r-0 border-border"
        :class="i + 1 === subStep
          ? 'bg-brand text-white'
          : i + 1 < subStep ? 'bg-green-50 text-status-ok' : 'bg-bg-card text-text-muted'"
      >{{ label }}</div>
    </div>

    <!-- Step 0: 시작 -->
    <div v-if="deployStatus === 'idle'" class="text-center py-12">
      <p class="text-text-secondary mb-4">선택한 토폴로지로 Terraform HCL 코드를 생성합니다.</p>
      <button @click="handleGenerate" class="btn-brand">코드 생성 시작</button>
    </div>

    <!-- Step 1: 코드 생성 중 -->
    <div v-else-if="deployStatus === 'generating'" class="flex items-center justify-center py-16 gap-4">
      <div class="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      <p class="text-text-secondary">Terraform HCL 코드 생성 중...</p>
    </div>

    <!-- Step 2: Plan 검토 -->
    <div v-else-if="deployStatus === 'planning'" class="space-y-4">
      <div v-if="hclPreview" class="bg-gray-900 rounded-xl p-4 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono whitespace-pre-wrap">{{ hclPreview }}</pre>
      </div>
      <div v-if="!planData">
        <button @click="handlePlan" :disabled="isPlanning" class="btn-brand">
          {{ isPlanning ? 'Plan 실행 중...' : 'Terraform Plan 실행' }}
        </button>
      </div>
      <div v-else class="space-y-3">
        <h3 class="font-semibold text-text-primary">변경 계획 ({{ planData.items.length }}개 리소스)</h3>
        <div class="border border-border rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-bg-muted">
              <tr>
                <th class="text-left px-4 py-2 text-text-secondary font-medium">리소스</th>
                <th class="px-4 py-2 text-text-secondary font-medium">유형</th>
                <th class="px-4 py-2 text-text-secondary font-medium">위험도</th>
                <th class="px-4 py-2 text-text-secondary font-medium">SLA 영향</th>
                <th class="px-4 py-2 text-text-secondary font-medium">비용</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in planData.items" :key="item.resource" class="border-t border-border">
                <td class="px-4 py-2 font-mono text-xs text-text-primary">{{ item.resource }}</td>
                <td class="px-4 py-2 text-center">
                  <span class="px-2 py-0.5 rounded text-xs font-medium"
                    :class="item.changeType === 'add' ? 'bg-green-100 text-green-700' : item.changeType === 'change' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'">
                    {{ item.changeType }}
                  </span>
                </td>
                <td class="px-4 py-2 text-center">
                  <span class="px-2 py-0.5 rounded text-xs font-medium"
                    :class="item.riskLevel === 'low' ? 'bg-green-100 text-green-700' : item.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'">
                    {{ item.riskLevel }}
                  </span>
                </td>
                <td class="px-4 py-2 text-center text-xs text-text-secondary">{{ item.slaImpact }}</td>
                <td class="px-4 py-2 text-center text-xs text-text-secondary">{{ item.estimatedCost }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-end gap-3">
          <button class="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-muted">취소</button>
          <button @click="handleApply" class="btn-brand">Apply 실행</button>
        </div>
      </div>
    </div>

    <!-- Step 3: Apply 진행 -->
    <div v-else-if="deployStatus === 'applying'" class="space-y-4">
      <DeployProgress :resources="resources" />
      <div class="flex justify-end">
        <button @click="stopApply" class="px-4 py-2 border border-status-critical text-status-critical rounded-lg text-sm hover:bg-red-50">
          중단 요청
        </button>
      </div>
    </div>

    <!-- Step 4: 검증 결과 -->
    <div v-else-if="deployStatus === 'verifying' || deployStatus === 'done'" class="space-y-4">
      <div v-if="verifyData">
        <div
          v-if="verifyData.overall === 'pass'"
          class="p-4 bg-green-50 border border-status-ok rounded-xl flex items-center gap-3"
        >
          <svg class="w-6 h-6 text-status-ok shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p class="font-semibold text-status-ok">모든 검증 통과</p>
            <p class="text-sm text-text-secondary">인프라가 SLA 요건을 충족하며 정상 운영 중입니다.</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-4">
          <div
            v-for="cat in verifyData.categories"
            :key="cat.category"
            class="flex items-start gap-3 p-3 rounded-lg border"
            :class="cat.status === 'pass' ? 'border-status-ok bg-green-50' : 'border-status-critical bg-red-50'"
          >
            <svg class="w-5 h-5 shrink-0 mt-0.5" :class="cat.status === 'pass' ? 'text-status-ok' : 'text-status-critical'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="cat.status === 'pass'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <p class="text-sm font-medium text-text-primary">{{ cat.category }}</p>
              <p class="text-xs text-text-muted">{{ cat.detail }}</p>
            </div>
          </div>
        </div>

      </div>
      <div v-else class="flex items-center gap-3">
        <div class="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p class="text-text-secondary">안정성 검증 중...</p>
      </div>
    </div>
  </div>
  </div>
  <div class="px-6 py-4 border-t border-border bg-bg-card flex justify-end shrink-0">
    <button
      :disabled="deployStatus !== 'done'"
      @click="() => {}"
      class="btn-brand min-w-[200px]"
    >모니터링 대시보드로 이동</button>
  </div>
  </div>
</template>
