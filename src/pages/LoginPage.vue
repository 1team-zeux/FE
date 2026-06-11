<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store/useAuthStore'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = '이메일과 비밀번호를 입력해주세요.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    if (auth.user?.role === 'CUSTOMER') {
      router.push('/guide')
    } else {
      router.push('/dashboard')
    }
  } catch (e: any) {
    error.value = e.message ?? '로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

function fillAdmin() {
  email.value = 'admin'
  password.value = 'qwer1234'
}
</script>

<template>
  <div class="min-h-screen flex relative overflow-hidden">

    <!-- 좌측 브랜딩 패널 (번개 모양 오른쪽 엣지) -->
    <div
      class="hidden lg:flex lg:w-[52%] shrink-0 flex-col items-center justify-center bg-[#2980B9] relative"
      style="clip-path: polygon(0 0, 88% 0, 100% 22%, 78% 50%, 100% 78%, 88% 100%, 0 100%)"
    >
      <!-- 배경 장식 원 -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-white/5" />
        <div class="absolute -bottom-24 -right-8 w-56 h-56 rounded-full bg-white/5" />
        <div class="absolute top-1/3 left-1/4 w-20 h-20 rounded-full bg-white/5" />
      </div>

      <div class="relative z-10 text-center text-white px-12 pr-20">
        <!-- 로고 -->
        <div class="flex items-center justify-center gap-3 mb-6">
          <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl">
            <svg class="w-9 h-9 text-[#2980B9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <span class="text-5xl font-black tracking-tight">ZeuX</span>
        </div>

        <p class="text-xl font-semibold mb-2 opacity-95">Multi-Tenant AIOps Platform</p>
        <p class="text-sm opacity-70 max-w-xs mx-auto leading-relaxed">
          SLA 기반 자동화된 인프라 운영 및<br>AI 기반 장애 분석 플랫폼
        </p>

        <div class="mt-10 grid grid-cols-3 gap-3 text-center">
          <div class="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div class="text-2xl font-bold">99.9%</div>
            <div class="text-xs opacity-70 mt-1">SLO 목표</div>
          </div>
          <div class="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div class="text-2xl font-bold">AI</div>
            <div class="text-xs opacity-70 mt-1">자동 RCA</div>
          </div>
          <div class="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div class="text-2xl font-bold">IaC</div>
            <div class="text-xs opacity-70 mt-1">자동 배포</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 우측 로그인 폼 -->
    <div class="flex-1 flex items-center justify-center bg-gray-50 px-8">
      <div class="w-full max-w-md">
        <!-- 모바일 로고 -->
        <div class="lg:hidden flex items-center gap-2 mb-8">
          <svg class="w-7 h-7 text-[#2980B9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span class="text-2xl font-black text-gray-900 tracking-tight">ZeuX</span>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 class="text-2xl font-bold text-gray-900 mb-1">로그인</h1>
          <p class="text-sm text-gray-500 mb-8">관리자로부터 발급받은 계정으로 로그인하세요.</p>

          <form @submit.prevent="handleLogin" class="space-y-5">
            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <input
                  v-model="email"
                  type="text"
                  placeholder="이메일 또는 아이디"
                  autocomplete="username"
                  class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/30 focus:border-[#2980B9] transition-colors bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="비밀번호"
                  autocomplete="current-password"
                  class="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9]/30 focus:border-[#2980B9] transition-colors bg-gray-50 focus:bg-white"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg v-if="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Error -->
            <div v-if="error" class="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              {{ error }}
            </div>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3 bg-[#2980B9] hover:bg-[#2471a3] text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ loading ? '로그인 중...' : '로그인' }}
            </button>
          </form>
        </div>

        <!-- 개발용 Admin 계정 안내 -->
        <div class="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span class="text-xs font-semibold text-amber-700">개발용 Admin 계정</span>
            </div>
            <button
              type="button"
              @click="fillAdmin"
              class="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-800 transition-colors shrink-0"
            >
              자동 입력
            </button>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <div class="bg-white/70 rounded-lg px-3 py-1.5">
              <div class="text-[9px] text-amber-600 font-semibold uppercase tracking-wide">ID</div>
              <code class="text-xs font-bold text-gray-800">admin</code>
            </div>
            <div class="bg-white/70 rounded-lg px-3 py-1.5">
              <div class="text-[9px] text-amber-600 font-semibold uppercase tracking-wide">PW</div>
              <code class="text-xs font-bold text-gray-800">qwer1234</code>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
