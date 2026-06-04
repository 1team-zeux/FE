<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentStep = computed(() => {
  const match = route.path.match(/\/iac\/(\d)/)
  return match ? parseInt(match[1]) : 1
})

const steps = [
  { step: 1, label: '문서 업로드',    to: '/iac/1' },
  { step: 2, label: '폼 검토',        to: '/iac/2' },
  { step: 3, label: '토폴로지 선택',  to: '/iac/3' },
  { step: 4, label: 'Terraform 배포', to: '/iac/4' },
]

const navItems = [
  { label: 'Overview',         to: '/dashboard' },
  { label: 'SLA 번들',         to: '/sla'        },
  { label: 'MELA 타임라인',    to: '/mela'       },
  { label: 'IaC 온보딩',       to: '/iac/1'      },
]
</script>

<template>
  <!-- 페이지 배경 -->
  <div class="h-screen bg-[#EDEEF0] flex items-center justify-center p-5">
    <!-- 메인 카드 -->
    <div class="w-full h-full bg-bg-card rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.10)] overflow-hidden flex flex-col">

      <!-- ── 상단 헤더 ── -->
      <header class="h-14 border-b border-border flex items-center px-5 gap-6 shrink-0 bg-bg-card">
        <!-- 로고 -->
        <div class="flex items-center gap-2 shrink-0">
          <div class="w-7 h-7 btn-brand rounded-lg flex items-center justify-center text-white font-bold text-sm">Z</div>
          <span class="font-bold text-text-primary text-sm tracking-tight">ZeuX</span>
        </div>

        <!-- 스텝 탭 (중앙) -->
        <nav class="flex-1 flex justify-center">
          <div class="flex items-center gap-1">
            <RouterLink
              v-for="s in steps"
              :key="s.step"
              :to="s.to"
              custom
              v-slot="{ navigate }"
            >
              <button
                @click="navigate"
                :class="[
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  currentStep === s.step
                    ? 'bg-bg-muted text-text-primary font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-muted/60',
                ]"
              >
                <span
                  :class="[
                    'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                    currentStep === s.step
                      ? 'btn-brand text-white'
                      : 'bg-border text-text-muted',
                  ]"
                >{{ s.step }}</span>
                {{ s.label }}
              </button>
            </RouterLink>
          </div>
        </nav>

        <!-- 우측: 검색 + 유저 -->
        <div class="flex items-center gap-3 shrink-0">
          <div class="flex items-center gap-2 bg-bg-muted rounded-lg px-3 py-1.5 text-sm text-text-muted w-44">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <span class="text-xs">검색...</span>
          </div>
          <button class="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-muted transition-colors">
            <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
          </button>
          <div class="w-7 h-7 rounded-full btn-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
            OP
          </div>
        </div>
      </header>

      <!-- ── 바디 ── -->
      <div class="flex-1 flex overflow-hidden">

        <!-- 좌측 내비게이션 -->
        <aside class="w-52 border-r border-border flex flex-col py-4 px-3 shrink-0 bg-bg-card">
          <div class="mb-1">
            <p class="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-2 mb-1">메뉴</p>
            <ul class="space-y-0.5">
              <li v-for="item in navItems" :key="item.to">
                <RouterLink
                  :to="item.to"
                  custom
                  v-slot="{ isActive, navigate }"
                >
                  <a
                    href="#"
                    @click.prevent="navigate"
                    :class="[
                      'flex items-center px-2 py-1.5 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-bg-muted text-text-primary font-semibold'
                        : 'text-text-secondary hover:bg-bg-muted/70 hover:text-text-primary',
                    ]"
                  >
                    {{ item.label }}
                  </a>
                </RouterLink>
              </li>
            </ul>
          </div>

          <!-- 하단 고정: 팀 정보 -->
          <div class="mt-auto px-2 pt-4 border-t border-border">
            <p class="text-[10px] text-text-muted font-medium">SK AX · Operating Team</p>
            <p class="text-[10px] text-text-muted mt-0.5">On Duty</p>
          </div>
        </aside>

        <!-- 콘텐츠 영역 -->
        <main class="flex-1 overflow-hidden bg-bg-page">
          <RouterView />
        </main>

      </div>
    </div>
  </div>
</template>
