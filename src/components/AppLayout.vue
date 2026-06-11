<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import AppSidebarNav from './AppSidebarNav.vue'
import ChatbotModal from './ChatbotModal.vue'
import { topTabs } from './layout/nav-config'
import { pageTransition } from '@/composables/usePageTransition'
import { useAuthStore } from '@/features/auth/store/useAuthStore'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="h-screen bg-[#F4F5F7] flex flex-col">

    <!-- 헤더 -->
    <header class="h-14 bg-white border-b border-border flex items-center px-6 gap-8 shrink-0">
      <div class="flex items-center gap-2 shrink-0">
        <img
          src="@/assets/images/zeux-logo.png"
          alt="ZeuX"
          class="h-8 w-8 object-contain shrink-0"
        />
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

      <!-- 사용자 정보 + 로그아웃 -->
      <div class="flex items-center gap-3 shrink-0">
        <span class="text-xs text-text-secondary">{{ auth.user?.email }}</span>
        <span
          v-if="auth.isAdmin"
          class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2980B9]/10 text-[#2980B9]"
        >ADMIN</span>
        <button
          @click="handleLogout"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-gray-50 hover:text-red-500 transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          로그아웃
        </button>
      </div>

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
