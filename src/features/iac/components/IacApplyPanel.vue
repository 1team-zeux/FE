<script setup lang="ts">
import { computed } from 'vue'
import type { ResourceStatus } from '../api/useTerraform'

const props = defineProps<{
  resources: ResourceStatus[]
  failedDuringApply: boolean
  isApplyDone: boolean
}>()

const emit = defineEmits<{
  retryApply: []
  keepPartial: []
  rollback: []
  stop: []
  verifyStart: []
}>()

// ── 집계 ──────────────────────────────────────────────────
const counts = computed(() => ({
  complete:    props.resources.filter(r => r.status === 'complete').length,
  in_progress: props.resources.filter(r => r.status === 'in_progress').length,
  error:       props.resources.filter(r => r.status === 'error').length,
  pending:     props.resources.filter(r => r.status === 'pending').length,
}))

const total     = computed(() => props.resources.length)
const pct       = computed(() => total.value ? Math.round((counts.value.complete / total.value) * 100) : 0)
const remaining = computed(() => (counts.value.in_progress + counts.value.pending) * 3) // 리소스당 ~3초 추정

const currentResource = computed(() => props.resources.find(r => r.status === 'in_progress') ?? null)

// ── 리소스 타입 표시명 ─────────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  aws_vpc:                    'VPC',
  aws_internet_gateway:       'IGW',
  aws_subnet:                 'Subnet',
  aws_nat_gateway:            'NAT GW',
  aws_route_table:            'Route Table',
  aws_security_group:         'Security Group',
  aws_lb:                     'ALB',
  aws_lb_listener:            'ALB Listener',
  aws_autoscaling_group:      'ASG',
  aws_launch_template:        'Launch Template',
  aws_instance:               'EC2',
  aws_spot_instance_request:  'EC2 Spot',
  aws_db_instance:            'RDS',
  aws_rds_cluster:            'Aurora',
  aws_elasticache_cluster:    'ElastiCache',
  aws_lambda_function:        'Lambda',
  aws_iam_role:               'IAM Role',
  aws_iam_policy:             'IAM Policy',
  aws_cloudwatch_metric_alarm:'CloudWatch',
  aws_api_gateway_rest_api:   'API GW',
  aws_s3_bucket:              'S3',
  aws_ecs_cluster:            'ECS',
  aws_ecs_service:            'ECS Service',
  aws_eks_cluster:            'EKS',
}

function typeLabel(resource: string) {
  const prefix = resource.split('.')[0]
  return TYPE_LABEL[prefix] ?? prefix.replace('aws_', '').replace(/_/g, ' ')
}

function formatSeconds(s: number) {
  if (s < 60)  return `${s}초`
  return `${Math.ceil(s / 60)}분`
}
</script>

<template>
  <div class="h-full flex flex-col pl-4 pr-8 pt-3 pb-4 overflow-hidden">

    <!-- Apply 진행 중 -->
    <template v-if="!failedDuringApply">

      <!-- 헤더 -->
      <div class="shrink-0 mb-3">
        <div class="flex items-center justify-between mb-1.5">
          <p class="text-xs font-bold text-brand uppercase tracking-widest border-l-[3px] border-brand pl-3">
            Apply 현황
          </p>
          <span v-if="remaining > 0" class="text-[10px] text-text-muted">
            잔여 약 {{ formatSeconds(remaining) }}
          </span>
        </div>

        <!-- 진행률 바 -->
        <div class="h-2 bg-bg-muted rounded-full overflow-hidden mb-1.5">
          <div
            class="h-full bg-gradient-to-r from-brand-light to-brand rounded-full transition-all duration-700"
            :style="{ width: `${pct}%` }"
          />
        </div>

        <!-- 카운트 요약 -->
        <div class="flex items-center gap-3 text-[10px]">
          <span class="font-semibold text-text-primary">{{ counts.complete }}/{{ total }}건</span>
          <span v-if="counts.in_progress" class="text-status-warning font-medium flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-status-warning inline-block animate-pulse"/>
            진행 중 {{ counts.in_progress }}
          </span>
          <span v-if="counts.error" class="text-status-critical font-medium">
            실패 {{ counts.error }}
          </span>
          <span v-if="counts.pending" class="text-text-muted">대기 {{ counts.pending }}</span>
        </div>
      </div>

      <!-- 현재 작업 하이라이트 -->
      <Transition name="fade">
        <div v-if="currentResource"
          class="shrink-0 mb-3 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 flex items-center gap-2.5">
          <div class="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin shrink-0" />
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-brand truncate">{{ currentResource.resource }}</p>
            <p class="text-[10px] text-text-muted">{{ currentResource.detail }}</p>
          </div>
          <span class="ml-auto text-[9px] font-mono bg-brand/10 text-brand px-1.5 py-0.5 rounded shrink-0">
            {{ typeLabel(currentResource.resource) }}
          </span>
        </div>
      </Transition>

      <!-- 리소스 목록 -->
      <div
        class="flex-1 overflow-y-auto min-h-0 space-y-1.5"
        style="mask-image: linear-gradient(to bottom, black calc(100% - 16px), transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 16px), transparent 100%)"
      >
        <TransitionGroup name="plan-row">
          <div
            v-for="res in resources"
            :key="res.resource"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-colors"
            :class="{
              'border-status-ok bg-green-50/50':   res.status === 'complete',
              'border-brand/50 bg-brand/5':         res.status === 'in_progress',
              'border-status-critical bg-red-50/50':res.status === 'error',
              'border-border bg-bg-card':            res.status === 'pending',
            }"
          >
            <!-- 상태 아이콘 -->
            <div class="shrink-0 w-4 h-4 flex items-center justify-center">
              <svg v-if="res.status === 'complete'" class="w-4 h-4 text-status-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              <div v-else-if="res.status === 'in_progress'"
                class="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <svg v-else-if="res.status === 'error'" class="w-4 h-4 text-status-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              <div v-else class="w-3 h-3 rounded-full border-2 border-border" />
            </div>

            <!-- 리소스 이름 -->
            <div class="flex-1 min-w-0">
              <p class="font-mono text-[10px] text-text-primary truncate">{{ res.resource }}</p>
              <p v-if="res.status === 'complete' || res.status === 'error'"
                class="text-[9px] text-text-muted truncate mt-0.5">{{ res.detail }}</p>
            </div>

            <!-- 타입 배지 -->
            <span class="shrink-0 text-[9px] font-medium text-text-muted bg-bg-muted px-1.5 py-0.5 rounded">
              {{ typeLabel(res.resource) }}
            </span>
          </div>
        </TransitionGroup>

        <!-- 빈 상태 -->
        <div v-if="!resources.length" class="flex flex-col items-center justify-center py-8 gap-2">
          <div class="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p class="text-xs text-text-muted">Apply 시작 중...</p>
        </div>
      </div>

      <!-- 하단 버튼: apply 완료 시 검증 시작, 진행 중엔 중단 요청 -->
      <div class="shrink-0 pt-3 flex justify-end gap-2">
        <Transition name="fade">
          <button
            v-if="isApplyDone"
            @click="emit('verifyStart')"
            class="btn-brand flex items-center gap-1.5 text-xs"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            검증 시작
          </button>
          <button
            v-else
            @click="emit('stop')"
            class="px-4 py-2 border border-status-critical text-status-critical rounded-lg text-xs hover:bg-red-50 transition-colors"
          >
            중단 요청
          </button>
        </Transition>
      </div>

    </template>

    <!-- Apply 부분 실패 -->
    <template v-else>

      <!-- 실패 배너 -->
      <div class="shrink-0 mb-3 rounded-xl p-3 flex items-start gap-3 border border-red-200 bg-red-50">
        <div class="w-8 h-8 rounded-full bg-status-critical flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-semibold text-status-critical">부분 실패</p>
          <p class="text-[10px] text-text-secondary mt-0.5">
            성공 {{ counts.complete }}건 · 실패 {{ counts.error }}건 · 미시도 {{ counts.pending }}건
          </p>
        </div>
      </div>

      <!-- 실패 리소스만 표시 -->
      <div
        class="flex-1 overflow-y-auto min-h-0 space-y-1 mb-3"
        style="mask-image: linear-gradient(to bottom, black calc(100% - 16px), transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 16px), transparent 100%)"
      >
        <div
          v-for="res in resources"
          :key="res.resource"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs"
          :class="{
            'border-status-ok/40 text-text-muted': res.status === 'complete',
            'border-status-critical bg-red-50':    res.status === 'error',
            'border-border text-text-muted/60':    res.status === 'pending',
          }"
        >
          <svg v-if="res.status === 'complete'" class="w-3.5 h-3.5 text-status-ok shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          <svg v-else-if="res.status === 'error'" class="w-3.5 h-3.5 text-status-critical shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          <div v-else class="w-3 h-3 rounded-full border border-border shrink-0" />

          <div class="flex-1 min-w-0">
            <p class="font-mono text-[10px] truncate">{{ res.resource }}</p>
            <p v-if="res.status === 'error'" class="text-[9px] text-status-critical mt-0.5">{{ res.detail }}</p>
          </div>
          <span class="shrink-0 text-[9px] font-medium text-text-muted bg-bg-muted px-1.5 py-0.5 rounded">
            {{ typeLabel(res.resource) }}
          </span>
        </div>
      </div>

      <!-- 복구 옵션 -->
      <div class="shrink-0 rounded-xl border border-border p-3 space-y-2">
        <p class="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">복구 옵션</p>
        <div class="space-y-1.5">
          <button @click="emit('retryApply')"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:border-brand hover:bg-brand/5 transition-colors text-left">
            <svg class="w-4 h-4 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <div>
              <p class="text-xs font-semibold text-text-primary">재시도</p>
              <p class="text-[10px] text-text-muted">실패 리소스부터 재실행</p>
            </div>
          </button>
          <button @click="emit('keepPartial')"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:border-status-pending hover:bg-yellow-50 transition-colors text-left">
            <svg class="w-4 h-4 text-status-pending shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <p class="text-xs font-semibold text-text-primary">부분 적용 유지</p>
              <p class="text-[10px] text-text-muted">성공한 리소스 보존 후 검증</p>
            </div>
          </button>
          <button @click="emit('rollback')"
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:border-status-critical hover:bg-red-50 transition-colors text-left">
            <svg class="w-4 h-4 text-status-critical shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            <div>
              <p class="text-xs font-semibold text-text-primary">전체 롤백</p>
              <p class="text-[10px] text-text-muted">terraform destroy 전체 제거</p>
            </div>
          </button>
        </div>
      </div>

    </template>
  </div>
</template>
