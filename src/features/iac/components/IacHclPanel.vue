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

    <!-- loading (generating or idle before hcl arrives) -->
    <div v-if="!hclPreview"
      class="flex-1 flex flex-col items-center justify-center gap-4">
      <div class="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      <p class="text-text-secondary">Terraform HCL 코드 생성 중...</p>
    </div>

    <!-- HCL code -->
    <template v-else>
      <div class="flex-1 rounded-xl overflow-hidden border border-border flex flex-col relative min-h-0">
        <!-- 터미널 헤더 -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-red-500/70" />
            <span class="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span class="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span class="text-xs font-mono text-gray-400">main.tf</span>
          <span class="text-[10px] text-gray-500">Terraform HCL</span>
        </div>
        <!-- 코드 -->
        <pre class="flex-1 overflow-y-auto bg-gray-950 text-green-400 font-mono text-sm p-5 leading-relaxed whitespace-pre-wrap">{{ hclPreview }}</pre>
        <!-- Plan 실행 버튼 (Plan 패널 미노출 시에만) -->
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
