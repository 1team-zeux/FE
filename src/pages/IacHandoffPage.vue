<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { api } from '@/services/api'
import { useIacStore } from '@/features/iac'
import type { VerifyResult } from '@/features/iac'
import { useHandoffHealthcheckByPlan } from '@/features/iac/api/useTerraform'

// 배포 완료 후 고객사 핸드오프 페이지
// /iac/deploy 종료 후 운영자가 고객사에 전달할 접속 정보 / DB / SSH 키 표시 + 라이브 핑
const store = useIacStore()
const router = useRouter()
const { deployStatus, lastPlanId } = storeToRefs(store)

// verify 또는 done 상태에서만 접근 (apply 중에 들어오면 deploy로 돌려보냄)
if (!['verifying', 'done'].includes(deployStatus.value)) {
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

// 실제 AWS 자원 라이브 헬스체크 (ALB HTTP / Bastion TCP 22 / ECS describe_services) — 5초 polling
const liveEnabled = computed(() => !!planId.value)
const healthcheckQuery = useHandoffHealthcheckByPlan(planId, liveEnabled)
const live = computed(() => healthcheckQuery.data.value ?? null)
const liveAlbDot = computed(() => live.value?.alb.ok ? 'bg-green-500' : live.value?.alb ? 'bg-red-500' : 'bg-gray-300')
const liveBastionDot = computed(() => live.value?.bastion_ssh.ok ? 'bg-green-500' : live.value?.bastion_ssh ? 'bg-red-500' : 'bg-gray-300')
const liveEcsDot = computed(() => live.value?.ecs.ok ? 'bg-green-500' : live.value?.ecs ? 'bg-red-500' : 'bg-gray-300')

// 운영자 보유 zeux-key.pem 재탕 — terraform 이 더이상 .pem 생성 안 함
const SSH_KEY_PATH = '~/skala-최종팀플/zeux-key.pem'

// 복사 피드백
const copied = ref<string | null>(null)
function copyText(text: string, key: string) {
  if (!text) return
  navigator.clipboard.writeText(text)
  copied.value = key
  setTimeout(() => { copied.value = null }, 2000)
}

// 비밀번호 표시 토글
const showPassword = ref(false)
const showDbPassword = ref(false)

// 전체 정보 PDF 다운로드 (마크다운 정리, 색 X)
async function downloadPdf() {
  const el = document.getElementById('handoff-print-content')
  if (!el) return
  // 동적 import — 초기 번들 크기 영향 최소화
  const html2pdf = (await import('html2pdf.js')).default
  const customerId = (handoff.value?.customerId || 'demo').replace(/[^a-z0-9@.]/gi, '-')
  const filename = `handoff-${customerId}-${new Date().toISOString().slice(0, 10)}.pdf`
  // 임시로 보이게 → 캡처 → 다시 숨김
  el.style.display = 'block'
  try {
    await html2pdf().set({
      margin: 15,
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css'] },
    } as any).from(el).save()
  } finally {
    el.style.display = 'none'
  }
}

// 고객사 로그인 페이지 열기 (customer_id 이메일 자동 채움)
function openCustomerLogin() {
  const customerId = handoff.value?.customerId
  if (!customerId) return
  const url = `/login?email=${encodeURIComponent(customerId)}`
  window.open(url, '_blank', 'noopener')
}

// 재핑
function rePing() {
  verifyQuery.refetch()
}

// PDF용 발행 일시 (markdown 본문에서 사용)
const issuedAt = computed(() => {
  return new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
})
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">
    <!-- 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-text-primary">배포 완료 — 고객사 정보 전달</h1>
        <p class="text-sm text-text-secondary mt-0.5">아래 정보를 안전하게 고객사에 전달하세요. 비밀번호와 SSH 키는 한 번만 표시됩니다.</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- 전체 정보 .pdf 다운로드 (마크다운 정리, 색 X) -->
        <button
          @click="downloadPdf"
          class="flex items-center gap-2 px-4 py-2 bg-white border border-border hover:bg-bg-muted text-text-primary text-sm font-semibold rounded-xl transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          전체 정보 .pdf 다운로드
        </button>
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
    </div>

    <!-- 실제 AWS 자원 라이브 헬스체크 (5초 polling) -->
    <div class="bg-white border rounded-2xl p-5 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="flex items-center gap-1.5 text-sm font-semibold text-text-primary bg-bg-muted px-3 py-1 rounded-full border">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            라이브
          </span>
          <h2 class="text-base font-semibold text-text-primary">실제 AWS 자원 상태</h2>
        </div>
        <span class="text-xs text-text-secondary">
          {{ live ? '5초마다 갱신' : '연결 대기 중...' }}
        </span>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <!-- ALB HTTP -->
        <div class="border rounded-xl p-3">
          <div class="flex items-center gap-2 mb-1.5">
            <span :class="liveAlbDot" class="w-2.5 h-2.5 rounded-full"></span>
            <span class="text-sm font-semibold text-text-primary">ALB HTTP</span>
          </div>
          <div class="font-mono text-xs text-text-secondary truncate" :title="live?.alb.url || ''">
            {{ live?.alb.url || 'pending' }}
          </div>
          <div class="text-xs text-text-secondary mt-1">
            <template v-if="live?.alb.ok">
              {{ live.alb.status_code }} · {{ live.alb.latency_ms }}ms
            </template>
            <template v-else-if="live?.alb.error">
              <span class="text-red-600 truncate inline-block max-w-full" :title="live.alb.error">{{ live.alb.error }}</span>
            </template>
            <template v-else>—</template>
          </div>
        </div>
        <!-- Bastion SSH -->
        <div class="border rounded-xl p-3">
          <div class="flex items-center gap-2 mb-1.5">
            <span :class="liveBastionDot" class="w-2.5 h-2.5 rounded-full"></span>
            <span class="text-sm font-semibold text-text-primary">Bastion SSH</span>
          </div>
          <div class="font-mono text-xs text-text-secondary truncate">
            {{ live?.bastion_ssh.public_ip || 'pending' }}:22
          </div>
          <div class="text-xs text-text-secondary mt-1">
            <template v-if="live?.bastion_ssh.ok">TCP {{ live.bastion_ssh.latency_ms }}ms</template>
            <template v-else-if="live?.bastion_ssh.error">
              <span class="text-red-600 truncate inline-block max-w-full" :title="live.bastion_ssh.error">{{ live.bastion_ssh.error }}</span>
            </template>
            <template v-else>—</template>
          </div>
        </div>
        <!-- ECS tasks -->
        <div class="border rounded-xl p-3">
          <div class="flex items-center gap-2 mb-1.5">
            <span :class="liveEcsDot" class="w-2.5 h-2.5 rounded-full"></span>
            <span class="text-sm font-semibold text-text-primary">ECS Tasks</span>
          </div>
          <div class="font-mono text-xs text-text-secondary truncate" :title="live?.ecs.cluster || ''">
            {{ live?.ecs.cluster || 'pending' }}
          </div>
          <div class="text-xs text-text-secondary mt-1">
            <template v-if="live?.ecs.ok || (live && live.ecs.desired > 0)">
              running {{ live.ecs.running }} / desired {{ live.ecs.desired }}
            </template>
            <template v-else-if="live?.ecs.error">
              <span class="text-red-600 truncate inline-block max-w-full" :title="live.ecs.error">{{ live.ecs.error }}</span>
            </template>
            <template v-else>—</template>
          </div>
        </div>
      </div>
      <!-- ECS service breakdown (있으면) -->
      <div v-if="live?.ecs.tasks?.length" class="mt-3 grid grid-cols-2 gap-1.5 text-xs">
        <div
          v-for="t in live.ecs.tasks"
          :key="t.service"
          class="flex items-center justify-between border rounded px-2 py-1 bg-bg-muted"
        >
          <span class="font-mono truncate">{{ t.service }}</span>
          <span :class="t.running >= t.desired && t.desired > 0 ? 'text-green-700' : 'text-amber-600'" class="font-semibold">
            {{ t.running }}/{{ t.desired }}
          </span>
        </div>
      </div>
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
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
          </svg>
          <h2 class="text-base font-semibold text-blue-900">고객사 접속 정보</h2>
        </div>
        <!-- 고객사 ID 미리 채워진 로그인 페이지를 새 탭으로 -->
        <button
          @click="openCustomerLogin"
          class="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
          title="고객사 ID가 미리 채워진 로그인 페이지를 새 탭으로 엽니다"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
          로그인 페이지 열기
        </button>
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

        <!-- SSH 명령어 — 운영자 보유 zeux-key.pem 재탕 -->
        <div class="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs">
          <div class="flex items-center justify-between mb-1">
            <span class="text-gray-400 text-[10px]">SSH 명령어 (운영자 보유 zeux-key.pem 재사용)</span>
            <button
              @click="copyText(`ssh -i ${SSH_KEY_PATH} ec2-user@${handoff?.bastionPublicIp || ''}`, 'sshCmd')"
              class="text-[10px] text-gray-400 hover:text-green-300"
            >
              {{ copied === 'sshCmd' ? '복사됨!' : '복사' }}
            </button>
          </div>
          <div>$ ssh -i {{ SSH_KEY_PATH }} ec2-user@{{ handoff?.bastionPublicIp || '...' }}</div>
        </div>

        <!-- 안내: zeux-key.pem 재탕 정책 -->
        <div class="bg-white border border-purple-200 rounded-lg p-3 text-xs text-text-secondary leading-relaxed">
          <div class="font-semibold text-purple-900 mb-1">SSH 키 정책</div>
          Terraform 은 더 이상 새 SSH 키페어를 생성하지 않습니다. 운영자가 보유한
          <code class="font-mono bg-bg-muted px-1 rounded">zeux-key.pem</code> 의 공개키를
          <code class="font-mono bg-bg-muted px-1 rounded">.env</code> 의
          <code class="font-mono bg-bg-muted px-1 rounded">BASTION_PUBLIC_KEY</code> 로 주입하여
          새 Bastion 에 자동 등록됩니다. 위 명령어는 운영자 워크스테이션에서 그대로 실행하면 됩니다.
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

    <!-- PDF 다운로드용 마크다운 정리 콘텐츠 (평소 hidden, html2pdf 캡처 직전 잠시 보임) -->
    <div
      id="handoff-print-content"
      style="display: none; font-family: 'Helvetica Neue', Arial, sans-serif; color: #000000; background: #ffffff; padding: 20px 24px; line-height: 1.5;"
    >
      <h1 style="font-size: 22pt; margin: 0 0 8px 0; padding-bottom: 8px; border-bottom: 1.5pt solid #000000; color: #000000;">
        고객사 정보 전달
      </h1>
      <p style="font-size: 10pt; margin: 0 0 24px 0; color: #000000;">
        고객사: <strong>{{ handoff?.customerId ?? '-' }}</strong> · 발행 일시: {{ issuedAt }}
      </p>

      <h2 style="font-size: 14pt; margin: 18px 0 8px 0; padding-bottom: 4px; border-bottom: 0.5pt solid #000000; color: #000000;">
        1. 접속 정보
      </h2>
      <ul style="margin: 0 0 12px 0; padding-left: 20px; font-size: 11pt; color: #000000;">
        <li style="margin-bottom: 4px;">로그인 URL: <code>{{ handoff?.loginUrl ?? '-' }}</code></li>
        <li style="margin-bottom: 4px;">고객사 ID: <code>{{ handoff?.customerId ?? '-' }}</code></li>
        <li style="margin-bottom: 4px;">초기 비밀번호: <code>{{ handoff?.initialPassword ?? '-' }}</code></li>
      </ul>

      <h2 style="font-size: 14pt; margin: 18px 0 8px 0; padding-bottom: 4px; border-bottom: 0.5pt solid #000000; color: #000000;">
        2. 운영자 SSH 접근 (Bastion)
      </h2>
      <ul style="margin: 0 0 12px 0; padding-left: 20px; font-size: 11pt; color: #000000;">
        <li style="margin-bottom: 4px;">Bastion 퍼블릭 IP: <code>{{ handoff?.bastionPublicIp ?? '-' }}</code></li>
        <li style="margin-bottom: 4px;">SSH 명령어: <code>ssh -i {{ SSH_KEY_PATH }} ec2-user@{{ handoff?.bastionPublicIp ?? '...' }}</code></li>
        <li style="margin-bottom: 4px;">SSH 키: 운영자 보유 <code>zeux-key.pem</code> 재사용 (공개키만 Bastion 에 등록됨)</li>
      </ul>

      <h2 style="font-size: 14pt; margin: 18px 0 8px 0; padding-bottom: 4px; border-bottom: 0.5pt solid #000000; color: #000000;">
        3. 데이터베이스 (RDS PostgreSQL)
      </h2>
      <ul style="margin: 0 0 12px 0; padding-left: 20px; font-size: 11pt; color: #000000;">
        <li style="margin-bottom: 4px;">엔드포인트: <code>{{ handoff?.dbEndpoint ?? '-' }}</code></li>
        <li style="margin-bottom: 4px;">비밀번호: <code>{{ handoff?.dbPassword ?? '-' }}</code></li>
      </ul>

      <h2 style="font-size: 14pt; margin: 18px 0 8px 0; padding-bottom: 4px; border-bottom: 0.5pt solid #000000; color: #000000;">
        4. 인프라 리소스 (참고)
      </h2>
      <ul style="margin: 0 0 12px 0; padding-left: 20px; font-size: 11pt; color: #000000;">
        <li style="margin-bottom: 4px;">ALB DNS: <code>{{ handoff?.albDnsName ?? '-' }}</code></li>
        <li style="margin-bottom: 4px;">ECS Cluster: <code>{{ handoff?.ecsClusterName ?? '-' }}</code></li>
        <li style="margin-bottom: 4px;">S3 Bucket: <code>{{ handoff?.s3BucketName ?? '-' }}</code></li>
      </ul>

      <p style="font-size: 9pt; margin: 24px 0 0 0; padding-top: 8px; border-top: 0.3pt solid #000000; color: #000000;">
        본 문서는 ZeuX IaC 시스템에서 자동 생성되었습니다. 비밀번호는 첫 로그인 후 즉시 변경하시기 바랍니다.
      </p>
    </div>
  </div>
</template>
