<script setup lang="ts">
import { computed } from 'vue';
import type { TriageStageBlueprint } from '../fixtures/triage-blueprints';
import type {
  FlowPhase,
  Severity,
  StepState,
  Step2Parallel,
  Step4BParallel,
} from '../api/useTriageNodeProgress';

const props = defineProps<{
  blueprint: TriageStageBlueprint;
  severity: Severity;
  phase: FlowPhase;
  step2: Step2Parallel;
  step3: StepState;
  step4Simple: StepState;
  step4BNotify: StepState;
  step4BCollection: Step4BParallel;
  step5: StepState;
  slackPropagated?: boolean;
}>();

// 위험도별 색상 톤
const tone = computed(() => {
  if (props.severity === 'Critical' || props.severity === 'High') {
    return {
      border: 'border-status-critical/50',
      bg: 'bg-status-critical/5',
      text: 'text-status-critical',
      header: 'bg-status-critical text-white',
      badge: 'bg-status-critical/10 text-status-critical',
    };
  }
  if (props.severity === 'Medium') {
    return {
      border: 'border-status-warning/50',
      bg: 'bg-status-warning/5',
      text: 'text-status-warning',
      header: 'bg-status-warning text-white',
      badge: 'bg-status-warning/10 text-status-warning',
    };
  }
  return {
    border: 'border-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    header: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-800',
  };
});

// 단계 시작/완료 여부
const stepStarted = (s: StepState) => s.currentIdx >= 0 || s.done;

// Step 그룹 통합 상태 — 병렬 3 노드 중 하나라도 시작
const step2Started = computed(() =>
  stepStarted(props.step2.alarmHistory) || stepStarted(props.step2.slaStatus) || stepStarted(props.step2.metricSnapshot)
);
const step2Done = computed(() =>
  props.step2.alarmHistory.done && props.step2.slaStatus.done && props.step2.metricSnapshot.done
);
const step4Started = computed(() =>
  stepStarted(props.step4Simple) || stepStarted(props.step4BNotify) ||
  stepStarted(props.step4BCollection.logCollection) || stepStarted(props.step4BCollection.traceCollection) || stepStarted(props.step4BCollection.vectorSearch)
);
const step4Done = computed(() => {
  if (props.blueprint.step4Type === 'simple_report') return props.step4Simple.done;
  return props.step4BNotify.done &&
    props.step4BCollection.logCollection.done &&
    props.step4BCollection.traceCollection.done &&
    props.step4BCollection.vectorSearch.done;
});

// Step 번호 배지 색상 (pending/running/done)
type StepStatus = 'pending' | 'running' | 'done';
const stepStatus = (started: boolean, done: boolean): StepStatus => {
  if (done) return 'done';
  if (started) return 'running';
  return 'pending';
};
const stepBadgeClass = (st: StepStatus): string => {
  if (st === 'done')    return 'bg-emerald-500 text-white shadow-md';
  if (st === 'running') return 'bg-brand text-white shadow-md animate-pulse';
  return 'bg-gray-200 text-gray-500';
};
const stepLabel = (st: StepStatus): string => {
  if (st === 'done')    return '완료';
  if (st === 'running') return '진행 중';
  return '대기';
};
const stepLabelClass = (st: StepStatus): string => {
  if (st === 'done')    return 'text-emerald-700';
  if (st === 'running') return 'text-brand';
  return 'text-gray-400';
};

// 카드 외곽 (pending/running/done)
const cardClass = (s: StepState): string => {
  if (s.done)               return 'border-2 border-emerald-400 bg-emerald-50/30';
  if (stepStarted(s))       return 'border-2 border-brand bg-brand/5 ring-2 ring-brand/15';
  return 'border-2 border-gray-200 bg-bg-card';
};

// 현재 sub-step 메시지
const currentSubStep = (s: StepState): string => {
  if (s.done) return s.steps[s.steps.length - 1] ?? '';
  if (s.currentIdx < 0) return '대기 중…';
  return s.steps[s.currentIdx] ?? '';
};

const subStateBadge = (s: StepState): { label: string; cls: string } => {
  if (s.done) return { label: '✓ 완료', cls: 'text-emerald-700 bg-emerald-100' };
  if (stepStarted(s)) return { label: '● 진행 중', cls: 'text-brand bg-brand/10' };
  return { label: '대기', cls: 'text-gray-500 bg-gray-100' };
};

// pattern_label 한글 배지
const patternBadge = computed(() => {
  const lbl = props.blueprint.step2.alarmHistory.patternLabel;
  if (lbl === 'recurring_auto_resolve') return { class: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: '반복 · 자동회복' };
  if (lbl === 'recurring_escalated')    return { class: 'bg-rose-100 text-rose-800 border-rose-300', label: '반복 · Incident 전환' };
  return { class: 'bg-amber-100 text-amber-800 border-amber-300', label: '첫 발생' };
});

// burn rate 뱃지
const burnBadge = (state: string): string => {
  if (state === 'fast' || state === 'critical_breach') return 'bg-rose-100 text-rose-800 border border-rose-300';
  if (state === 'normal') return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
  return 'bg-gray-100 text-gray-700 border border-gray-300';
};

// 권장 조치 분리
const immediateActions = computed(() => props.blueprint.step5?.recommendedActions.filter(a => a.type === 'immediate') ?? []);
const iacActions = computed(() => props.blueprint.step5?.recommendedActions.filter(a => a.type === 'iac_change') ?? []);

// 위험도 뱃지
const riskBadge = (risk: 'Low' | 'Medium' | 'High'): string => {
  if (risk === 'High')   return 'bg-rose-100 text-rose-800 border border-rose-300';
  if (risk === 'Medium') return 'bg-amber-100 text-amber-800 border border-amber-300';
  return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
};

// Step 3 체크 표시
const checkIcon = (triggers: boolean) => triggers ? '⚠' : '✓';
const checkColor = (triggers: boolean) => triggers ? 'text-rose-700' : 'text-emerald-700';

// route 박스 색상
const routeTone = computed(() => {
  if (props.blueprint.step4Type === 'deep_analysis') {
    return { border: 'border-rose-400', bg: 'bg-rose-50', text: 'text-rose-800', header: '심층 분석 경로', headerBg: 'bg-rose-600 text-white' };
  }
  return { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-800', header: '정상 경로', headerBg: 'bg-emerald-600 text-white' };
});

// SLA 항목 — itemId 노출 안 함, category만 표시
const slaItems = computed(() => props.blueprint.step2.slaStatus.items);

// phase 라벨
const phaseLabel = computed(() => {
  switch (props.phase) {
    case 'static-analysis': return 'Step 2 · 정적 분석 진행 중';
    case 'risk-judgment':   return 'Step 3 · 위험도 판단 중';
    case 'simple-report':   return 'Step 4-A · 간단 보고서 작성 중';
    case 'notify-operator': return 'Step 4-B · 운영자 알림 전파 중';
    case 'deep-collection': return 'Step 4-B · 심층 수집 중';
    case 'analysis-report': return 'Step 5 · 원인 분석 보고서 작성 중';
    case 'done':            return '완료';
    case 'grouping':        return 'Step 1 진행 중 (Section A)';
    default: return '대기';
  }
});
</script>

<template>
  <div class="rounded-xl border border-border bg-bg-elev p-5 shadow-sm space-y-6">
    <!-- 헤더 -->
    <div class="flex items-center justify-between pb-3 border-b-2 border-border">
      <div class="flex items-center gap-2">
        <span
          class="w-3 h-3 rounded-full"
          :class="phase === 'done' ? 'bg-emerald-500' : phase === 'idle' || phase === 'grouping' ? 'bg-gray-300' : 'bg-brand animate-pulse'"
        />
        <span class="text-base font-bold text-text-primary">Triage Agent 워크플로우</span>
        <span class="text-sm text-gray-600 ml-1">· {{ phaseLabel }}</span>
      </div>
    </div>

    <!-- ───────────────────────────────────────────────────────────
         Step 2 — 정적 분석 (병렬 3)
    ─────────────────────────────────────────────────────────── -->
    <section>
      <!-- Step 헤더 -->
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all" :class="stepBadgeClass(stepStatus(step2Started, step2Done))">
          2
        </div>
        <div class="flex-1">
          <div class="text-xs font-bold uppercase tracking-wider text-gray-500">STEP 2 — STATIC ANALYSIS</div>
          <div class="text-lg font-bold text-text-primary">정적 분석 (병렬 3)</div>
        </div>
        <span class="text-sm font-bold" :class="stepLabelClass(stepStatus(step2Started, step2Done))">{{ stepLabel(stepStatus(step2Started, step2Done)) }}</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <!-- 2-A 이상 이력 -->
        <div class="rounded-lg p-4 transition-all min-h-[200px]" :class="cardClass(step2.alarmHistory)">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-bold text-text-primary">2-A · 이상 이력 (RDB)</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded" :class="subStateBadge(step2.alarmHistory).cls">{{ subStateBadge(step2.alarmHistory).label }}</span>
          </div>
          <div v-if="stepStarted(step2.alarmHistory) && !step2.alarmHistory.done" class="flex items-center gap-2 text-sm text-text-secondary">
            <span class="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
            {{ currentSubStep(step2.alarmHistory) }}
          </div>
          <div v-else-if="step2.alarmHistory.done" class="space-y-2 text-sm">
            <span class="inline-block px-2 py-1 text-xs font-bold rounded border" :class="patternBadge.class">{{ patternBadge.label }}</span>
            <div class="space-y-1 text-xs text-text-secondary">
              <div><span class="text-gray-500">30일 발생:</span> <span class="font-bold text-text-primary">{{ blueprint.step2.alarmHistory.occurrenceCount }}회</span></div>
              <div><span class="text-gray-500">자동 회복률:</span> <span class="font-bold text-text-primary">{{ (blueprint.step2.alarmHistory.autoResolveRatio * 100).toFixed(0) }}%</span></div>
              <div><span class="text-gray-500">평균 지속:</span> <span class="font-bold text-text-primary">{{ blueprint.step2.alarmHistory.avgDurationSec }}초</span></div>
              <div><span class="text-gray-500">최근:</span> <span class="font-mono text-text-primary">{{ blueprint.step2.alarmHistory.lastOccurrence }}</span></div>
            </div>
            <div class="text-xs text-gray-600 italic">{{ blueprint.step2.alarmHistory.patternBasis }}</div>
          </div>
          <div v-else class="text-sm text-gray-400 italic">대기 중…</div>
        </div>

        <!-- 2-B SLA 상태 -->
        <div class="rounded-lg p-4 transition-all min-h-[200px]" :class="cardClass(step2.slaStatus)">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-bold text-text-primary">2-B · SLA 현재 상태 (RDB)</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded" :class="subStateBadge(step2.slaStatus).cls">{{ subStateBadge(step2.slaStatus).label }}</span>
          </div>
          <div v-if="stepStarted(step2.slaStatus) && !step2.slaStatus.done" class="flex items-center gap-2 text-sm text-text-secondary">
            <span class="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
            {{ currentSubStep(step2.slaStatus) }}
          </div>
          <div v-else-if="step2.slaStatus.done" class="space-y-2">
            <div v-for="(item, i) in slaItems" :key="i" class="border border-border rounded p-2 bg-white">
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-text-primary font-bold">{{ item.category }}</span>
                <span class="font-bold text-xs" :class="item.budgetRemainingPct < 30 ? 'text-rose-700' : 'text-emerald-700'">{{ item.budgetRemainingPct.toFixed(1) }}%</span>
              </div>
              <div class="text-xs text-gray-600 mb-1">목표: {{ item.targetLabel }}</div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold px-2 py-0.5 rounded" :class="burnBadge(item.burnRateState)">{{ item.burnRateState }}{{ item.burnRateValue != null ? ` ${item.burnRateValue.toFixed(1)}×` : '' }}</span>
                <span class="text-xs text-gray-700">{{ item.violationEta }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-gray-400 italic">대기 중…</div>
        </div>

        <!-- 2-C 메트릭 스냅샷 -->
        <div class="rounded-lg p-4 transition-all min-h-[200px]" :class="cardClass(step2.metricSnapshot)">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-bold text-text-primary">2-C · 메트릭 스냅샷 (Prometheus)</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded" :class="subStateBadge(step2.metricSnapshot).cls">{{ subStateBadge(step2.metricSnapshot).label }}</span>
          </div>
          <div v-if="stepStarted(step2.metricSnapshot) && !step2.metricSnapshot.done" class="flex items-center gap-2 text-sm text-text-secondary">
            <span class="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
            {{ currentSubStep(step2.metricSnapshot) }}
          </div>
          <div v-else-if="step2.metricSnapshot.done" class="space-y-2">
            <div class="text-xs text-gray-600">최대 편차: <span class="text-rose-700 font-bold">{{ blueprint.step2.metricSnapshot.maxDeviationRatio.toFixed(1) }}×</span></div>
            <div class="space-y-1.5">
              <div v-for="m in blueprint.step2.metricSnapshot.metrics" :key="m.name" class="flex items-center justify-between text-xs border-b border-border pb-1.5 last:border-0">
                <span class="font-mono text-text-primary truncate flex-1">{{ m.name }}</span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-gray-500">{{ m.baseline }}</span>
                  <span class="text-gray-300">→</span>
                  <span class="font-bold text-text-primary">{{ m.current }}{{ m.unit ?? '' }}</span>
                  <span class="text-xs font-bold px-1.5 py-0.5 rounded" :class="m.deviationRatio >= 5 ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700'">{{ m.deviationRatio.toFixed(1) }}×</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-gray-400 italic">대기 중…</div>
        </div>
      </div>
    </section>

    <!-- ───────────────────────────────────────────────────────────
         Step 3 — 위험도 판단
    ─────────────────────────────────────────────────────────── -->
    <section>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all" :class="stepBadgeClass(stepStatus(stepStarted(step3), step3.done))">
          3
        </div>
        <div class="flex-1">
          <div class="text-xs font-bold uppercase tracking-wider text-gray-500">STEP 3 — RISK JUDGMENT</div>
          <div class="text-lg font-bold text-text-primary">위험도 판단</div>
        </div>
        <span class="text-sm font-bold" :class="stepLabelClass(stepStatus(stepStarted(step3), step3.done))">{{ stepLabel(stepStatus(stepStarted(step3), step3.done)) }}</span>
      </div>

      <div class="rounded-lg p-4 transition-all" :class="cardClass(step3)">
        <div v-if="stepStarted(step3) && !step3.done" class="flex items-center gap-2 text-sm text-text-secondary mb-2">
          <span class="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
          {{ currentSubStep(step3) }}
        </div>

        <div v-if="step3.done" class="space-y-3">
          <!-- 3 체크 -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div v-for="check in [blueprint.step3.burnRateCheck, blueprint.step3.patternCheck, blueprint.step3.deviationCheck]" :key="check.label" class="border-2 border-border rounded-md p-3 bg-white">
              <div class="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">{{ check.label }}</div>
              <div class="text-sm text-text-primary mb-2">{{ check.value }}</div>
              <div class="flex items-center gap-1.5 text-sm font-bold" :class="checkColor(check.triggersDeep)">
                <span class="text-lg">{{ checkIcon(check.triggersDeep) }}</span>
                <span>{{ check.judgment }}</span>
              </div>
            </div>
          </div>

          <!-- route 박스 -->
          <div class="border-2 rounded-lg overflow-hidden" :class="routeTone.border">
            <div class="px-3 py-2 flex items-center justify-between" :class="routeTone.headerBg">
              <span class="text-sm font-bold">→ route: {{ blueprint.step3.route }} ({{ routeTone.header }})</span>
              <span class="text-xs uppercase font-bold px-2 py-0.5 rounded bg-white/20">risk: {{ blueprint.step3.riskLevel }}</span>
            </div>
            <ul class="px-3 py-2 space-y-1 bg-bg-card">
              <li v-for="(r, i) in blueprint.step3.reasons" :key="i" class="text-sm text-text-primary flex items-start gap-1.5">
                <span class="text-gray-400 mt-0.5">•</span>
                <span>{{ r }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div v-if="!stepStarted(step3)" class="text-sm text-gray-400 italic">대기 중…</div>
      </div>
    </section>

    <!-- ───────────────────────────────────────────────────────────
         Step 4 — 분기
    ─────────────────────────────────────────────────────────── -->
    <section>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all" :class="stepBadgeClass(stepStatus(step4Started, step4Done))">
          4
        </div>
        <div class="flex-1">
          <div class="text-xs font-bold uppercase tracking-wider text-gray-500">STEP 4 — BRANCH</div>
          <div class="text-lg font-bold text-text-primary">
            {{ blueprint.step4Type === 'simple_report' ? '4-A · 간단 보고서 (정상 경로)' : '4-B · 심층 분석 (이상 경로)' }}
          </div>
        </div>
        <span class="text-sm font-bold" :class="stepLabelClass(stepStatus(step4Started, step4Done))">{{ stepLabel(stepStatus(step4Started, step4Done)) }}</span>
      </div>

      <!-- 4-A simple_report -->
      <div v-if="blueprint.step4Type === 'simple_report' && blueprint.simpleReport" class="rounded-lg p-4 transition-all" :class="cardClass(step4Simple)">
        <div v-if="stepStarted(step4Simple) && !step4Simple.done" class="flex items-center gap-2 text-sm text-text-secondary">
          <span class="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
          {{ currentSubStep(step4Simple) }}
        </div>

        <div v-if="step4Simple.done" class="space-y-4">
          <!-- Vector DB 적재 -->
          <div>
            <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vector DB 적재 (정상 패턴)</div>
            <pre class="text-xs bg-bg-card border border-border rounded p-3 overflow-x-auto font-mono whitespace-pre-wrap text-text-secondary">{{ blueprint.simpleReport.vectorDbStored.embeddingTemplate }}</pre>
            <div class="flex items-center gap-2 mt-2 text-xs flex-wrap">
              <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">outcome: {{ blueprint.simpleReport.vectorDbStored.outcomeLabel }}</span>
              <span class="text-gray-600 font-mono">pattern: {{ blueprint.simpleReport.vectorDbStored.patternLabel }}</span>
            </div>
          </div>

          <!-- 간단 보고서 -->
          <div class="border-2 rounded-lg overflow-hidden" :class="tone.border">
            <div class="px-4 py-2" :class="tone.header">
              <span class="text-sm font-bold uppercase tracking-wider">간단 보고서</span>
            </div>
            <div class="px-4 py-3 bg-bg-card space-y-3">
              <div>
                <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">요약</div>
                <div class="text-sm text-text-primary">{{ blueprint.simpleReport.summary }}</div>
              </div>
              <div>
                <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">근거</div>
                <div class="space-y-1 text-sm">
                  <div class="flex items-start gap-2"><span class="text-gray-400 mt-0.5">•</span><span><span class="font-bold text-text-primary">pattern:</span> {{ blueprint.simpleReport.evidence.pattern }}</span></div>
                  <div class="flex items-start gap-2"><span class="text-gray-400 mt-0.5">•</span><span><span class="font-bold text-text-primary">burn rate:</span> {{ blueprint.simpleReport.evidence.burnRate }}</span></div>
                  <div class="flex items-start gap-2"><span class="text-gray-400 mt-0.5">•</span><span><span class="font-bold text-text-primary">max deviation:</span> {{ blueprint.simpleReport.evidence.maxDeviation }}</span></div>
                </div>
              </div>
              <div>
                <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">권장 조치</div>
                <div class="text-sm text-text-primary">{{ blueprint.simpleReport.action }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!stepStarted(step4Simple)" class="text-sm text-gray-400 italic">대기 중…</div>
      </div>

      <!-- 4-B deep_analysis -->
      <div v-else-if="blueprint.step4Type === 'deep_analysis' && blueprint.deepAnalysis" class="space-y-3">
        <!-- 운영자 알림 -->
        <div class="rounded-lg p-4 transition-all" :class="cardClass(step4BNotify)">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-bold text-text-primary">4-B-0 · 운영자 알림 (수집 전 즉시 발송)</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded" :class="subStateBadge(step4BNotify).cls">{{ subStateBadge(step4BNotify).label }}</span>
          </div>
          <div v-if="stepStarted(step4BNotify) && !step4BNotify.done" class="flex items-center gap-2 text-sm text-text-secondary">
            <span class="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
            {{ currentSubStep(step4BNotify) }}
          </div>
          <div v-if="step4BNotify.done" class="space-y-2">
            <div class="flex items-center gap-2 flex-wrap text-sm">
              <span class="px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300 font-mono font-bold">{{ blueprint.deepAnalysis.notification.channel }}</span>
              <span v-if="blueprint.deepAnalysis.notification.mentionLabel" class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-mono font-bold">{{ blueprint.deepAnalysis.notification.mentionLabel }}</span>
              <span class="text-xs text-gray-600 font-mono">sent: {{ blueprint.deepAnalysis.notification.sentAt }}</span>
            </div>
            <pre class="text-xs bg-bg-card border border-border rounded p-3 overflow-x-auto font-mono whitespace-pre-wrap text-text-secondary">{{ blueprint.deepAnalysis.notification.messagePreview }}</pre>
          </div>
        </div>

        <!-- 심층 수집 (병렬 3) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <!-- 로그 -->
          <div class="rounded-lg p-4 transition-all min-h-[240px]" :class="cardClass(step4BCollection.logCollection)">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-bold text-text-primary">4-B-1 · 로그 (Loki)</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded" :class="subStateBadge(step4BCollection.logCollection).cls">{{ subStateBadge(step4BCollection.logCollection).label }}</span>
            </div>
            <div v-if="stepStarted(step4BCollection.logCollection) && !step4BCollection.logCollection.done" class="flex items-center gap-2 text-sm text-text-secondary">
              <span class="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
              {{ currentSubStep(step4BCollection.logCollection) }}
            </div>
            <div v-else-if="step4BCollection.logCollection.done" class="space-y-2">
              <pre class="text-xs bg-bg-card border border-border rounded p-2 overflow-x-auto font-mono whitespace-pre-wrap text-text-secondary">{{ blueprint.deepAnalysis.logCollection.queryPreview }}</pre>
              <div class="text-xs text-gray-600">{{ blueprint.deepAnalysis.logCollection.windowLabel }}</div>
              <div class="flex items-center gap-2 text-xs flex-wrap">
                <span class="px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-bold">총 {{ blueprint.deepAnalysis.logCollection.totalCount }}건</span>
                <span class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">ERROR {{ blueprint.deepAnalysis.logCollection.errorCount }}</span>
                <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">WARN {{ blueprint.deepAnalysis.logCollection.warnCount }}</span>
              </div>
              <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <div v-for="(lg, i) in blueprint.deepAnalysis.logCollection.samples" :key="i" class="text-xs border-b border-border pb-1.5 last:border-0">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="font-bold" :class="lg.level === 'ERROR' ? 'text-rose-700' : lg.level === 'WARN' ? 'text-amber-700' : 'text-gray-700'">{{ lg.level }}</span>
                    <span v-if="lg.occurrence" class="text-gray-500">×{{ lg.occurrence }}</span>
                  </div>
                  <div class="text-text-secondary" :title="lg.message">{{ lg.message }}</div>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-gray-400 italic">대기 중…</div>
          </div>

          <!-- 트레이스 -->
          <div class="rounded-lg p-4 transition-all min-h-[240px]" :class="cardClass(step4BCollection.traceCollection)">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-bold text-text-primary">4-B-2 · 트레이스 (Tempo)</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded" :class="subStateBadge(step4BCollection.traceCollection).cls">{{ subStateBadge(step4BCollection.traceCollection).label }}</span>
            </div>
            <div v-if="stepStarted(step4BCollection.traceCollection) && !step4BCollection.traceCollection.done" class="flex items-center gap-2 text-sm text-text-secondary">
              <span class="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
              {{ currentSubStep(step4BCollection.traceCollection) }}
            </div>
            <div v-else-if="step4BCollection.traceCollection.done" class="space-y-2">
              <pre class="text-xs bg-bg-card border border-border rounded p-2 overflow-x-auto font-mono whitespace-pre-wrap text-text-secondary">{{ blueprint.deepAnalysis.traceCollection.queryPreview }}</pre>
              <div class="text-xs text-gray-600">느린 트레이스 {{ blueprint.deepAnalysis.traceCollection.totalCount }}건</div>
              <div class="space-y-2">
                <div v-for="(t, i) in blueprint.deepAnalysis.traceCollection.slowSpans" :key="i" class="border border-border rounded p-2 bg-white">
                  <div class="flex items-center justify-between text-xs mb-0.5">
                    <span class="font-mono text-text-primary font-bold">{{ t.span }}</span>
                    <span class="text-rose-700 font-bold">{{ t.durationMs.toLocaleString() }}ms</span>
                  </div>
                  <div class="text-xs text-gray-600">baseline {{ t.baselineMs }}ms</div>
                  <div class="text-xs text-text-secondary mt-1">{{ t.description }}</div>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-gray-400 italic">대기 중…</div>
          </div>

          <!-- 벡터 검색 -->
          <div class="rounded-lg p-4 transition-all min-h-[240px]" :class="cardClass(step4BCollection.vectorSearch)">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-bold text-text-primary">4-B-3 · Vector DB 유사 사태</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded" :class="subStateBadge(step4BCollection.vectorSearch).cls">{{ subStateBadge(step4BCollection.vectorSearch).label }}</span>
            </div>
            <div v-if="stepStarted(step4BCollection.vectorSearch) && !step4BCollection.vectorSearch.done" class="flex items-center gap-2 text-sm text-text-secondary">
              <span class="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
              {{ currentSubStep(step4BCollection.vectorSearch) }}
            </div>
            <div v-else-if="step4BCollection.vectorSearch.done" class="space-y-2">
              <div class="bg-white border-2 border-border rounded p-2">
                <div class="text-xs text-gray-500 mb-0.5">최상위 가설</div>
                <div class="text-sm font-bold text-text-primary mb-1">{{ blueprint.deepAnalysis.vectorSearch.topCauseLabel }}</div>
                <div class="flex items-center gap-2 text-xs">
                  <span class="px-2 py-0.5 rounded font-bold" :class="tone.badge">신뢰도 {{ (blueprint.deepAnalysis.vectorSearch.confidence * 100).toFixed(0) }}%</span>
                </div>
              </div>
              <details class="text-xs">
                <summary class="cursor-pointer text-gray-600 hover:text-text-primary font-bold">situation_text 보기</summary>
                <pre class="bg-bg-card border border-border rounded p-2 mt-1 overflow-x-auto font-mono whitespace-pre-wrap text-text-secondary">{{ blueprint.deepAnalysis.vectorSearch.situationText }}</pre>
              </details>
              <div class="space-y-2">
                <div v-for="(sim, i) in blueprint.deepAnalysis.vectorSearch.similarIncidents" :key="i" class="border border-border rounded p-2 bg-white">
                  <div class="flex items-center justify-between text-xs mb-0.5">
                    <span class="text-gray-600">{{ sim.occurredAt }} · {{ sim.timeContext }}</span>
                    <span class="text-xs font-bold px-1.5 py-0.5 rounded" :class="tone.badge">{{ (sim.similarity * 100).toFixed(0) }}%</span>
                  </div>
                  <div class="text-xs text-text-primary">{{ sim.summary }}</div>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-gray-400 italic">대기 중…</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────────────────────────────────────────────────────
         Step 5 — 원인 분석 보고서 (deep only)
    ─────────────────────────────────────────────────────────── -->
    <section v-if="blueprint.step4Type === 'deep_analysis' && blueprint.step5">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all" :class="stepBadgeClass(stepStatus(stepStarted(step5), step5.done))">
          5
        </div>
        <div class="flex-1">
          <div class="text-xs font-bold uppercase tracking-wider text-gray-500">STEP 5 — ROOT CAUSE REPORT</div>
          <div class="text-lg font-bold text-text-primary">원인 분석 + 대처 방안 보고서</div>
        </div>
        <span class="text-sm font-bold" :class="stepLabelClass(stepStatus(stepStarted(step5), step5.done))">{{ stepLabel(stepStatus(stepStarted(step5), step5.done)) }}</span>
      </div>

      <div class="border-2 rounded-lg overflow-hidden transition-all" :class="step5.done ? tone.border : stepStarted(step5) ? 'border-brand' : 'border-gray-200'">
        <!-- 헤더 -->
        <div class="px-5 py-3" :class="step5.done || stepStarted(step5) ? tone.header : 'bg-gray-100 text-gray-500'">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold uppercase tracking-wider">최종 보고서</span>
            <span class="text-xs font-mono opacity-90">{{ subStateBadge(step5).label }}</span>
          </div>
        </div>

        <div v-if="stepStarted(step5) && !step5.done" class="px-5 py-4 flex items-center gap-2 text-sm text-text-secondary">
          <span class="inline-block w-2 h-2 bg-brand rounded-full animate-pulse" />
          {{ currentSubStep(step5) }}
        </div>

        <div v-if="step5.done" class="px-5 py-5 bg-bg-card space-y-5">
          <!-- 1. 원인 가설 -->
          <div>
            <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">1. 원인 가설</div>
            <div class="border-2 border-border rounded-md p-3 bg-white">
              <div class="flex items-center justify-between mb-1">
                <span class="text-base font-bold text-text-primary">{{ blueprint.step5.topHypothesisLabel }}</span>
                <span class="text-sm font-bold px-2 py-0.5 rounded-full" :class="tone.badge">신뢰도 {{ (blueprint.step5.hypothesisConfidence * 100).toFixed(0) }}%</span>
              </div>
              <div class="text-sm text-text-secondary">{{ blueprint.step5.hypothesisBasis }}</div>
            </div>
          </div>

          <!-- 2. 로그 증거 -->
          <div>
            <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">2. 로그 증거</div>
            <ul class="space-y-1.5">
              <li v-for="(le, i) in blueprint.step5.logEvidence" :key="i" class="text-sm text-text-primary flex items-start gap-2">
                <span class="text-rose-600 mt-0.5">•</span>
                <span class="font-mono text-xs">{{ le }}</span>
              </li>
            </ul>
          </div>

          <!-- 3. 트레이스 병목 -->
          <div>
            <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">3. 트레이스 병목</div>
            <div class="border-2 border-border rounded-md p-3 bg-white flex items-center justify-between">
              <div>
                <div class="font-mono text-sm text-text-primary font-bold">{{ blueprint.step5.traceBottleneck.span }}</div>
                <div class="text-xs text-gray-600">baseline {{ blueprint.step5.traceBottleneck.baselineMs }}ms</div>
              </div>
              <div class="text-2xl font-bold text-rose-700">{{ blueprint.step5.traceBottleneck.avgDurationMs.toLocaleString() }}ms</div>
            </div>
          </div>

          <!-- 4. 권장 조치 -->
          <div>
            <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">4. 권장 조치</div>
            <div class="space-y-3">
              <div v-if="immediateActions.length > 0">
                <div class="text-xs font-bold text-emerald-800 mb-1.5 uppercase tracking-wider">즉시 조치 (immediate)</div>
                <div class="space-y-2">
                  <div v-for="(a, i) in immediateActions" :key="i" class="border-2 border-border rounded-md p-3 bg-white">
                    <div class="flex items-center justify-between mb-1">
                      <div class="text-sm font-bold text-text-primary">{{ i + 1 }}. {{ a.title }}</div>
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold px-2 py-0.5 rounded" :class="riskBadge(a.risk)">위험 {{ a.risk }}</span>
                        <span v-if="a.estimatedRecoveryMinutes" class="text-xs font-mono text-gray-600">~{{ a.estimatedRecoveryMinutes }}분</span>
                      </div>
                    </div>
                    <div class="text-sm text-text-secondary">{{ a.description }}</div>
                    <div v-if="a.rationale" class="text-xs text-gray-600 italic mt-1">근거: {{ a.rationale }}</div>
                  </div>
                </div>
              </div>
              <div v-if="iacActions.length > 0">
                <div class="text-xs font-bold text-amber-800 mb-1.5 uppercase tracking-wider">IaC 변경 (iac_change)</div>
                <div class="space-y-2">
                  <div v-for="(a, i) in iacActions" :key="i" class="border-2 border-border rounded-md p-3 bg-white">
                    <div class="flex items-center justify-between mb-1">
                      <div class="text-sm font-bold text-text-primary">{{ i + 1 }}. {{ a.title }}</div>
                      <span class="text-xs font-bold px-2 py-0.5 rounded" :class="riskBadge(a.risk)">위험 {{ a.risk }}</span>
                    </div>
                    <div class="text-sm text-text-secondary">{{ a.description }}</div>
                    <div v-if="a.rationale" class="text-xs text-gray-600 italic mt-1">근거: {{ a.rationale }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 5. 핸드오프 -->
          <div>
            <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">5. 핸드오프 결정</div>
            <div class="border-2 rounded-md p-3" :class="tone.border + ' ' + tone.bg">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-bold" :class="tone.text">
                  {{ blueprint.step5.handoff.toRca ? '✓ RCA 자동 진입' : '⏸ RCA 미진입' }}
                </span>
                <span v-if="blueprint.step5.handoff.mode" class="text-xs font-mono text-gray-600">({{ blueprint.step5.handoff.mode }} 모드)</span>
              </div>
              <div class="text-sm text-text-primary">{{ blueprint.step5.handoff.reason }}</div>
              <div v-if="blueprint.step5.handoff.slackChannel" class="text-xs text-gray-600 mt-1">
                Slack 전파: <span class="font-mono font-bold">{{ blueprint.step5.handoff.slackChannel }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!stepStarted(step5)" class="px-5 py-4 text-sm text-gray-400 italic">대기 중…</div>
      </div>
    </section>

    <!-- 결론 + Slack 뱃지 -->
    <div v-if="phase === 'done'" class="border-2 rounded-md px-4 py-3 font-bold text-base" :class="[tone.border, tone.bg, tone.text]">
      {{ blueprint.conclusion }}
    </div>
    <div v-if="phase === 'done' && slackPropagated" class="flex items-center gap-2 text-sm bg-purple-50 border-2 border-purple-300 text-purple-900 rounded-md px-3 py-2">
      <span class="font-bold">Slack</span>
      <span>#ops-critical 채널에 @channel 전파됨</span>
    </div>
  </div>
</template>
