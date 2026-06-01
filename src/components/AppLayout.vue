<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppStepper from './AppStepper.vue'
import ChatbotModal from './ChatbotModal.vue'

defineProps<{
  chatbotMode?: 'floating' | 'panel'
}>()

const route = useRoute()
const currentStep = computed(() => {
  const match = route.path.match(/\/iac\/(\d)/)
  return match ? parseInt(match[1]) : 1
})

const steps = [
  { label: '문서 업로드' },
  { label: '폼 검토' },
  { label: '토폴로지 선택' },
  { label: 'Terraform 배포' },
]
</script>

<template>
  <div class="min-h-screen bg-bg-page flex flex-col">
    <!-- 헤더 -->
    <header class="bg-bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg btn-brand flex items-center justify-center text-white font-bold text-sm">Z</div>
        <span class="font-semibold text-text-primary">ZeuX</span>
        <span class="text-text-muted text-sm">IaC 온보딩</span>
      </div>
      <AppStepper :steps="steps" :current-step="currentStep" />
    </header>

    <!-- 컨텐츠 -->
    <main class="flex-1 overflow-auto">
      <RouterView />
    </main>

    <!-- 챗봇 -->
    <ChatbotModal :mode="chatbotMode ?? 'floating'" />
  </div>
</template>
