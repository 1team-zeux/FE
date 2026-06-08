<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { UploadZone, useUploadSession } from '@/features/iac'

const slaFile = ref<File | null>(null)
const infraFile = ref<File | null>(null)
const slaUrl = ref<string | null>(null)
const infraUrl = ref<string | null>(null)
const slaInput = ref<HTMLInputElement | null>(null)
const infraInput = ref<HTMLInputElement | null>(null)
const slaLoaded = ref(false)
const infraLoaded = ref(false)

const canProceed = computed(() => !!slaFile.value && !!infraFile.value)
const { mutate: startUpload, isPending } = useUploadSession()

function setFile(which: 'sla' | 'infra', file: File) {
  const blobUrl = URL.createObjectURL(file) + '#toolbar=0&navpanes=0&scrollbar=0'
  if (which === 'sla') {
    if (slaUrl.value) URL.revokeObjectURL(slaUrl.value)
    slaFile.value = file
    slaUrl.value = blobUrl
    slaLoaded.value = false
  } else {
    if (infraUrl.value) URL.revokeObjectURL(infraUrl.value)
    infraFile.value = file
    infraUrl.value = blobUrl
    infraLoaded.value = false
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
    <div class="px-8 pt-6 pb-4 shrink-0">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h1 class="text-xl font-bold text-text-primary">문서 업로드</h1>
          <p class="text-xs text-text-secondary mt-0.5">SLA 계약서와 인프라 정보 문서를 업로드하면 AI가 자동으로 분석합니다.</p>
        </div>
      </div>
    </div>

    <!-- 2열 영역 -->
    <div class="flex-1 grid grid-cols-2 gap-5 px-8 pb-4 min-h-0">

      <!-- SLA 계약서 열 -->
      <div class="flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-2 shrink-0">
          <span class="w-5 h-5 rounded-md bg-brand/10 flex items-center justify-center">
            <svg class="w-3 h-3 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </span>
          <p class="text-sm font-semibold text-text-primary">SLA 계약서</p>
        </div>

        <UploadZone
          v-if="!slaFile"
          label=""
          accept=".pdf"
          description="서비스 수준 목표(SLO), 가용성, RTO/RPO 등이 포함된 계약서"
          @select="setFile('sla', $event)"
        />

        <!-- 파일 선택 후: 로딩 → PDF 확장 -->
        <Transition name="fade">
          <div v-if="slaFile" class="relative flex-1 min-h-0 rounded-xl border border-border overflow-hidden">

            <!-- 로딩 스피너 (PDF 렌더 전) -->
            <Transition name="fade">
              <div v-if="!slaLoaded" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                <div class="w-8 h-8 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
                <p class="text-xs text-text-muted mt-3">PDF 불러오는 중...</p>
              </div>
            </Transition>

            <!-- iframe: 로드 완료 후 clip-path로 위→아래 확장 -->
            <iframe
              :src="slaUrl!"
              type="application/pdf"
              class="w-full h-full"
              :style="{
                clipPath: slaLoaded ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
                transition: slaLoaded ? 'clip-path 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              }"
              @load="slaLoaded = true"
            />

            <!-- 변경 버튼 -->
            <Transition name="fade">
              <div v-if="slaLoaded" class="absolute top-2 right-2">
                <input ref="slaInput" type="file" accept=".pdf" class="hidden" @change="onFileChange('sla', $event)" />
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
            </Transition>
          </div>
        </Transition>
      </div>

      <!-- 인프라 추가 정보 열 -->
      <div class="flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-2 shrink-0">
          <span class="w-5 h-5 rounded-md bg-brand/10 flex items-center justify-center">
            <svg class="w-3 h-3 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/>
            </svg>
          </span>
          <p class="text-sm font-semibold text-text-primary">인프라 추가 정보</p>
        </div>

        <UploadZone
          v-if="!infraFile"
          label=""
          accept=".pdf"
          description="현재 인프라 구성, 피크 트래픽, 예산 정보 등"
          @select="setFile('infra', $event)"
        />

        <!-- 파일 선택 후: 로딩 → PDF 확장 -->
        <Transition name="fade">
          <div v-if="infraFile" class="relative flex-1 min-h-0 rounded-xl border border-border overflow-hidden">

            <!-- 로딩 스피너 -->
            <Transition name="fade">
              <div v-if="!infraLoaded" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                <div class="w-8 h-8 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
                <p class="text-xs text-text-muted mt-3">PDF 불러오는 중...</p>
              </div>
            </Transition>

            <!-- iframe -->
            <iframe
              :src="infraUrl!"
              type="application/pdf"
              class="w-full h-full"
              :style="{
                clipPath: infraLoaded ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
                transition: infraLoaded ? 'clip-path 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              }"
              @load="infraLoaded = true"
            />

            <!-- 변경 버튼 -->
            <Transition name="fade">
              <div v-if="infraLoaded" class="absolute top-2 right-2">
                <input ref="infraInput" type="file" accept=".pdf" class="hidden" @change="onFileChange('infra', $event)" />
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
            </Transition>
          </div>
        </Transition>
      </div>

    </div>

    <!-- 푸터 -->
    <div class="px-6 py-4 flex justify-end shrink-0">
      <button
        :disabled="!canProceed || isPending"
        @click="handleStart"
        class="btn-brand min-w-[160px] flex items-center justify-center gap-2"
      >
        <div v-if="isPending" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        {{ isPending ? 'AI 분석 중...' : 'AI 분석 시작' }}
      </button>
    </div>

  </div>
</template>
