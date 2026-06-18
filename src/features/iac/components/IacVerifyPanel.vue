<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { VerifyResult } from '../api/useTerraform'

const props = defineProps<{
  verifyData: VerifyResult | null
  visible?: boolean
}>()

const emit = defineEmits<{
  retryVerify: []
  editCode: []
  reviewTopology: []
  complete: []  // 모든 핑이 settle된 직후 발생 — 푸터 "고객사 정보 확인" 활성화 트리거
}>()

// 순차 공개: 400ms 간격으로 아이템 등장, 700ms 후 결과 확정
const visibleCount = ref(0)
const settledCount = ref(0)
let revealTimer: ReturnType<typeof setInterval> | null = null
let settleTimer:  ReturnType<typeof setInterval> | null = null
let settleDelay:  ReturnType<typeof setTimeout>  | null = null

function startAnimation(total: number) {
  if (revealTimer) clearInterval(revealTimer)
  if (settleTimer)  clearInterval(settleTimer)
  if (settleDelay)  clearTimeout(settleDelay)
  visibleCount.value = 0
  settledCount.value = 0

  const REVEAL_MS   = 400
  const CHECKING_MS = 700

  revealTimer = setInterval(() => {
    visibleCount.value++
    if (visibleCount.value >= total) { clearInterval(revealTimer!); revealTimer = null }
  }, REVEAL_MS)

  settleDelay = setTimeout(() => {
    settleTimer = setInterval(() => {
      settledCount.value++
      if (settledCount.value >= total) { clearInterval(settleTimer!); settleTimer = null }
    }, REVEAL_MS)
  }, CHECKING_MS)
}

watch([() => props.verifyData, () => props.visible], ([data, visible]) => {
  if (!data || !visible) return
  startAnimation((data as VerifyResult).pings.length)
}, { immediate: true })

onUnmounted(() => {
  if (revealTimer) clearInterval(revealTimer)
  if (settleTimer)  clearInterval(settleTimer)
  if (settleDelay)  clearTimeout(settleDelay)
})

const visiblePings = computed(() => props.verifyData?.pings.slice(0, visibleCount.value) ?? [])
const allSettled   = computed(() =>
  !!props.verifyData && settledCount.value >= props.verifyData.pings.length
)

// 모두 settle되면 부모에게 complete 알림 (1회만)
watch(allSettled, (settled) => {
  if (settled) emit('complete')
})

const TYPE_LABEL: Record<string, string> = {
  aws_vpc:                     'VPC',
  aws_internet_gateway:        'IGW',
  aws_nat_gateway:             'NAT GW',
  aws_lb:                      'ALB',
  aws_autoscaling_group:       'ASG',
  aws_db_instance:             'RDS',
  aws_rds_cluster:             'Aurora',
  aws_rds_cluster_instance:    'Aurora Instance',
  aws_route53_health_check:    'Route53 HC',
  aws_cloudwatch_metric_alarm: 'CloudWatch',
  aws_lambda_function:         'Lambda',
  aws_api_gateway_rest_api:    'API GW',
  aws_spot_instance_request:   'EC2 Spot',
  aws_iam_role:                'IAM Role',
}

function typeLabel(resource: string) {
  const prefix = resource.split('.')[0]
  return TYPE_LABEL[prefix] ?? prefix.replace('aws_', '').replace(/_/g, ' ')
}
</script>

<template>
  <div class="space-y-4 pt-2">

    <!-- 로딩 -->
    <div v-if="!verifyData" class="flex items-center gap-3 py-8 justify-center">
      <div class="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      <p class="text-text-secondary">헬스체크 실행 중...</p>
    </div>

    <template v-else>

      <!-- 헤더 -->
      <p class="text-xs font-bold text-brand uppercase tracking-widest border-l-[3px] border-brand pl-3">
        인프라 헬스체크
      </p>

      <!-- Ping 결과 목록 -->
      <div class="rounded-xl border border-border overflow-hidden">
        <TransitionGroup tag="div" name="plan-row" class="divide-y divide-border">
          <div
            v-for="(ping, i) in visiblePings"
            :key="ping.resource"
            class="flex items-center gap-3 px-4 py-3 transition-colors duration-300"
            :class="{
              'bg-green-50/40': i < settledCount && ping.status === 'ok',
              'bg-red-50/40':   i < settledCount && ping.status === 'fail',
            }"
          >
            <!-- 상태 아이콘 -->
            <div class="shrink-0 w-5 h-5 flex items-center justify-center">
              <div v-if="i >= settledCount"
                class="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <svg v-else-if="ping.status === 'ok'"
                class="w-5 h-5 text-status-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              <svg v-else class="w-5 h-5 text-status-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>

            <!-- 리소스명 + 엔드포인트 -->
            <div class="flex-1 min-w-0">
              <p class="font-mono text-[11px] text-text-primary truncate">{{ ping.resource }}</p>
              <p class="text-[10px] text-text-muted truncate mt-0.5">{{ ping.endpoint }}</p>
            </div>

            <!-- 타입 배지 -->
            <span class="shrink-0 text-[9px] font-medium text-text-muted bg-bg-muted px-1.5 py-0.5 rounded">
              {{ typeLabel(ping.resource) }}
            </span>

            <!-- 결과 -->
            <div class="shrink-0 w-20 text-right">
              <span v-if="i >= settledCount" class="text-[10px] text-brand animate-pulse">확인 중...</span>
              <span v-else-if="ping.status === 'ok'"
                class="text-[12px] font-mono font-semibold text-status-ok">
                {{ ping.latencyMs }}ms
              </span>
              <span v-else class="text-[10px] text-status-critical leading-tight">{{ ping.detail }}</span>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- 전체 결과 배너 (모두 확정 후) -->
      <Transition name="fade-up">
        <div
          v-if="allSettled"
          class="rounded-xl p-4 flex items-center gap-4 border"
          :class="verifyData.overall === 'pass' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
        >
          <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            :class="verifyData.overall === 'pass' ? 'bg-status-ok' : 'bg-status-critical'">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="verifyData.overall === 'pass'"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              <path v-else
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-semibold"
              :class="verifyData.overall === 'pass' ? 'text-status-ok' : 'text-status-critical'">
              {{ verifyData.overall === 'pass'
                ? `전체 헬스체크 통과 — ${verifyData.pings.length}/${verifyData.pings.length}개 정상 응답`
                : '일부 헬스체크 실패' }}
            </p>
            <p class="text-sm text-text-secondary mt-0.5">
              {{ verifyData.overall === 'pass'
                ? '모든 리소스가 정상 응답합니다. 상태: 구축 중 → 운영 중'
                : '아래 실패 항목을 확인하고 복구 옵션을 선택하세요.' }}
            </p>
          </div>
        </div>
      </Transition>

      <!-- 복구 옵션 (실패 시) -->
      <div v-if="allSettled && verifyData.overall === 'fail'"
        class="rounded-xl border border-border p-4 space-y-3">
        <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider">복구 옵션</p>
        <div class="grid grid-cols-3 gap-3">
          <button @click="emit('retryVerify')"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-brand hover:bg-brand/5 transition-colors text-center">
            <svg class="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span class="text-sm font-semibold text-text-primary">재검증</span>
            <span class="text-xs text-text-muted">동일 구성으로 재시도</span>
          </button>
          <button @click="emit('editCode')"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-status-pending hover:bg-yellow-50 transition-colors text-center">
            <svg class="w-6 h-6 text-status-pending" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            <span class="text-sm font-semibold text-text-primary">코드 수정</span>
            <span class="text-xs text-text-muted">HCL 수정 후 재배포</span>
          </button>
          <button @click="emit('reviewTopology')"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-status-critical hover:bg-red-50 transition-colors text-center">
            <svg class="w-6 h-6 text-status-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
            <span class="text-sm font-semibold text-text-primary">토폴로지 재검토</span>
            <span class="text-xs text-text-muted">토폴로지 선택으로 돌아가기</span>
          </button>
        </div>
      </div>

    </template>
  </div>
</template>
