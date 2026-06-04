<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{
  chatbotMode?: 'floating' | 'panel'
}>()

const route = useRoute()
</script>

<template>
  <div class="h-screen bg-bg-page flex flex-col">
    <!-- 헤더 -->
    <header class="bg-bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="font-semibold text-text-primary">ZeuX</span>
      </div>
    </header>

    <!-- 컨텐츠 -->
    <main class="flex-1 overflow-hidden">
      <RouterView />
    </main>

  </div>
</template>
