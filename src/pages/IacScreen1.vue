<script setup lang="ts">
import { ref, computed } from 'vue'
import UploadZone from '@/features/iac/components/UploadZone.vue'
import { useUploadSession } from '@/features/iac/api/useUploadSession'

const slaFile = ref<File | null>(null)
const infraFile = ref<File | null>(null)
const canProceed = computed(() => !!slaFile.value && !!infraFile.value)

const { mutate: startUpload, isPending } = useUploadSession()

function handleStart() {
  if (!slaFile.value || !infraFile.value) return
  startUpload({ sla: slaFile.value, infra: infraFile.value })
}
</script>

<template>
  <div class="h-full overflow-y-auto">
  <div class="max-w-3xl mx-auto px-6 py-10 space-y-8">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">문서 업로드</h1>
      <p class="mt-1 text-text-secondary">SLA 계약서와 인프라 정보 문서를 업로드하면 AI가 자동으로 분석합니다.</p>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <UploadZone
        label="SLA 계약서"
        accept=".pdf"
        description="서비스 수준 목표(SLO), 가용성, RTO/RPO 등이 포함된 계약서"
        @select="slaFile = $event"
      />
      <UploadZone
        label="인프라 추가 정보"
        accept=".pdf"
        description="현재 인프라 구성, 피크 트래픽, 예산 정보 등"
        @select="infraFile = $event"
      />
    </div>

    <div class="flex justify-end pt-4">
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
  </div>
</template>
