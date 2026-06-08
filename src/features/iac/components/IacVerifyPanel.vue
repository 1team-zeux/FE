<script setup lang="ts">
import type { VerifyResult } from '../api/useTerraform'

defineProps<{
  verifyData: VerifyResult | null
}>()

const emit = defineEmits<{
  retryVerify: []
  editCode: []
  reviewTopology: []
}>()
</script>

<template>
  <div class="space-y-4 pt-2">
    <!-- 로딩 -->
    <div v-if="!verifyData" class="flex items-center gap-3 py-8 justify-center">
      <div class="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      <p class="text-text-secondary">안정성 검증 중...</p>
    </div>

    <template v-else>
      <!-- 전체 결과 배너 -->
      <div
        class="rounded-xl p-4 flex items-center gap-4 border"
        :class="verifyData.overall === 'pass' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
      >
        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          :class="verifyData.overall === 'pass' ? 'bg-status-ok' : 'bg-status-critical'">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="verifyData.overall === 'pass'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
        <div class="flex-1">
          <p class="font-semibold" :class="verifyData.overall === 'pass' ? 'text-status-ok' : 'text-status-critical'">
            {{ verifyData.overall === 'pass' ? '모든 검증 통과 — 운영 상태 전환' : '일부 검증 실패' }}
          </p>
          <p class="text-sm text-text-secondary mt-0.5">
            {{ verifyData.overall === 'pass'
              ? '인프라가 SLA 요건을 충족하며 정상 운영 중입니다. 상태: 구축중 → 운영중'
              : '아래 실패 항목을 확인하고 복구 옵션을 선택하세요.' }}
          </p>
        </div>
      </div>

      <!-- 카테고리 그리드 (8개) -->
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="cat in verifyData.categories"
          :key="cat.category"
          class="flex items-start gap-3 p-3.5 rounded-xl border transition-colors"
          :class="cat.status === 'pass' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'"
        >
          <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            :class="cat.status === 'pass' ? 'bg-status-ok/15' : 'bg-status-critical/15'">
            <svg class="w-3.5 h-3.5" :class="cat.status === 'pass' ? 'text-status-ok' : 'text-status-critical'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="cat.status === 'pass'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-text-primary">{{ cat.category }}</p>
            <p class="text-[11px] text-text-muted mt-0.5 leading-relaxed">{{ cat.detail }}</p>
          </div>
        </div>
      </div>

      <!-- 검증 실패 복구 옵션 -->
      <div v-if="verifyData.overall === 'fail'" class="rounded-xl border border-border p-4 space-y-3">
        <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider">복구 옵션</p>
        <div class="grid grid-cols-3 gap-3">
          <button
            @click="emit('retryVerify')"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-brand hover:bg-brand/5 transition-colors text-center"
          >
            <svg class="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span class="text-sm font-semibold text-text-primary">검증 재실행</span>
            <span class="text-xs text-text-muted">동일 구성으로 재검증</span>
          </button>
          <button
            @click="emit('editCode')"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-status-pending hover:bg-yellow-50 transition-colors text-center"
          >
            <svg class="w-6 h-6 text-status-pending" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            <span class="text-sm font-semibold text-text-primary">코드 수정</span>
            <span class="text-xs text-text-muted">HCL 코드 수정 후 재배포</span>
          </button>
          <button
            @click="emit('reviewTopology')"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-status-critical hover:bg-red-50 transition-colors text-center"
          >
            <svg class="w-6 h-6 text-status-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
            <span class="text-sm font-semibold text-text-primary">토폴로지 재검토</span>
            <span class="text-xs text-text-muted">토폴로지 선택으로 돌아가기</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
