<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mainNav, bottomNav } from './layout/nav-config'
import { useAuthStore } from '@/features/auth/store/useAuthStore'


const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isIacRoute = computed(() => route.path.startsWith('/iac'))

const IAC_STEPS = [
  { label: '문서 업로드',    to: '/iac/document-upload' },
  { label: 'SLA 검토',       to: '/iac/sla-review' },
  { label: '토폴로지 선택',  to: '/iac/topology-select' },
  { label: 'Terraform 배포', to: '/iac/deploy' },
]

const currentIacStep = computed(() => {
  const idx = IAC_STEPS.findIndex(s => route.path.startsWith(s.to))
  return idx >= 0 ? idx + 1 : 0
})
</script>

<template>
  <aside class="w-56 bg-white rounded-xl shadow-sm border border-border flex flex-col py-3 shrink-0 overflow-hidden">
    <!-- 메인 내비 -->
    <ul class="px-2 space-y-0.5 flex-1">
      <li v-for="item in mainNav" :key="item.label">
        <RouterLink :to="item.to" custom v-slot="{ navigate }">
          <button
            @click="navigate"
            :class="[
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
              route.path.startsWith(item.match)
                ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)] font-semibold'
                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary font-medium',
            ]"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="item.icon" />
            <span class="flex-1 text-left">{{ item.label }}</span>
            <svg
              v-if="item.hasChevron"
              class="w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200"
              :class="item.match === '/iac' && isIacRoute ? 'rotate-180' : ''"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </RouterLink>

        <!-- IaC 세로 스테퍼 -->
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <ul v-if="item.match === '/iac' && isIacRoute" class="mt-1 ml-4 pl-3 border-l-2 border-border space-y-0.5">
            <li v-for="(step, i) in IAC_STEPS" :key="step.to">
              <button
                @click="i + 1 < currentIacStep ? router.push(step.to) : undefined"
                :disabled="i + 1 >= currentIacStep"
                class="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-colors group"
                :class="i + 1 === currentIacStep
                  ? 'text-brand font-semibold cursor-default'
                  : i + 1 < currentIacStep
                    ? 'text-status-ok font-medium hover:bg-green-50 cursor-pointer'
                    : 'text-text-muted cursor-not-allowed opacity-40'"
              >
                <!-- 스텝 인디케이터 -->
                <span
                  class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors"
                  :class="i + 1 === currentIacStep
                    ? 'bg-brand border-brand text-white'
                    : i + 1 < currentIacStep
                      ? 'bg-status-ok border-status-ok text-white'
                      : 'bg-white border-border text-text-muted'"
                >
                  <svg v-if="i + 1 < currentIacStep" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span v-else class="text-[9px] font-bold">{{ i + 1 }}</span>
                </span>
                {{ step.label }}
              </button>
            </li>
          </ul>
        </transition>
      </li>
    </ul>

    <!-- Customer 전용 메뉴 -->
    <template v-if="auth.user?.role === 'CUSTOMER'">
      <div class="mx-3 my-2 border-t border-border" />
      <ul class="px-2 space-y-0.5">
        <li>
          <RouterLink to="/guide" custom v-slot="{ navigate }">
            <button
              @click="navigate"
              :class="[
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                route.path === '/guide'
                  ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)] font-semibold'
                  : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary font-medium',
              ]"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span class="flex-1 text-left">설치 가이드</span>
            </button>
          </RouterLink>
        </li>
      </ul>
    </template>

    <!-- Admin 전용 구분선 + 메뉴 -->
    <template v-if="auth.isAdmin">
      <div class="mx-3 my-2 border-t border-border" />
      <ul class="px-2 space-y-0.5">
        <li>
          <RouterLink to="/admin/customers" custom v-slot="{ navigate }">
            <button
              @click="navigate"
              :class="[
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                route.path.startsWith('/admin/customers')
                  ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)] font-semibold'
                  : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary font-medium',
              ]"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span class="flex-1 text-left">고객사 관리</span>
            </button>
          </RouterLink>
        </li>
      </ul>
    </template>

  </aside>
</template>
