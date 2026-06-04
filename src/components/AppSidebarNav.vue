<script setup lang="ts">
import { useRoute } from 'vue-router'
import { mainNav, bottomNav } from './layout/nav-config'

const route = useRoute()
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
            <svg v-if="item.hasChevron" class="w-3.5 h-3.5 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </RouterLink>
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
