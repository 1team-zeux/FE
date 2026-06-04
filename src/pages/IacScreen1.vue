<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { UploadZone, useUploadSession } from '@/features/iac'

const slaFile = ref<File | null>(null)
const infraFile = ref<File | null>(null)
const slaUrl = ref<string | null>(null)
const infraUrl = ref<string | null>(null)
const canProceed = computed(() => !!slaFile.value && !!infraFile.value)

const { mutate: startUpload, isPending } = useUploadSession()

function setFile(which: 'sla' | 'infra', file: File) {
  if (which === 'sla') {
    if (slaUrl.value) URL.revokeObjectURL(slaUrl.value)
    slaFile.value = file
    slaUrl.value = URL.createObjectURL(file)
  } else {
    if (infraUrl.value) URL.revokeObjectURL(infraUrl.value)
    infraFile.value = file
    infraUrl.value = URL.createObjectURL(file)
  }
}

onUnmounted(() => {
  if (slaUrl.value) URL.revokeObjectURL(slaUrl.value)
  if (infraUrl.value) URL.revokeObjectURL(infraUrl.value)
})

function handleStart() {
  if (!slaFile.value || !infraFile.value) return
  startUpload({ sla: slaFile.value, infra: infraFile.value })
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- 헤더 -->
    <div class="px-8 pt-8 pb-4 shrink-0">
      <h1 class="text-2xl font-bold text-text-primary">문서 업로드</h1>
      <p class="mt-1 text-text-secondary">SLA 계약서와 인프라 정보 문서를 업로드하면 AI가 자동으로 분석합니다.</p>
    </div>

    <!-- 2열 업로드 + PDF 미리보기 영역 -->
    <div class="flex-1 grid grid-cols-2 gap-6 px-8 pb-4 min-h-0">

      <!-- SLA 계약서 열 -->
      <div class="flex flex-col gap-3 min-h-0">
        <UploadZone
          label="SLA 계약서"
          accept=".pdf"
          description="서비스 수준 목표(SLO), 가용성, RTO/RPO 등이 포함된 계약서"
          @select="setFile('sla', $event)"
        />
        <div
          v-if="slaUrl"
          class="flex-1 min-h-0 rounded-xl border border-border overflow-hidden bg-gray-50"
        >
          <iframe
            :src="slaUrl"
            class="w-full h-full"
            type="application/pdf"
          />
        </div>
      </div>

      <!-- 인프라 추가 정보 열 -->
      <div class="flex flex-col gap-3 min-h-0">
        <UploadZone
          label="인프라 추가 정보"
          accept=".pdf"
          description="현재 인프라 구성, 피크 트래픽, 예산 정보 등"
          @select="setFile('infra', $event)"
        />
        <div
          v-if="infraUrl"
          class="flex-1 min-h-0 rounded-xl border border-border overflow-hidden bg-gray-50"
        >
          <iframe
            :src="infraUrl"
            class="w-full h-full"
            type="application/pdf"
          />
        </div>
      </div>

    </div>

    <!-- 푸터 -->
    <div class="px-6 py-4 border-t border-border bg-bg-card flex justify-end shrink-0">
      <button
        :disabled="!canProceed || isPending"
        @click="handleStart"
        class="btn-brand min-w-[160px]"
      >
        <span v-if="isPending">분석 중...</span>
        <span v-else>AI 분석 시작</span>
      </button>
    </div>

  </div>
</template>
