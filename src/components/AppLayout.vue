<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppSidebarNav from './AppSidebarNav.vue'
import { topTabs } from './layout/nav-config'

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

      <div class="flex items-center gap-3 shrink-0">
        <div class="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 w-48">
          <svg class="w-3.5 h-3.5 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span class="text-xs text-text-muted">Search anything...</span>
        </div>
        <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </button>
        <div class="w-8 h-8 rounded-full overflow-hidden border-2 border-border shrink-0">
          <div class="w-full h-full btn-brand flex items-center justify-center text-white text-xs font-bold">OP</div>
        </div>
      </div>
    </header>

    <!-- 바디 -->
    <div class="flex-1 flex gap-4 p-4 overflow-hidden">
      <AppSidebarNav />
      <main class="flex-1 overflow-hidden">
        <RouterView />
      </main>
    </div>

  </div>
</template>
