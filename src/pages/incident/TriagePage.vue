<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTriageAssessmentQuery, useAlarmFeedQuery } from '@/features/incident';
import { useTriageFlow } from '@/features/incident/api/useTriageNodeProgress';
import {
  DEMO_BILLING_ASSESSMENT,
  DEMO_SUBSCRIPTION_ASSESSMENT,
  DEMO_SURGE_ASSESSMENT,
  DEMO_FEED_GROUPS,
  BILLING_METRIC_SERIES,
  BILLING_LOG_SAMPLES,
  BILLING_INFRA_TIMELINE,
  SUBSCRIPTION_METRIC_SERIES,
  SUBSCRIPTION_LOG_SAMPLES,
  SUBSCRIPTION_INFRA_TIMELINE,
  SURGE_METRIC_SERIES,
  SURGE_LOG_SAMPLES,
  SURGE_INFRA_TIMELINE,
  selectTriageBlueprint,
} from '@/features/incident/fixtures';

import IncidentSectionAStream from '@/features/incident/components/IncidentSectionAStream.vue';
import TriageNodeProgress from '@/features/incident/components/TriageNodeProgress.vue';
import MetricTimeseriesCard from '@/features/incident/components/MetricTimeseriesCard.vue';
import LogSamplesCard from '@/features/incident/components/LogSamplesCard.vue';
import InfraStatusCard from '@/features/incident/components/InfraStatusCard.vue';

const route  = useRoute();
const router = useRouter();
const incidentId = (route.params.incidentId as string) ?? '';

// API 시도 → 없으면 incidentId 접두어 기반 데모 시나리오 분기
const { data: apiAssessment } = useTriageAssessmentQuery(incidentId);

// incidentId 접두어로 시나리오 분기
const scenarioKey = computed<'surge' | 'subscription' | 'billing'>(() => {
  if (incidentId.startsWith('inc-demo-surge'))        return 'surge';
  if (incidentId.startsWith('inc-demo-subscription')) return 'subscription';
  return 'billing';
});

// 시나리오 번들 — assessment / 메트릭 / 로그 / 인프라 / 블루프린트
const bundle = computed(() => {
  if (scenarioKey.value === 'surge') {
    return {
      assessment: DEMO_SURGE_ASSESSMENT,
      metrics: SURGE_METRIC_SERIES,
      logs: SURGE_LOG_SAMPLES,
      timeline: SURGE_INFRA_TIMELINE,
      blueprint: selectTriageBlueprint('inc-demo-surge-001'),
    };
  }
  if (scenarioKey.value === 'subscription') {
    return {
      assessment: DEMO_SUBSCRIPTION_ASSESSMENT,
      metrics: SUBSCRIPTION_METRIC_SERIES,
      logs: SUBSCRIPTION_LOG_SAMPLES,
      timeline: SUBSCRIPTION_INFRA_TIMELINE,
      blueprint: selectTriageBlueprint('inc-demo-subscription-001'),
    };
  }
  return {
    assessment: DEMO_BILLING_ASSESSMENT,
    metrics: BILLING_METRIC_SERIES,
    logs: BILLING_LOG_SAMPLES,
    timeline: BILLING_INFRA_TIMELINE,
    blueprint: selectTriageBlueprint('inc-demo-billing-001'),
  };
});

const assessment = computed(() => apiAssessment.value ?? bundle.value.assessment);

// 그룹 메타 — 헤더 서비스명용
const group = computed(() =>
  DEMO_FEED_GROUPS.find(g => g.correlationGroupId === incidentId)
    ?? DEMO_FEED_GROUPS.find(g => g.correlationGroupId === bundle.value.assessment.correlation_group_id)
    ?? DEMO_FEED_GROUPS[0]
);
const serviceName = computed(() => group.value.serviceName);

// 실시간 알람피드에서 매칭 그룹 ts 가져오기 (webhook 도착 시각)
const { data: liveAlarms } = useAlarmFeedQuery();
const liveTriggerTs = computed<string | undefined>(() => {
  const live = liveAlarms.value?.find(a => a.correlationGroupId === incidentId);
  return live?.ts;
});

// Triage 흐름 — Step 1 그룹화 → Step 2 정적 → Step 3 → Step 4 분기 (+ Step 5)
const flow = useTriageFlow();

onMounted(() => {
  void flow.run(bundle.value.blueprint, assessment.value.triage_priority);
});

// 시나리오 변경 시 재시작
watch(
  () => bundle.value.blueprint.scenarioId,
  () => {
    void flow.run(bundle.value.blueprint, assessment.value.triage_priority);
  },
);

// 누적 표시 시간 라벨
const formatMs = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}초`;
  return `${min}분 ${sec}초`;
};
const totalElapsedLabel = computed(() => formatMs(flow.elapsedDisplayMs.value));

// Section A 활성 여부
const sectionAActive = computed(() => flow.phase.value === 'grouping');

// deep_analysis 경로인지 (Section C 로그/인프라 노출 조건)
const isDeepAnalysis = computed(() => bundle.value.blueprint.step4Type === 'deep_analysis');

// Critical/High → Slack 전파 뱃지
const slackPropagated = computed(() =>
  ['Critical', 'High'].includes(assessment.value.triage_priority)
);

// priority 배지 색상
const priorityColor = (p: string) => ({
  Critical: { bg: 'bg-status-critical/10', text: 'text-status-critical', border: 'border-status-critical/40', dot: 'bg-status-critical' },
  High:     { bg: 'bg-orange-50',          text: 'text-orange-600',      border: 'border-orange-300',          dot: 'bg-orange-500' },
  Medium:   { bg: 'bg-status-warning/10',  text: 'text-status-warning',  border: 'border-status-warning/40',   dot: 'bg-status-warning' },
  Low:      { bg: 'bg-emerald-50',         text: 'text-emerald-700',     border: 'border-emerald-200',         dot: 'bg-emerald-500' },
}[p] ?? { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-border', dot: 'bg-gray-400' });

const goToRca = () =>
  router.push({ name: 'incident-rca', params: { incidentId: assessment.value.incident_id } });

const goToRecovery = () =>
  router.push({ name: 'incident-recovery', params: { incidentId: assessment.value.incident_id } });
</script>

<template>
  <div class="py-8 px-8 max-w-7xl mx-auto">
    <!-- ═══════════════════════════════════════════════════════
         HEADER
    ═══════════════════════════════════════════════════════ -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <div class="text-xs font-bold text-brand uppercase tracking-widest mb-1">장애 대응 · Page 2</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">{{ serviceName }}</h1>
        <div class="flex items-center gap-3 mt-2 flex-wrap">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-bold border"
            :class="[priorityColor(assessment.triage_priority).bg, priorityColor(assessment.triage_priority).text, priorityColor(assessment.triage_priority).border]"
          >
            <span class="w-2 h-2 rounded-full" :class="priorityColor(assessment.triage_priority).dot" />
            {{ assessment.triage_priority }}
          </span>
          <span class="text-sm text-gray-400">·</span>
          <span class="text-sm text-gray-500">
            누적 진행 시간
            <span class="font-bold text-text-primary font-mono">{{ totalElapsedLabel }}</span>
          </span>
        </div>
        <!-- 알람 수 — 수신 숫자 1줄만 -->
        <div class="mt-3 inline-flex items-baseline gap-2 px-4 py-2 rounded-lg border border-border bg-bg-card">
          <span class="text-2xl font-bold text-text-primary tabular-nums">{{ bundle.blueprint.step1.totalReceived }}</span>
          <span class="text-xs text-text-secondary">알람 수신</span>
        </div>
      </div>
      <button class="px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors" @click="router.back()">← 알람 피드</button>
    </div>

    <!-- ═══════════════════════════════════════════════════════
         Section A · Step 1 알람 그룹화 (트리거 + 추가 알람 ticker)
    ═══════════════════════════════════════════════════════ -->
    <section class="mb-6">
      <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">Section A · Step 1 · 알람 수신 & 그룹화</div>
      <IncidentSectionAStream
        :trigger="bundle.blueprint.step1.trigger"
        :override-trigger-ts="liveTriggerTs"
        :severity-strategy="bundle.blueprint.step1.severityStrategy"
        :window-duration-label="bundle.blueprint.step1.windowDurationLabel"
        :arriving-alarms="flow.grouping.visibleArriving"
        :representative-severity="bundle.blueprint.step1.representativeSeverity"
        :group-confirmed="flow.grouping.groupConfirmed"
        :elapsed-display-ms="flow.elapsedDisplayMs.value"
        :step1-display-ms="bundle.blueprint.step1DisplayMs"
        :is-active="sectionAActive"
        :service-map="bundle.blueprint.step1.serviceMap"
        :representative-alert-names="bundle.blueprint.step1.representativeAlertNames"
        :total-received="bundle.blueprint.step1.totalReceived"
        :grouped-count="bundle.blueprint.step1.groupedCount"
        :overflow-count="bundle.blueprint.step1.overflowCount"
        :cap-applied="bundle.blueprint.step1.capApplied"
      />
    </section>

    <!-- ═══════════════════════════════════════════════════════
         Section B · Step 2~5 워크플로우
    ═══════════════════════════════════════════════════════ -->
    <section class="mb-6">
      <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">Section B · Triage Agent 워크플로우</div>
      <TriageNodeProgress
        :blueprint="bundle.blueprint"
        :severity="assessment.triage_priority"
        :phase="flow.phase.value"
        :step2="flow.step2"
        :step3="flow.step3"
        :step4-simple="flow.step4Simple"
        :step4-b-notify="flow.step4BNotify"
        :step4-b-collection="flow.step4BCollection"
        :step5="flow.step5"
        :slack-propagated="slackPropagated"
      />
    </section>

    <!-- ═══════════════════════════════════════════════════════
         Section C · 판단 근거 raw 데이터
         (Low = 메트릭만, Critical = 메트릭 + 로그 + 인프라)
    ═══════════════════════════════════════════════════════ -->
    <section class="mb-6">
      <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">Section C · 판단 근거 raw 데이터</div>

      <!-- 메트릭 시계열 3개 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <MetricTimeseriesCard v-for="m in bundle.metrics" :key="m.name" :metric="m" />
      </div>

      <!-- 로그 + 인프라 (deep_analysis 경로만) -->
      <div v-if="isDeepAnalysis" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LogSamplesCard :logs="bundle.logs" />
        <InfraStatusCard :timeline="bundle.timeline" />
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════
         FOOTER
    ═══════════════════════════════════════════════════════ -->
    <div class="bg-bg-card border-2 rounded-xl p-5 flex items-center justify-between" :class="[priorityColor(assessment.triage_priority).border]">
      <div>
        <div class="text-sm font-bold text-text-primary mb-1">
          {{ assessment.handoff?.to_rca ? '✓ RCA가 자동 진입했습니다' : '⏸ 운영자 검토 대기 중' }}
        </div>
        <div class="text-xs text-gray-500">
          {{ assessment.handoff?.to_rca
            ? `Triage 가설(${assessment.vector_db_hints?.top_cause_hypothesis})을 RCA가 먼저 검증합니다.`
            : 'Low 우선순위로 RCA 자동 진입하지 않았습니다. 필요 시 수동으로 진입하세요.' }}
        </div>
      </div>
      <div class="flex gap-2 shrink-0">
        <button
          class="px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
          @click="goToRecovery"
        >복구 추천 →</button>
        <button
          class="px-5 py-2 bg-brand text-white rounded-lg text-sm font-bold hover:bg-brand/90 transition-colors"
          @click="goToRca"
        >RCA 상세 →</button>
      </div>
    </div>
  </div>
</template>
