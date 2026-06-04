<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { UploadZone, useUploadSession } from '@/features/iac'

const slaFile = ref<File | null>(null)
const infraFile = ref<File | null>(null)
const slaUrl = ref<string | null>(null)
const infraUrl = ref<string | null>(null)
const slaInput = ref<HTMLInputElement | null>(null)
const infraInput = ref<HTMLInputElement | null>(null)

const canProceed = computed(() => !!slaFile.value && !!infraFile.value)
const { mutate: startUpload, isPending } = useUploadSession()

function setFile(which: 'sla' | 'infra', file: File) {
  const blobUrl = URL.createObjectURL(file) + '#toolbar=0&navpanes=0&scrollbar=0'
  if (which === 'sla') {
    if (slaUrl.value) URL.revokeObjectURL(slaUrl.value)
    slaFile.value = file
    slaUrl.value = blobUrl
  } else {
    if (infraUrl.value) URL.revokeObjectURL(infraUrl.value)
    infraFile.value = file
    infraUrl.value = blobUrl
  }
}

function onFileChange(which: 'sla' | 'infra', e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) setFile(which, file)
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

    <!-- 2열 영역 -->
    <div class="flex-1 grid grid-cols-2 gap-6 px-8 pb-4 min-h-0">

      <!-- SLA 계약서 열 -->
      <div class="flex flex-col min-h-0">
        <p class="text-sm font-semibold text-text-primary mb-2 shrink-0">SLA 계약서</p>

        <!-- 업로드존: 파일 없을 때만 표시 -->
        <UploadZone
          v-if="!slaFile"
          label=""
          accept=".pdf"
          description="서비스 수준 목표(SLO), 가용성, RTO/RPO 등이 포함된 계약서"
          @select="setFile('sla', $event)"
        />

        <!-- PDF 뷰어: 파일 있을 때 전체 차지 -->
        <div v-else class="relative flex-1 min-h-0 rounded-xl border border-border overflow-hidden">
          <iframe :src="slaUrl!" class="w-full h-full" type="application/pdf" />

          <!-- 오버레이 변경 버튼 -->
          <div class="absolute top-2 right-2">
            <input
              ref="slaInput"
              type="file"
              accept=".pdf"
              class="hidden"
              @change="onFileChange('sla', $event)"
            />
            <button
              @click="slaInput?.click()"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              변경
            </button>
          </div>
        </div>
      </div>

      <!-- 인프라 추가 정보 열 -->
      <div class="flex flex-col min-h-0">
        <p class="text-sm font-semibold text-text-primary mb-2 shrink-0">인프라 추가 정보</p>

        <UploadZone
          v-if="!infraFile"
          label=""
          accept=".pdf"
          description="현재 인프라 구성, 피크 트래픽, 예산 정보 등"
          @select="setFile('infra', $event)"
        />

        <div v-else class="relative flex-1 min-h-0 rounded-xl border border-border overflow-hidden">
          <iframe :src="infraUrl!" class="w-full h-full" type="application/pdf" />

          <div class="absolute top-2 right-2">
            <input
              ref="infraInput"
              type="file"
              accept=".pdf"
              class="hidden"
              @change="onFileChange('infra', $event)"
            />
            <button
              @click="infraInput?.click()"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              변경
            </button>
          </div>
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
