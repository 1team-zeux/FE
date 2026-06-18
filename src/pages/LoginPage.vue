<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth/store/useAuthStore'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// 핸드오프 페이지에서 ?email=admin@skt 형태로 진입하면 이메일 자동 채움
const prefillEmail = (route.query.email as string | undefined) ?? ''
const email = ref(prefillEmail)
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
  <div class="min-h-screen flex relative overflow-hidden bg-white">

    <!-- 좌측 브랜딩 패널 — drop-shadow 래퍼가 clip-path 윤곽에 그림자 투영 -->
    <div class="hidden lg:flex lg:w-[70%] shrink-0 relative panel-shadow-wrapper">
      <div
        class="flex-1 flex flex-col items-center justify-center bg-[#2980B9] relative"
        style="clip-path: polygon(0 0, 91% 0, 100% 17%, 82% 38%, 96% 52%, 74% 68%, 100% 82%, 89% 100%, 0 100%)"
      >
        <!-- 배경 장식 원 + 부유 파티클 -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-white/5" />
          <div class="absolute -bottom-24 -right-8 w-56 h-56 rounded-full bg-white/5" />
          <div class="absolute top-1/3 left-1/4 w-20 h-20 rounded-full bg-white/5" />
          <span class="dot dot-1" />
          <span class="dot dot-2" />
          <span class="dot dot-3" />
          <span class="dot dot-4" />
          <span class="dot dot-5" />
          <span class="dot dot-6" />
        </div>

        <div class="relative z-10 text-center text-white px-12 pr-24">
          <!-- 로고 -->
          <div class="flex items-center justify-center gap-3 mb-6">
            <div class="w-16 h-16 bg-white rounded-[18px] flex items-center justify-center px-3 bolt-glow">
              <svg class="w-9 h-9 text-[#2980B9]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 2.5L4.5 14h6.8l-0.8 2.2-1.2 5.3L20 10.5H13.5z"/>
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
    </div>

    <!-- 우측 로그인 폼 -->
    <div class="flex-1 flex items-center justify-center px-8 bg-white">
      <div class="w-full max-w-md">
        <!-- 모바일 로고 -->
        <div class="lg:hidden flex items-center gap-2 mb-8">
          <svg class="w-7 h-7 text-[#2980B9]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 2.5L4.5 14h6.8l-0.8 2.2-1.2 5.3L20 10.5H13.5z"/>
          </svg>
          <span class="text-2xl font-black text-gray-900 tracking-tight">ZeuX</span>
        </div>

        <div class="bg-white rounded-2xl p-8 form-card">
          <h1
            class="text-2xl font-bold text-gray-900 mb-1"
            style="animation: field-in 0.28s cubic-bezier(0.22,1,0.36,1) 0.04s both"
          >로그인</h1>
          <p
            class="text-sm text-gray-500 mb-8"
            style="animation: field-in 0.28s cubic-bezier(0.22,1,0.36,1) 0.08s both"
          >관리자로부터 발급받은 계정으로 로그인하세요.</p>

          <form @submit.prevent="handleLogin" class="space-y-5">
            <!-- Email -->
            <div style="animation: field-in 0.32s cubic-bezier(0.22,1,0.36,1) 0.12s both">
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
            <div style="animation: field-in 0.32s cubic-bezier(0.22,1,0.36,1) 0.22s both">
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
              class="w-full py-3 bg-[#2980B9] hover:bg-[#2471a3] text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-login"
              style="animation: field-in 0.32s cubic-bezier(0.22,1,0.36,1) 0.32s both"
            >
              <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ loading ? '로그인 중...' : '로그인' }}
            </button>
          </form>
        </div>

        <!-- 개발 계정 ghost 링크 -->
        <div
          class="mt-3 text-center"
          style="animation: field-in 0.32s cubic-bezier(0.22,1,0.36,1) 0.40s both"
        >
          <button
            type="button"
            @click="fillAdmin"
            class="text-xs text-gray-400 hover:text-[#2980B9] transition-colors duration-200 hover:underline underline-offset-2"
          >
            개발용 계정으로 로그인
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* 좌측 패널 drop-shadow — clip-path 윤곽을 따라 파란 그림자 투영 */
.panel-shadow-wrapper {
  filter: drop-shadow(8px 0 28px rgba(41, 128, 185, 0.30));
}

/* 폼 카드 — border 대신 blue-tinted shadow */
.form-card {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.07),
    0 12px 40px -8px rgba(41, 128, 185, 0.15);
}

/* 부유 파티클 */
.dot {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  animation: float-drift linear infinite;
  pointer-events: none;
}
.dot-1 { width: 8px;  height: 8px;  top: 80%; left: 18%; animation-duration: 9s;  animation-delay: 0s;   }
.dot-2 { width: 5px;  height: 5px;  top: 88%; left: 30%; animation-duration: 12s; animation-delay: -3s;  }
.dot-3 { width: 10px; height: 10px; top: 92%; left: 12%; animation-duration: 14s; animation-delay: -7s;  }
.dot-4 { width: 4px;  height: 4px;  top: 85%; left: 58%; animation-duration: 7s;  animation-delay: -2s;  }
.dot-5 { width: 7px;  height: 7px;  top: 90%; left: 48%; animation-duration: 11s; animation-delay: -5s;  }
.dot-6 { width: 9px;  height: 9px;  top: 86%; left: 36%; animation-duration: 16s; animation-delay: -9s;  }

@keyframes float-drift {
  0%   { transform: translate(0, 0);          opacity: 0;   }
  8%   { opacity: 0.9; }
  30%  { transform: translate(22px, -28vh);   opacity: 0.8; }
  55%  { transform: translate(-18px, -52vh);  opacity: 0.6; }
  80%  { transform: translate(28px, -78vh);   opacity: 0.3; }
  100% { transform: translate(-10px, -100vh); opacity: 0;   }
}

/* 로고 박스 전기 glow 펄스 */
.bolt-glow {
  animation: bolt-pulse 2.8s ease-in-out infinite;
}

@keyframes bolt-pulse {
  0%, 100% {
    box-shadow:
      0 0  0   2px rgba(109, 213, 250, 0.15),
      0 0  16px 4px rgba(41, 128, 185, 0.25);
  }
  40% {
    box-shadow:
      0 0  0   8px  rgba(109, 213, 250, 0.55),
      0 0  40px 16px rgba(41, 128, 185, 0.70),
      0 0  70px 24px rgba(109, 213, 250, 0.25);
  }
  50% {
    box-shadow:
      0 0  0   12px rgba(109, 213, 250, 0.35),
      0 0  56px 20px rgba(41, 128, 185, 0.85),
      0 0  90px 32px rgba(109, 213, 250, 0.30);
  }
  60% {
    box-shadow:
      0 0  0   6px  rgba(109, 213, 250, 0.40),
      0 0  36px 12px rgba(41, 128, 185, 0.55),
      0 0  60px 20px rgba(109, 213, 250, 0.18);
  }
}

/* Submit 버튼 shine sweep */
.btn-login {
  position: relative;
  overflow: hidden;
}
.btn-login::before {
  content: '';
  position: absolute;
  top: 0;
  left: -75%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.28) 50%,
    transparent 60%
  );
  transform: skewX(-20deg);
}
.btn-login:not(:disabled):hover::before {
  animation: shine-sweep 0.55s ease-in-out forwards;
}

@keyframes shine-sweep {
  0%   { left: -75%; }
  100% { left: 125%; }
}
</style>
