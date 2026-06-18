<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  DEMO_BILLING_ASSESSMENT,
  DEMO_SUBSCRIPTION_ASSESSMENT,
} from '@/features/incident/fixtures';
import { assessmentToIncident } from '@/features/incident/utils/incidentAdapter';
import RcaPanel from '@/features/service-detail/components/RcaPanel.vue';

const router = useRouter();

const billingIncident      = computed(() => assessmentToIncident(DEMO_BILLING_ASSESSMENT, 'Billing Settlement Batch'));
const subscriptionIncident = computed(() => assessmentToIncident(DEMO_SUBSCRIPTION_ASSESSMENT, 'Subscription API'));

// 위반까지 남은 시간 포맷
const formatViolation = (m: number | null | undefined) => {
  if (m == null) return '—';
  if (m < 1)    return `약 ${Math.round(m * 60)}초`;
  if (m < 60)   return `약 ${Math.round(m)}분`;
  if (m < 1440) return `약 ${Math.round(m / 60)}시간`;
  return `약 ${Math.round(m / 1440)}일`;
};

const billingViolation      = computed(() => formatViolation(DEMO_BILLING_ASSESSMENT.sla_impact.earliest_violation_minutes));
const subscriptionViolation = computed(() => formatViolation(DEMO_SUBSCRIPTION_ASSESSMENT.sla_impact.earliest_violation_minutes));
</script>

<template>
  <div class="py-8 px-8 max-w-7xl mx-auto">
    <!-- 헤더 -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <div class="text-xs font-bold text-brand uppercase tracking-widest mb-1">장애 대응 · 데모 시연 화면</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">SLA 기반 우선순위 비교 데모</h1>
        <p class="text-gray-500 mt-1 text-sm">
          같은 시각에 들어온 두 알람, 완전히 다른 판단 — 데모 스토리보드 슬라이드 7-C
        </p>
      </div>
      <button class="px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors" @click="router.push({ name: 'incident-feed' })">← 알람 피드</button>
    </div>

    <!-- 데모 안내 배너 -->
    <div class="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
      <span class="text-amber-600 shrink-0 mt-0.5">⚠</span>
      <div class="text-sm text-amber-800">
        <strong>데모 전용 화면</strong> — 운영자 일상 워크플로우에서는 한 번에 한 incident만 깊이 봅니다.
        이 페이지는 두 서비스의 Triage 결과를 나란히 놓고 "같은 시각, 다른 판단"을 시연하기 위한 화면입니다.
      </div>
    </div>

    <!-- 두 incident 헤드라인 비교 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Billing CRITICAL -->
      <div class="rounded-xl border-2 border-status-critical/40 overflow-hidden shadow-sm">
        <div class="bg-status-critical/10 px-5 py-3 flex items-center justify-between">
          <div class="text-base font-bold text-status-critical">Billing Settlement Batch</div>
          <span class="px-2 py-0.5 rounded-full bg-status-critical text-white text-xs font-bold">CRITICAL</span>
        </div>
        <div class="bg-bg-card p-5 space-y-2">
          <div class="text-sm">
            <span class="font-bold text-gray-500">예상 위반:</span>
            <span class="ml-2 font-bold text-status-critical text-lg">{{ billingViolation }}</span>
          </div>
          <div class="text-sm"><span class="font-bold text-gray-500">Budget:</span> 23% (fast burn 14.4×)</div>
          <div class="text-sm"><span class="font-bold text-gray-500">최대 편차:</span> error_rate 60×</div>
          <div class="text-sm"><span class="font-bold text-gray-500">가설:</span> db_connection_saturation (0.87, 과거 3건)</div>
          <div class="text-sm text-status-critical font-bold pt-2 border-t border-border mt-2">→ RCA 자동 진입</div>
        </div>
      </div>
      <!-- Subscription MEDIUM -->
      <div class="rounded-xl border-2 border-status-warning/40 overflow-hidden shadow-sm">
        <div class="bg-status-warning/10 px-5 py-3 flex items-center justify-between">
          <div class="text-base font-bold text-status-warning">Subscription API</div>
          <span class="px-2 py-0.5 rounded-full bg-status-warning text-white text-xs font-bold">MEDIUM</span>
        </div>
        <div class="bg-bg-card p-5 space-y-2">
          <div class="text-sm">
            <span class="font-bold text-gray-500">예상 위반:</span>
            <span class="ml-2 font-bold text-status-warning text-lg">{{ subscriptionViolation }}</span>
          </div>
          <div class="text-sm"><span class="font-bold text-gray-500">Budget:</span> 71% (normal burn)</div>
          <div class="text-sm"><span class="font-bold text-gray-500">최대 편차:</span> error_rate 1.8×</div>
          <div class="text-sm"><span class="font-bold text-gray-500">가설:</span> traffic_spike (0.72, 자동 회복 사례)</div>
          <div class="text-sm text-status-warning font-bold pt-2 border-t border-border mt-2">→ 운영자 검토 대기</div>
        </div>
      </div>
    </div>

    <!-- 전체 보고서 비교 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">Billing — Critical 보고서</div>
        <RcaPanel :incident="billingIncident" />
      </div>
      <div>
        <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">Subscription — Medium 보고서</div>
        <RcaPanel :incident="subscriptionIncident" />
      </div>
    </div>

    <!-- 핵심 메시지 -->
    <div class="mt-8 bg-brand/5 border-2 border-brand/20 rounded-xl p-6">
      <div class="text-xs font-bold text-brand uppercase tracking-widest mb-2">SLA 기반 우선순위의 실체</div>
      <p class="text-base text-text-primary leading-relaxed">
        두 알람이 같은 시각에 들어왔지만, ZeuX는 단순 severity가 아닌
        <strong>Error Budget 잔량 · burn rate · 과거 패턴 유사도</strong>를 종합해 판단합니다.
        Billing은 SLA 위반까지 <strong>{{ billingViolation }}</strong>밖에 남지 않아 RCA로 자동 넘어갔고,
        Subscription은 <strong>{{ subscriptionViolation }}</strong>의 여유가 있어 운영자 검토 대기로 분류됐습니다.
        이 차이가 운영자가 "지금 당장 봐야 할 1건"을 즉시 식별하게 해줍니다.
      </p>
    </div>
  </div>
</template>
