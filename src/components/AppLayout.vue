<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppSidebarNav from './AppSidebarNav.vue'
import ChatbotModal from './ChatbotModal.vue'
import { topTabs } from './layout/nav-config'
import { pageTransition } from '@/composables/usePageTransition'

const route = useRoute()
</script>

<template>
  <div class="h-screen bg-[#F4F5F7] flex flex-col">

    <!-- 헤더 -->
    <header class="h-14 bg-white border-b border-border flex items-center px-6 gap-8 shrink-0">
      <div class="flex items-center gap-2 shrink-0">
        <span class="font-bold text-text-primary text-[15px] tracking-tight">ZeuX</span>
      </div>

      <nav class="flex items-center gap-1">
        <RouterLink v-for="tab in topTabs" :key="tab.label" :to="tab.to" custom v-slot="{ navigate }">
          <button
            @click="navigate"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              route.path.startsWith(tab.match)
                ? 'bg-gray-100 text-text-primary'
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary',
            ]"
          >
            <svg
              class="w-4 h-4 shrink-0"
              :class="route.path.startsWith(tab.match) ? 'text-[var(--color-brand)]' : 'text-current'"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              v-html="tab.icon"
            />
            {{ tab.label }}
          </button>
        </RouterLink>
      </nav>
      <div class="flex-1" />

    </header>

    <!-- 바디 -->
    <div class="flex-1 flex gap-4 p-4 overflow-hidden">
      <AppSidebarNav />
      <main class="flex-1 relative overflow-y-auto bg-white rounded-xl shadow-sm border border-border">
        <RouterView v-slot="{ Component }">
          <Transition :name="pageTransition">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <ChatbotModal />
  </div>
</template>
