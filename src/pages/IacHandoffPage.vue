<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { api } from '@/services/api'
import { useIacStore } from '@/features/iac'
import type { VerifyResult } from '@/features/iac'

// 배포 완료 후 고객사 핸드오프 페이지
// /iac/deploy 종료 후 운영자가 고객사에 전달할 접속 정보 / DB / SSH 키 표시 + 라이브 핑
const store = useIacStore()
const router = useRouter()
const { deployStatus, lastPlanId } = storeToRefs(store)

// 배포 완료 상태가 아니면 deploy 페이지로 리다이렉트
if (deployStatus.value !== 'done') {
  router.replace('/iac/deploy')
}

// 마지막 verifyId(planId) — store에 보관된 값을 사용
const planId = computed(() => lastPlanId.value)

// verify 응답 (handoff + pings)
const verifyQuery = useQuery({
  queryKey: ['terraform-verify-handoff', planId],
  queryFn: async () => {
    if (!planId.value) throw new Error('planId 없음')
    const res = await api.get(`/terraform/verify/${planId.value}`)
    return res.data as VerifyResult
  },
  enabled: () => !!planId.value,
  retry: 1,
})

const verifyData = computed(() => verifyQuery.data.value)
const handoff = computed(() => verifyData.value?.handoff ?? null)
const pings = computed(() => verifyData.value?.pings ?? [])
const overall = computed(() => verifyData.value?.overall ?? 'pending')

// 복사 피드백
const copied = ref<string | null>(null)
function copyText(text: string, key: string) {
  if (!text) return
  navigator.clipboard.writeText(text)
  copied.value = key
  setTimeout(() => { copied.value = null }, 2000)
}

// 비밀번호 / SSH 키 표시 토글
const showPassword = ref(false)
const showDbPassword = ref(false)
const showSshKey = ref(false)

// .pem 다운로드
function downloadPem() {
  const pem = handoff.value?.bastionSshPrivateKey
  if (!pem) return
  const customerId = handoff.value?.customerId || 'bastion'
  const blob = new Blob([pem], { type: 'application/x-pem-file' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bastion-${customerId}.pem`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 재핑
function rePing() {
  verifyQuery.refetch()
}
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">
    <!-- 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-text-primary">배포 완료 — 고객사 정보 전달</h1>
        <p class="text-sm text-text-secondary mt-0.5">아래 정보를 안전하게 고객사에 전달하세요. 비밀번호와 SSH 키는 한 번만 표시됩니다.</p>
      </div>
      <button
        @click="router.push('/dashboard')"
        class="flex items-center gap-2 px-4 py-2 bg-[#2980B9] hover:bg-[#2471a3] text-white text-sm font-semibold rounded-xl transition-colors"
      >
        모니터링 대시보드로 이동
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
    </div>

    <!-- 인프라 상태 (라이브 핑) -->
    <div class="bg-white border rounded-2xl p-5 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span v-if="overall === 'pass'" class="flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
            ✅ 모든 리소스 정상
          </span>
          <span v-else-if="overall === 'fail'" class="flex items-center gap-1.5 text-sm font-semibold text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
            ⚠️ 일부 실패
          </span>
          <span v-else class="flex items-center gap-1.5 text-sm font-semibold text-gray-600 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
            ⏳ 확인 중
          </span>
          <h2 class="text-base font-semibold text-text-primary">인프라 상태</h2>
        </div>
        <button
          @click="rePing"
          :disabled="verifyQuery.isFetching.value"
          class="text-xs px-3 py-1.5 border rounded-lg hover:bg-bg-muted disabled:opacity-50"
        >
          {{ verifyQuery.isFetching.value ? '핑 전송 중...' : '재핑' }}
        </button>
      </div>
      <div v-if="pings.length === 0" class="text-sm text-text-secondary py-4 text-center">
        핑 결과 로딩 중...
      </div>
      <div v-else class="divide-y">
        <div
          v-for="ping in pings"
          :key="ping.resource + ping.endpoint"
          class="py-2.5 flex items-center justify-between text-sm"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span
              :class="ping.status === 'ok' ? 'bg-green-500' : 'bg-red-500'"
              class="w-2 h-2 rounded-full shrink-0"
            />
            <span class="font-medium text-text-primary w-48 shrink-0">{{ ping.resource }}</span>
            <span class="font-mono text-xs text-text-secondary truncate">{{ ping.endpoint }}</span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-xs text-text-secondary">{{ ping.latencyMs }}ms</span>
            <span
              :class="ping.status === 'ok' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'"
              class="text-xs px-2 py-0.5 rounded-full border font-medium"
            >
              {{ ping.status === 'ok' ? '정상' : '실패' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 고객사 접속 정보 -->
    <div class="bg-blue-50 border border-blue-100 rounded-2xl p-5">
      <div class="flex items-center gap-2 mb-4">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
        </svg>
        <h2 class="text-base font-semibold text-blue-900">고객사 접속 정보</h2>
      </div>
      <div class="space-y-2.5">
        <!-- 로그인 URL -->
        <div class="bg-white rounded-lg p-3 flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-text-secondary mb-1">로그인 URL</div>
            <div class="font-mono text-sm truncate">{{ handoff?.loginUrl ?? '-' }}</div>
          </div>
          <button
            @click="copyText(handoff?.loginUrl ?? '', 'loginUrl')"
            class="ml-3 text-xs text-blue-600 hover:underline shrink-0"
          >
            {{ copied === 'loginUrl' ? '복사됨!' : '복사' }}
          </button>
        </div>

        <!-- 고객사 ID -->
        <div class="bg-white rounded-lg p-3 flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-text-secondary mb-1">고객사 ID</div>
            <div class="font-mono text-sm truncate">{{ handoff?.customerId ?? '-' }}</div>
          </div>
          <button
            @click="copyText(handoff?.customerId ?? '', 'customerId')"
            class="ml-3 text-xs text-blue-600 hover:underline shrink-0"
          >
            {{ copied === 'customerId' ? '복사됨!' : '복사' }}
          </button>
        </div>

        <!-- 초기 비밀번호 -->
        <div class="bg-white rounded-lg p-3 flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-text-secondary mb-1">초기 비밀번호</div>
            <div class="font-mono text-sm truncate">
              {{ showPassword ? handoff?.initialPassword : '••••••••••••' }}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-3">
            <button @click="showPassword = !showPassword" class="text-xs text-blue-600 hover:underline">
              {{ showPassword ? '숨기기' : '보기' }}
            </button>
            <button @click="copyText(handoff?.initialPassword ?? '', 'initialPassword')" class="text-xs text-blue-600 hover:underline">
              {{ copied === 'initialPassword' ? '복사됨!' : '복사' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 운영자 SSH 접근 -->
    <div class="bg-purple-50 border border-purple-100 rounded-2xl p-5">
      <div class="flex items-center gap-2 mb-4">
        <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <h2 class="text-base font-semibold text-purple-900">운영자 SSH 접근 (Bastion)</h2>
      </div>
      <div class="space-y-2.5">
        <!-- Bastion IP -->
        <div class="bg-white rounded-lg p-3 flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-text-secondary mb-1">Bastion 퍼블릭 IP</div>
            <div class="font-mono text-sm truncate">{{ handoff?.bastionPublicIp ?? '-' }}</div>
          </div>
          <button
            @click="copyText(handoff?.bastionPublicIp ?? '', 'bastionIp')"
            class="ml-3 text-xs text-purple-600 hover:underline shrink-0"
          >
            {{ copied === 'bastionIp' ? '복사됨!' : '복사' }}
          </button>
        </div>

        <!-- SSH 명령어 -->
        <div class="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="text-gray-400 text-[10px]">SSH 명령어</span>
            <button
              @click="copyText(`ssh -i bastion-${handoff?.customerId || 'demo'}.pem ec2-user@${handoff?.bastionPublicIp || ''}`, 'sshCmd')"
              class="text-[10px] text-gray-400 hover:text-green-300"
            >
              {{ copied === 'sshCmd' ? '복사됨!' : '복사' }}
            </button>
          </div>
          <div>$ ssh -i bastion-{{ handoff?.customerId || 'demo' }}.pem ec2-user@{{ handoff?.bastionPublicIp || '...' }}</div>
        </div>

        <!-- SSH 개인키 -->
        <div class="bg-white rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs text-text-secondary">SSH 개인키 (PEM)</div>
            <div class="flex items-center gap-2">
              <button @click="showSshKey = !showSshKey" class="text-xs text-purple-600 hover:underline">
                {{ showSshKey ? '숨기기' : '보기' }}
              </button>
              <button
                @click="downloadPem"
                class="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                .pem 다운로드
              </button>
            </div>
          </div>
          <pre v-if="showSshKey" class="font-mono text-[10px] bg-gray-50 p-2 rounded overflow-x-auto max-h-40">{{ handoff?.bastionSshPrivateKey || '키 정보 없음' }}</pre>
          <div v-else class="font-mono text-xs text-text-secondary">-----BEGIN RSA PRIVATE KEY----- ••• -----END RSA PRIVATE KEY-----</div>
        </div>
      </div>
    </div>

    <!-- DB 정보 -->
    <div class="bg-orange-50 border border-orange-100 rounded-2xl p-5">
      <div class="flex items-center gap-2 mb-4">
        <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
        </svg>
        <h2 class="text-base font-semibold text-orange-900">데이터베이스 정보 (RDS PostgreSQL)</h2>
      </div>
      <div class="space-y-2.5">
        <div class="bg-white rounded-lg p-3 flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-text-secondary mb-1">DB 엔드포인트</div>
            <div class="font-mono text-sm truncate">{{ handoff?.dbEndpoint ?? '-' }}</div>
          </div>
          <button
            @click="copyText(handoff?.dbEndpoint ?? '', 'dbEndpoint')"
            class="ml-3 text-xs text-orange-600 hover:underline shrink-0"
          >
            {{ copied === 'dbEndpoint' ? '복사됨!' : '복사' }}
          </button>
        </div>
        <div class="bg-white rounded-lg p-3 flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-text-secondary mb-1">DB 비밀번호</div>
            <div class="font-mono text-sm truncate">
              {{ showDbPassword ? handoff?.dbPassword : '••••••••••••••••' }}
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-3">
            <button @click="showDbPassword = !showDbPassword" class="text-xs text-orange-600 hover:underline">
              {{ showDbPassword ? '숨기기' : '보기' }}
            </button>
            <button @click="copyText(handoff?.dbPassword ?? '', 'dbPassword')" class="text-xs text-orange-600 hover:underline">
              {{ copied === 'dbPassword' ? '복사됨!' : '복사' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 인프라 리소스 (참고용) -->
    <div class="bg-gray-50 border rounded-2xl p-5">
      <h2 class="text-base font-semibold text-text-primary mb-4">인프라 리소스 (참고)</h2>
      <div class="space-y-2.5">
        <div class="bg-white rounded-lg p-3 flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-text-secondary mb-1">ALB DNS</div>
            <div class="font-mono text-sm truncate">{{ handoff?.albDnsName ?? '-' }}</div>
          </div>
          <button @click="copyText(handoff?.albDnsName ?? '', 'albDns')" class="ml-3 text-xs text-text-secondary hover:text-text-primary shrink-0">
            {{ copied === 'albDns' ? '복사됨!' : '복사' }}
          </button>
        </div>
        <div class="bg-white rounded-lg p-3 flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-text-secondary mb-1">ECS 클러스터</div>
            <div class="font-mono text-sm truncate">{{ handoff?.ecsClusterName ?? '-' }}</div>
          </div>
          <button @click="copyText(handoff?.ecsClusterName ?? '', 'ecsCluster')" class="ml-3 text-xs text-text-secondary hover:text-text-primary shrink-0">
            {{ copied === 'ecsCluster' ? '복사됨!' : '복사' }}
          </button>
        </div>
        <div class="bg-white rounded-lg p-3 flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-xs text-text-secondary mb-1">S3 버킷</div>
            <div class="font-mono text-sm truncate">{{ handoff?.s3BucketName ?? '-' }}</div>
          </div>
          <button @click="copyText(handoff?.s3BucketName ?? '', 's3Bucket')" class="ml-3 text-xs text-text-secondary hover:text-text-primary shrink-0">
            {{ copied === 's3Bucket' ? '복사됨!' : '복사' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
