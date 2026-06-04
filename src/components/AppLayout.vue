<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const topTabs = [
  {
    label: 'IaC 온보딩',
    match: '/iac',
    to: '/iac/1',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>`,
  },
  {
    label: 'Activity',
    match: '/activity',
    to: '/activity',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M22 12h-4l-3 9L9 3l-3 9H2"/>`,
  },
  {
    label: 'SLA 관리',
    match: '/sla',
    to: '/sla',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`,
  },
  {
    label: '모니터링',
    match: '/dashboard',
    to: '/dashboard',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>`,
  },
]

const mainNav = [
  {
    label: 'IaC 온보딩',
    to: '/iac/1',
    match: '/iac',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>`,
    hasChevron: true,
  },
  {
    label: 'Overview',
    to: '/dashboard',
    match: '/dashboard',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>`,
    hasChevron: false,
  },
  {
    label: 'SLA 번들',
    to: '/sla',
    match: '/sla',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`,
    hasChevron: false,
  },
  {
    label: 'MELA 타임라인',
    to: '/mela',
    match: '/mela',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z"/>`,
    hasChevron: false,
  },
  {
    label: 'Topology',
    to: '/iac/3',
    match: '/nowhere',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>`,
    hasChevron: false,
  },
]

const bottomNav = [
  {
    label: '설정',
    to: '/settings',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`,
  },
  {
    label: '알림 내역',
    to: '/notifications',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>`,
  },
]
</script>

<template>
  <div class="h-screen bg-[#F4F5F7] flex flex-col">

    <!-- ── 헤더 ── -->
    <header class="h-14 bg-white border-b border-border flex items-center px-6 gap-8 shrink-0">
      <!-- 로고 -->
      <div class="flex items-center gap-2 shrink-0">
        <div class="w-7 h-7 btn-brand rounded-md flex items-center justify-center text-white font-extrabold text-sm">Z</div>
        <span class="font-bold text-text-primary text-[15px] tracking-tight">ZeuX</span>
      </div>

      <!-- 중앙 탭 -->
      <nav class="flex items-center gap-1">
        <RouterLink
          v-for="tab in topTabs"
          :key="tab.label"
          :to="tab.to"
          custom
          v-slot="{ navigate }"
        >
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

      <!-- 우측: 검색 + 알림 + 아바타 -->
      <div class="flex items-center gap-3 shrink-0">
        <div class="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 w-48">
          <svg class="w-3.5 h-3.5 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span class="text-xs text-text-muted">Search anything...</span>
        </div>
        <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors relative">
          <svg class="w-4.5 h-4.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </button>
        <div class="w-8 h-8 rounded-full overflow-hidden border-2 border-border shrink-0">
          <div class="w-full h-full btn-brand flex items-center justify-center text-white text-xs font-bold">OP</div>
        </div>
      </div>
    </header>

    <!-- ── 바디 ── -->
    <div class="flex-1 flex gap-4 p-4 overflow-hidden">

      <!-- 좌측 사이드바 (떠있는 카드) -->
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
                  class="w-3.5 h-3.5 shrink-0 opacity-60"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
            </RouterLink>
          </li>
        </ul>

        <!-- 구분선 -->
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

        <!-- Storage 카드 -->
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

      <!-- 콘텐츠 -->
      <main class="flex-1 overflow-hidden">
        <RouterView />
      </main>

    </div>
  </div>
</template>
