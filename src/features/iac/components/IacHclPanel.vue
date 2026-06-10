<script setup lang="ts">
defineProps<{
  hclPreview: string | null
  isGenerating: boolean
  isPlanning: boolean
  planStarted: boolean
}>()

defineEmits<{
  plan: []
}>()
</script>

<template>
  <div class="h-full flex flex-col pl-8 pr-4 pt-3 pb-4">

    <!-- 로딩 -->
    <div v-if="!hclPreview"
      class="flex-1 flex flex-col items-center justify-center gap-4">
      <div class="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      <p class="text-text-secondary">Terraform HCL 코드 생성 중...</p>
    </div>

    <!-- HCL 코드 -->
    <template v-else>
      <div class="flex-1 rounded-xl overflow-hidden border border-border flex flex-col relative min-h-0">

        <!-- 헤더 -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-white/8 shrink-0">
          <div class="flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            <span class="text-xs font-mono font-medium text-zinc-300">main.tf</span>
          </div>
          <span class="text-[10px] font-semibold tracking-wide text-brand bg-brand/15 border border-brand/25 px-2 py-0.5 rounded">
            Terraform HCL
          </span>
        </div>

        <!-- 코드 영역 -->
        <pre class="flex-1 overflow-y-auto bg-zinc-900 text-zinc-100 font-mono text-[13px] px-5 py-4 leading-relaxed whitespace-pre-wrap">{{ hclPreview }}</pre>

        <!-- Plan 실행 버튼 -->
        <Transition name="fade">
          <div v-if="!planStarted" class="absolute bottom-4 right-4">
            <button
              @click="$emit('plan')"
              :disabled="isPlanning"
              class="btn-brand flex items-center gap-2 shadow-lg shadow-black/40"
            >
              <div v-if="isPlanning" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
              {{ isPlanning ? 'Plan 실행 중...' : 'Terraform Plan 실행' }}
            </button>
          </div>
        </Transition>

      </div>
    </template>

  </div>
</template>
