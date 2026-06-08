<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mainNav, bottomNav } from './layout/nav-config'

const route = useRoute()
const router = useRouter()

const isIacRoute = computed(() => route.path.startsWith('/iac'))

const IAC_STEPS = [
  { label: '문서 업로드',    to: '/iac/1' },
  { label: 'SLA 검토',       to: '/iac/2' },
  { label: '토폴로지 선택',  to: '/iac/3' },
  { label: 'Terraform 배포', to: '/iac/4' },
]

const currentIacStep = computed(() => {
  const match = route.path.match(/\/iac\/(\d)/)
  return match ? parseInt(match[1]) : 0
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
                @click="router.push(step.to)"
                class="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-colors group"
                :class="i + 1 === currentIacStep
                  ? 'text-brand font-semibold'
                  : i + 1 < currentIacStep
                    ? 'text-status-ok font-medium hover:bg-green-50'
                    : 'text-text-muted hover:bg-gray-50 hover:text-text-secondary'"
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

    <div class="mx-3 my-2 border-t border-border" />

    <!-- 하단 내비 -->
    <ul class="px-2 space-y-0.5">
      <li v-for="item in bottomNav" :key="item.label">
        <RouterLink :to="item.to" custom v-slot="{ navigate }">
          <button
            @click="navigate"
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="item.icon" />
            {{ item.label }}
          </button>
        </RouterLink>
      </li>
    </ul>

    <!-- 리소스 카드 -->
    <div class="mx-2 mt-2 bg-gray-50 rounded-lg p-3">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
          </svg>
          <span class="text-xs font-semibold text-text-primary">리소스</span>
        </div>
        <svg class="w-3 h-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </div>
      <div class="w-full h-1 bg-border rounded-full overflow-hidden">
        <div class="h-full w-[42%] bg-[var(--color-brand)] rounded-full" />
      </div>
      <p class="text-[10px] text-text-muted mt-1.5">12 / 28 인스턴스 사용 중</p>
    </div>
  </aside>
</template>
