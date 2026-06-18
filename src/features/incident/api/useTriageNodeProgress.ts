import { onUnmounted, reactive, ref } from 'vue';
import type { ArrivingAlarm, TriageStageBlueprint } from '../fixtures/triage-blueprints';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

// Triage Agent 워크플로우 단계 (triage_agent.md v2)
export type FlowPhase =
  | 'idle'
  | 'grouping'              // Step 1
  | 'static-analysis'       // Step 2 (병렬 3)
  | 'risk-judgment'         // Step 3
  | 'simple-report'         // Step 4-A
  | 'notify-operator'       // Step 4-B-notify
  | 'deep-collection'       // Step 4-B-collection (병렬 3)
  | 'analysis-report'       // Step 5
  | 'done';

// 노드 sub-step 진행 상태
export interface StepState {
  steps: string[];
  currentIdx: number;       // -1 = 미시작, 0..len = 진행, len = 완료
  done: boolean;
}

// Section A 그룹화 진행
export interface GroupingProgress {
  visibleArriving: ArrivingAlarm[];
  groupConfirmed: boolean;
}

// Step 2 병렬 3 노드
export interface Step2Parallel {
  alarmHistory: StepState;
  slaStatus: StepState;
  metricSnapshot: StepState;
}

// Step 4-B 수집 병렬 3
export interface Step4BParallel {
  logCollection: StepState;
  traceCollection: StepState;
  vectorSearch: StepState;
}

// severity → 단계별 실제 렌더 시간 (ms)
function realTimingFor(sev: Severity): {
  step1: number; step2: number; step3: number;
  notify: number; deepCollection: number; report: number; simple: number;
} {
  if (sev === 'Critical' || sev === 'High') {
    return { step1: 2_000, step2: 1_500, step3: 500, notify: 500, deepCollection: 2_000, report: 1_500, simple: 0 };
  }
  return { step1: 3_000, step2: 3_000, step3: 1_000, notify: 0, deepCollection: 0, report: 0, simple: 3_000 };
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// Triage Agent 흐름 시뮬레이션 — Section A 그룹화 + Section B Step 2~5
export function useTriageFlow() {
  const phase = ref<FlowPhase>('idle');
  const elapsedDisplayMs = ref(0);
  const totalDisplayMs = ref(0);

  const grouping = reactive<GroupingProgress>({ visibleArriving: [], groupConfirmed: false });

  const step2 = reactive<Step2Parallel>({
    alarmHistory:   { steps: [], currentIdx: -1, done: false },
    slaStatus:      { steps: [], currentIdx: -1, done: false },
    metricSnapshot: { steps: [], currentIdx: -1, done: false },
  });

  const step3 = reactive<StepState>({ steps: [], currentIdx: -1, done: false });
  const step4Simple = reactive<StepState>({ steps: [], currentIdx: -1, done: false });
  const step4BNotify = reactive<StepState>({ steps: [], currentIdx: -1, done: false });
  const step4BCollection = reactive<Step4BParallel>({
    logCollection:   { steps: [], currentIdx: -1, done: false },
    traceCollection: { steps: [], currentIdx: -1, done: false },
    vectorSearch:    { steps: [], currentIdx: -1, done: false },
  });
  const step5 = reactive<StepState>({ steps: [], currentIdx: -1, done: false });

  let cancelled = false;
  let displayTicker: ReturnType<typeof setInterval> | null = null;
  let phaseStartedAt = 0;
  let phaseRealMs = 0;
  let phaseDisplayBase = 0;
  let phaseDisplaySpan = 0;

  // 단계 시작 시 표시 시간을 가속해서 흘려보내는 ticker
  function startDisplayTicker(realMs: number, displaySpan: number, base: number): void {
    if (displayTicker) clearInterval(displayTicker);
    phaseStartedAt = Date.now();
    phaseRealMs = Math.max(200, realMs);
    phaseDisplayBase = base;
    phaseDisplaySpan = displaySpan;
    displayTicker = setInterval(() => {
      const elapsed = Date.now() - phaseStartedAt;
      const ratio = Math.min(1, elapsed / phaseRealMs);
      elapsedDisplayMs.value = Math.floor(phaseDisplayBase + phaseDisplaySpan * ratio);
      if (ratio >= 1 && displayTicker) {
        clearInterval(displayTicker);
        displayTicker = null;
      }
    }, 60);
  }

  function clearTicker(): void {
    if (displayTicker) {
      clearInterval(displayTicker);
      displayTicker = null;
    }
  }

  // 단계 sub-step 시퀀스 진행
  async function runStepState(state: StepState, steps: string[], realMs: number): Promise<void> {
    state.steps = steps;
    state.currentIdx = 0;
    state.done = false;
    const perStepMs = Math.max(120, Math.floor(realMs / Math.max(1, steps.length)));
    for (let i = 0; i < steps.length; i++) {
      if (cancelled) return;
      state.currentIdx = i;
      await sleep(perStepMs);
    }
    if (cancelled) return;
    state.currentIdx = steps.length;
    state.done = true;
  }

  // 시나리오 전체 흐름 시작
  async function run(blueprint: TriageStageBlueprint, severity: Severity): Promise<void> {
    stop();
    cancelled = false;
    elapsedDisplayMs.value = 0;
    totalDisplayMs.value = blueprint.totalElapsedDisplayMs;

    // 상태 초기화
    grouping.visibleArriving = [];
    grouping.groupConfirmed = false;
    Object.assign(step2.alarmHistory,   { steps: [], currentIdx: -1, done: false });
    Object.assign(step2.slaStatus,      { steps: [], currentIdx: -1, done: false });
    Object.assign(step2.metricSnapshot, { steps: [], currentIdx: -1, done: false });
    Object.assign(step3, { steps: [], currentIdx: -1, done: false });
    Object.assign(step4Simple, { steps: [], currentIdx: -1, done: false });
    Object.assign(step4BNotify, { steps: [], currentIdx: -1, done: false });
    Object.assign(step4BCollection.logCollection,   { steps: [], currentIdx: -1, done: false });
    Object.assign(step4BCollection.traceCollection, { steps: [], currentIdx: -1, done: false });
    Object.assign(step4BCollection.vectorSearch,    { steps: [], currentIdx: -1, done: false });
    Object.assign(step5, { steps: [], currentIdx: -1, done: false });

    const timing = realTimingFor(severity);

    // ── Step 1: Grouping (트리거 즉시 + 추가 알람 ticker) ──
    phase.value = 'grouping';
    startDisplayTicker(timing.step1, blueprint.step1DisplayMs, 0);
    const arrivings = blueprint.step1.arrivingAlarms;
    if (arrivings.length > 0) {
      const perAlarmMs = Math.max(150, Math.floor(timing.step1 / (arrivings.length + 1)));
      for (const a of arrivings) {
        if (cancelled) return;
        await sleep(perAlarmMs);
        grouping.visibleArriving = [...grouping.visibleArriving, a];
      }
      await sleep(Math.max(150, Math.floor(perAlarmMs / 2)));
    } else {
      await sleep(timing.step1);
    }
    if (cancelled) return;
    grouping.groupConfirmed = true;
    clearTicker();
    elapsedDisplayMs.value = blueprint.step1DisplayMs;

    // ── Step 2: Static Analysis (병렬 3) ──
    phase.value = 'static-analysis';
    startDisplayTicker(timing.step2, blueprint.step2DisplayMs, blueprint.step1DisplayMs);
    await Promise.all([
      runStepState(step2.alarmHistory,   blueprint.step2.alarmHistory.steps,   timing.step2),
      runStepState(step2.slaStatus,      blueprint.step2.slaStatus.steps,      timing.step2),
      runStepState(step2.metricSnapshot, blueprint.step2.metricSnapshot.steps, timing.step2),
    ]);
    if (cancelled) return;
    clearTicker();
    elapsedDisplayMs.value = blueprint.step1DisplayMs + blueprint.step2DisplayMs;

    // ── Step 3: Risk Judgment ──
    phase.value = 'risk-judgment';
    startDisplayTicker(timing.step3, blueprint.step3DisplayMs, blueprint.step1DisplayMs + blueprint.step2DisplayMs);
    await runStepState(step3, blueprint.step3.steps, timing.step3);
    if (cancelled) return;
    clearTicker();
    elapsedDisplayMs.value = blueprint.step1DisplayMs + blueprint.step2DisplayMs + blueprint.step3DisplayMs;

    const baseAfterStep3 = blueprint.step1DisplayMs + blueprint.step2DisplayMs + blueprint.step3DisplayMs;

    // ── Step 4 분기 ──
    if (blueprint.step4Type === 'simple_report' && blueprint.simpleReport) {
      phase.value = 'simple-report';
      startDisplayTicker(timing.simple, blueprint.step4DisplayMs, baseAfterStep3);
      await runStepState(step4Simple, blueprint.simpleReport.steps, timing.simple);
      if (cancelled) return;
      clearTicker();
      elapsedDisplayMs.value = baseAfterStep3 + blueprint.step4DisplayMs;
    } else if (blueprint.step4Type === 'deep_analysis' && blueprint.deepAnalysis) {
      const notifyDisplay = Math.floor(blueprint.step4DisplayMs * 0.25);
      const collectionDisplay = blueprint.step4DisplayMs - notifyDisplay;

      // 4-B notify (수집 전 즉시 발송)
      phase.value = 'notify-operator';
      startDisplayTicker(timing.notify, notifyDisplay, baseAfterStep3);
      await runStepState(step4BNotify, blueprint.deepAnalysis.notification.steps, timing.notify);
      if (cancelled) return;
      clearTicker();
      elapsedDisplayMs.value = baseAfterStep3 + notifyDisplay;

      // 4-B collection (병렬 3)
      phase.value = 'deep-collection';
      startDisplayTicker(timing.deepCollection, collectionDisplay, baseAfterStep3 + notifyDisplay);
      await Promise.all([
        runStepState(step4BCollection.logCollection,   blueprint.deepAnalysis.logCollection.steps,   timing.deepCollection),
        runStepState(step4BCollection.traceCollection, blueprint.deepAnalysis.traceCollection.steps, timing.deepCollection),
        runStepState(step4BCollection.vectorSearch,    blueprint.deepAnalysis.vectorSearch.steps,    timing.deepCollection),
      ]);
      if (cancelled) return;
      clearTicker();
      elapsedDisplayMs.value = baseAfterStep3 + blueprint.step4DisplayMs;

      // Step 5 보고서
      if (blueprint.step5) {
        phase.value = 'analysis-report';
        startDisplayTicker(timing.report, blueprint.step5DisplayMs, baseAfterStep3 + blueprint.step4DisplayMs);
        await runStepState(step5, blueprint.step5.steps, timing.report);
        if (cancelled) return;
        clearTicker();
        elapsedDisplayMs.value = blueprint.totalElapsedDisplayMs;
      }
    }

    phase.value = 'done';
    elapsedDisplayMs.value = blueprint.totalElapsedDisplayMs;
  }

  // 진행 중단
  function stop(): void {
    cancelled = true;
    clearTicker();
  }

  onUnmounted(stop);

  return {
    phase,
    elapsedDisplayMs,
    totalDisplayMs,
    grouping,
    step2,
    step3,
    step4Simple,
    step4BNotify,
    step4BCollection,
    step5,
    run,
    stop,
  };
}
