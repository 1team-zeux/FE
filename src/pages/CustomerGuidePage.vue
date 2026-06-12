<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCustomerSetupQuery } from '@/features/customer/api/useCustomerSetupQuery'
import { useAuthStore } from '@/features/auth/store/useAuthStore'

const auth = useAuthStore()
const { data: setup, isLoading, error } = useCustomerSetupQuery()

const copied = ref<string | null>(null)
function copyText(text: string, key: string) {
  navigator.clipboard.writeText(text)
  copied.value = key
  setTimeout(() => { copied.value = null }, 2000)
}

const checked = ref({ step1: false, step2: false, step3: false })
const serviceType = ref<'java' | 'python'>('java')

const javaDockerExample = computed(() => `# docker-compose.yml 예시
services:
  my-service:
    image: your-java-image
    environment:
      - OTEL_SERVICE_NAME=my-service      # ← 서비스명 지정 (유일하게 수정 필요)
    env_file:
      - /tmp/aiops-monitoring/otel.env    # ← 설치 스크립트가 생성한 파일
    volumes:
      - /tmp/aiops-monitoring/opentelemetry-javaagent.jar:/aiops/javaagent.jar:ro`)

const pythonDockerExample = computed(() => `# docker-compose.yml 예시
services:
  my-service:
    image: your-python-image
    environment:
      - OTEL_SERVICE_NAME=my-service      # ← 서비스명 지정 (유일하게 수정 필요)
    env_file:
      - /tmp/aiops-monitoring/otel-python.env  # ← 설치 스크립트가 생성한 파일
    command: opentelemetry-instrument uvicorn app:app --host 0.0.0.0 --port 8000`)

const pythonDockerfileNote = `# Dockerfile에 추가 필요
RUN pip install opentelemetry-distro opentelemetry-exporter-otlp && \\
    opentelemetry-bootstrap -a install`

const allDone = computed(() => checked.value.step1 && checked.value.step2 && checked.value.step3)
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <!-- 헤더 -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-text-primary">ZeuX 모니터링 에이전트 설치 가이드</h1>
      <p class="text-sm text-text-secondary mt-1">3단계로 모니터링을 시작하세요.</p>
    </div>

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <svg class="animate-spin w-6 h-6 text-[#2980B9]" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
      설치 정보를 불러오지 못했습니다. 관리자에게 문의하세요.
    </div>

    <div v-else class="space-y-5">
      <!-- 고객사 배너 -->
      <div class="bg-[#2980B9]/5 border border-[#2980B9]/20 rounded-xl p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-[#2980B9] flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <div>
          <div class="text-sm font-semibold text-text-primary">{{ setup?.bu_name ?? auth.user?.name }}</div>
          <div class="text-xs text-text-secondary font-mono">tenant: {{ setup?.customer_code ?? auth.user?.customerCode }}</div>
        </div>
      </div>

      <!-- Step 1: 에이전트 설치 (원클릭) -->
      <div class="bg-white border border-border rounded-xl overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-border bg-gray-50/50">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="checked.step1" class="w-4 h-4 accent-[#2980B9]" />
            <span class="text-sm font-semibold text-text-primary">Step 1 — 에이전트 설치 (원클릭)</span>
          </label>
          <span class="ml-auto text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">자동 설치</span>
        </div>
        <div class="p-4 space-y-3">
          <p class="text-xs text-text-secondary">
            고객사 서버에서 아래 명령어를 실행하세요. <strong>node_exporter</strong>, <strong>cAdvisor</strong>, <strong>otelcol</strong>이 자동 설치·시작됩니다.
          </p>
          <div class="relative">
            <div class="bg-gray-900 rounded-xl p-4">
              <code class="text-xs text-green-400 break-all">{{ setup?.curl_command ?? '로딩 중...' }}</code>
            </div>
            <button
              @click="copyText(setup?.curl_command ?? '', 'curl')"
              class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded transition-colors"
            >{{ copied === 'curl' ? '복사됨!' : '복사' }}</button>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
            <p class="font-semibold">설치 완료 후 자동 수집 시작:</p>
            <ul class="space-y-0.5 ml-2">
              <li>• CPU / 메모리 / 디스크 / 네트워크 메트릭</li>
              <li>• Docker 컨테이너 메트릭 (cAdvisor)</li>
            </ul>
            <p class="text-blue-500 mt-1">설치 후 <code class="bg-blue-100 px-1 rounded">/tmp/aiops-monitoring/</code> 에 파일 생성됨</p>
          </div>
        </div>
      </div>

      <!-- Step 2: 앱 계측 -->
      <div class="bg-white border border-border rounded-xl overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-border bg-gray-50/50">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="checked.step2" class="w-4 h-4 accent-[#2980B9]" />
            <span class="text-sm font-semibold text-text-primary">Step 2 — 애플리케이션 계측 연결</span>
          </label>
          <span class="ml-auto text-[10px] font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">서비스명만 입력</span>
        </div>
        <div class="p-4 space-y-3">
          <p class="text-xs text-text-secondary">
            Step 1 설치 후 <code class="bg-gray-100 px-1 rounded">/tmp/aiops-monitoring/otel.env</code> 파일이 생성됩니다.<br/>
            <strong>OTEL_SERVICE_NAME 하나만</strong> 지정하면 트레이스·로그·메트릭이 자동 수집됩니다.
          </p>

          <!-- 언어 탭 -->
          <div class="flex gap-1 border border-border rounded-lg p-1 w-fit">
            <button
              @click="serviceType = 'java'"
              :class="['px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', serviceType === 'java' ? 'bg-[#2980B9] text-white' : 'text-text-secondary hover:bg-gray-50']"
            >Java / Spring</button>
            <button
              @click="serviceType = 'python'"
              :class="['px-3 py-1.5 text-xs font-semibold rounded-md transition-colors', serviceType === 'python' ? 'bg-[#2980B9] text-white' : 'text-text-secondary hover:bg-gray-50']"
            >Python / FastAPI</button>
          </div>

          <!-- Java -->
          <div v-if="serviceType === 'java'" class="space-y-3">
            <div class="relative">
              <pre class="bg-gray-900 rounded-lg p-4 text-xs text-green-300 overflow-x-auto">{{ javaDockerExample }}</pre>
              <button
                @click="copyText(javaDockerExample, 'java')"
                class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded transition-colors"
              >{{ copied === 'java' ? '복사됨!' : '복사' }}</button>
            </div>
            <div class="bg-gray-50 rounded-lg p-3 text-xs text-text-secondary">
              <span class="font-semibold text-text-primary">otel.env에 이미 포함된 것:</span>
              JAVA_TOOL_OPTIONS (javaagent 경로), OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_RESOURCE_ATTRIBUTES (tenant_id 포함)
            </div>
          </div>

          <!-- Python -->
          <div v-if="serviceType === 'python'" class="space-y-3">
            <div class="relative">
              <pre class="bg-gray-900 rounded-lg p-4 text-xs text-yellow-300 overflow-x-auto">{{ pythonDockerfileNote }}</pre>
              <button
                @click="copyText(pythonDockerfileNote, 'py-df')"
                class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded transition-colors"
              >{{ copied === 'py-df' ? '복사됨!' : '복사' }}</button>
            </div>
            <div class="relative">
              <pre class="bg-gray-900 rounded-lg p-4 text-xs text-green-300 overflow-x-auto">{{ pythonDockerExample }}</pre>
              <button
                @click="copyText(pythonDockerExample, 'python')"
                class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded transition-colors"
              >{{ copied === 'python' ? '복사됨!' : '복사' }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: 서비스 재시작 -->
      <div class="bg-white border border-border rounded-xl overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-border bg-gray-50/50">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="checked.step3" class="w-4 h-4 accent-[#2980B9]" />
            <span class="text-sm font-semibold text-text-primary">Step 3 — 서비스 재시작</span>
          </label>
        </div>
        <div class="p-4 space-y-3">
          <p class="text-xs text-text-secondary">docker-compose 수정 후 서비스를 재시작하세요.</p>
          <div class="relative">
            <div class="bg-gray-900 rounded-lg px-4 py-3">
              <code class="text-xs text-green-400">docker-compose up -d --force-recreate</code>
            </div>
            <button
              @click="copyText('docker-compose up -d --force-recreate', 'restart')"
              class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded transition-colors"
            >{{ copied === 'restart' ? '복사됨!' : '복사' }}</button>
          </div>
          <p class="text-xs text-text-secondary">재시작 후 ZeuX 대시보드에서 약 1~2분 내 메트릭이 표시됩니다.</p>
        </div>
      </div>

      <!-- 완료 -->
      <div
        v-if="allDone"
        class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"
      >
        <svg class="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-sm text-green-700 font-medium">설정 완료! 잠시 후 ZeuX 대시보드에서 지표를 확인할 수 있습니다.</p>
      </div>
    </div>
  </div>
</template>
