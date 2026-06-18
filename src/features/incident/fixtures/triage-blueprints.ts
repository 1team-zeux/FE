// Triage Agent 워크플로우 시나리오 블루프린트 (triage_agent.md v2 기준)
// Step 1 그룹화 → Step 2 정적 분석(병렬 3) → Step 3 위험도 판단
//                                                       ↓
//                                                 ┌─────┴──────┐
//                                                 │            │
//                                       Step 4-A          Step 4-B (운영자 알림 + 병렬 3) → Step 5
//                                       simple_report     deep_analysis

// ─────────────────────────────────────────────────────────────
// 공통 타입
// ─────────────────────────────────────────────────────────────

// 트리거 알람 — Section A 첫 줄에 강조 표시
export interface TriggerAlarm {
  ts: string;
  alertName: string;
  severity: 'critical' | 'warning' | 'info';
  serviceId: string;
  serviceName: string;
  metric?: string;
  threshold?: number | string;
  currentValue?: number | string;
  unit?: string;
  message: string;                      // 짧은 조건문 (예: "p95 latency 임계치 초과")
}

// 트리거 이후 들어오는 추가 알람
export interface ArrivingAlarm {
  ts: string;
  alertName: string;
  severity: 'critical' | 'warning' | 'info';
  metric?: string;
  threshold?: number | string;
  currentValue?: number | string;
  unit?: string;
  message: string;                      // 짧은 조건문
}

// 서비스 의존성 맵 — Overview ServiceMap 컴포넌트와 동일 schema
export interface ServiceMapNode {
  id: string;
  name: string;
  status: 'critical' | 'warning' | 'healthy';
  x: number;
  y: number;
}
export interface ServiceMapEdge {
  from: string;
  to: string;
}
export interface ServiceMapData {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
}

// SLA 보고서 항목
export interface SlaReportItem {
  itemId: string;
  category: string;
  targetLabel: string;
  budgetRemainingPct: number;
  burnRateState: string;
  burnRateValue?: number;
  violationEta: string;
  alertLevel?: string;
}

// 권장 조치
export interface ActionRecommendation {
  title: string;
  description: string;
  risk: 'Low' | 'Medium' | 'High';
  type: 'immediate' | 'iac_change';
  rationale?: string;
  estimatedRecoveryMinutes?: number;
}

// 핸드오프
export interface HandoffDecision {
  toRca: boolean;
  mode?: string;
  reason: string;
  slackChannel?: string;
}

// 유사 사태
export interface SimilarIncidentDetail {
  incidentId: string;
  similarity: number;
  occurredAt: string;
  timeContext: string;
  resolution: string;
  confirmedCause: string;
  summary: string;
}

// ─────────────────────────────────────────────────────────────
// Step 1 — 알람 수신 & 그룹화
// ─────────────────────────────────────────────────────────────
export interface Step1Data {
  trigger: TriggerAlarm;
  severityStrategy: string;             // "Critical/High → 즉시 그룹 확정 + 2분 병합 윈도우"
  windowDurationLabel: string;          // "2분 병합 윈도우" / "1분 debounce"
  arrivingAlarms: ArrivingAlarm[];      // 트리거 이후 추가 알람 (시간순)
  representativeSeverity: 'critical' | 'warning' | 'info';
  serviceMap: ServiceMapData;
}

// ─────────────────────────────────────────────────────────────
// Step 2 — 정적 분석 (3 병렬)
// ─────────────────────────────────────────────────────────────

// 2-A 이상 이력 조회 결과
export interface AlarmHistoryResult {
  steps: string[];                      // 진행 sub-step 메시지
  occurrenceCount: number;              // 최근 30일 발생 횟수
  avgDurationSec: number;
  autoResolveRatio: number;             // 0~1
  lastOccurrence: string;
  patternLabel: 'recurring_auto_resolve' | 'recurring_escalated' | 'first_occurrence';
  patternLabelKo: string;
  patternBasis: string;                 // 한 줄 해설
}

// 2-B SLA 현재 상태 조회 결과
export interface SlaStatusResult {
  steps: string[];
  items: SlaReportItem[];
  estimatedViolationAt?: string;
}

// 2-C 메트릭 스냅샷 결과
export interface MetricSnapshotResult {
  steps: string[];
  snapshotAt: string;
  metrics: Array<{
    name: string;
    label: string;
    current: number;
    baseline: number;
    deviationRatio: number;
    unit?: string;
  }>;
  maxDeviationRatio: number;
}

// Step 2 전체
export interface Step2Data {
  alarmHistory: AlarmHistoryResult;
  slaStatus: SlaStatusResult;
  metricSnapshot: MetricSnapshotResult;
}

// ─────────────────────────────────────────────────────────────
// Step 3 — 위험도 판단
// ─────────────────────────────────────────────────────────────
export interface RiskCheck {
  label: string;                        // "burn rate" / "이상 이력 패턴" / "메트릭 편차"
  value: string;                        // "fast 14.4×" / "recurring_auto_resolve" / "60×"
  judgment: string;                     // "심층 분석" / "다음 기준으로" / "정상"
  triggersDeep: boolean;
}

export interface Step3Data {
  steps: string[];
  burnRateCheck: RiskCheck;
  patternCheck: RiskCheck;
  deviationCheck: RiskCheck;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  route: 'simple_report' | 'deep_analysis';
  reasons: string[];
}

// ─────────────────────────────────────────────────────────────
// Step 4-A — Simple Report (정상 경로)
// ─────────────────────────────────────────────────────────────
export interface SimpleReportData {
  steps: string[];
  vectorDbStored: {
    embeddingTemplate: string;          // 합성 텍스트 (템플릿 채움 결과)
    outcomeLabel: string;               // "normal_pattern"
    patternLabel: string;
  };
  summary: string;
  evidence: {
    pattern: string;
    burnRate: string;
    maxDeviation: string;
  };
  action: string;
  reportId: string;
}

// ─────────────────────────────────────────────────────────────
// Step 4-B — Deep Analysis (이상 경로)
// ─────────────────────────────────────────────────────────────

// 운영자 알림
export interface OperatorNotificationData {
  steps: string[];
  channel: string;
  messagePreview: string;
  sentAt: string;
  mentionLabel?: string;
}

// 4-B-1 로그 수집 (Loki)
export interface LogCollectionData {
  steps: string[];
  queryPreview: string;
  windowLabel: string;
  totalCount: number;
  errorCount: number;
  warnCount: number;
  samples: Array<{
    ts: string;
    level: 'ERROR' | 'WARN' | 'INFO';
    service: string;
    message: string;
    occurrence?: number;
  }>;
}

// 4-B-2 트레이스 수집 (Tempo)
export interface TraceCollectionData {
  steps: string[];
  queryPreview: string;
  totalCount: number;
  slowSpans: Array<{
    traceId: string;
    span: string;
    durationMs: number;
    baselineMs: number;
    description: string;
  }>;
}

// 4-B-3 Vector DB 유사 상황 조회
export interface VectorSearchData {
  steps: string[];
  situationText: string;                // 템플릿 합성 결과
  topCauseKey: string;
  topCauseLabel: string;
  confidence: number;
  basis: string;
  similarIncidents: SimilarIncidentDetail[];
}

// Step 4-B 전체
export interface DeepAnalysisData {
  notification: OperatorNotificationData;
  logCollection: LogCollectionData;
  traceCollection: TraceCollectionData;
  vectorSearch: VectorSearchData;
}

// ─────────────────────────────────────────────────────────────
// Step 5 — 원인 분석 + 대처 방안 보고서 (deep 전용)
// ─────────────────────────────────────────────────────────────
export interface AnalysisReportData {
  steps: string[];
  reportId: string;
  topHypothesisKey: string;
  topHypothesisLabel: string;
  hypothesisConfidence: number;
  hypothesisBasis: string;
  logEvidence: string[];
  traceBottleneck: {
    span: string;
    avgDurationMs: number;
    baselineMs: number;
  };
  recommendedActions: ActionRecommendation[];
  handoff: HandoffDecision;
}

// ─────────────────────────────────────────────────────────────
// 전체 블루프린트
// ─────────────────────────────────────────────────────────────
export interface TriageStageBlueprint {
  scenarioId: string;
  totalElapsedDisplayLabel: string;
  totalElapsedDisplayMs: number;
  step1DisplayMs: number;
  step2DisplayMs: number;
  step3DisplayMs: number;
  step4DisplayMs: number;
  step5DisplayMs: number;                // simple_report 경우 0

  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;

  step4Type: 'simple_report' | 'deep_analysis';
  simpleReport?: SimpleReportData;
  deepAnalysis?: DeepAnalysisData;
  step5?: AnalysisReportData;

  conclusion: string;
}

// ─────────────────────────────────────────────────────────────
// Scenario A — Billing Settlement Batch (Low, simple_report)
// ─────────────────────────────────────────────────────────────
export const BILLING_LOW_BLUEPRINT: TriageStageBlueprint = {
  scenarioId: 'billing-low',
  totalElapsedDisplayLabel: '4분 0초',
  totalElapsedDisplayMs: 240_000,
  step1DisplayMs: 60_000,
  step2DisplayMs: 90_000,
  step3DisplayMs: 20_000,
  step4DisplayMs: 70_000,
  step5DisplayMs: 0,

  step1: {
    trigger: {
      ts: '02:15:25',
      alertName: 'CpuUsageHigh',
      severity: 'warning',
      serviceId: 'billing-settlement-batch',
      serviceName: 'Billing Settlement Batch',
      metric: 'cpu_usage_pct',
      threshold: 80,
      currentValue: 84,
      unit: '%',
      message: 'CPU 사용률 임계치 초과',
    },
    severityStrategy: 'Warning → 1분 debounce 후 그룹 확정',
    windowDurationLabel: '1분 debounce',
    arrivingAlarms: [
      { ts: '02:16:45', alertName: 'SpotStealTime',     severity: 'warning', metric: 'cpu_steal_pct', threshold: 2,  currentValue: 4.1, unit: '%',  message: 'Spot 인스턴스 CPU steal 임계치 초과' },
      { ts: '02:17:21', alertName: 'BatchProgressInfo', severity: 'info',                                                                              message: '배치 진행률 정상 — ETA 02:48' },
      { ts: '02:18:35', alertName: 'PatternMatched',    severity: 'info',                                                                              message: '유사 사태 패턴 매칭 — 자동 회복 후보' },
    ],
    representativeSeverity: 'warning',
    serviceMap: {
      nodes: [
        { id: 'portal',  name: 'Customer Portal',  status: 'healthy', x: 20,  y: 165 },
        { id: 'sub-api', name: 'Subscription API', status: 'healthy', x: 210, y: 55  },
        { id: 'chatbot', name: 'AI Chatbot',       status: 'healthy', x: 210, y: 165 },
        { id: 'billing', name: 'Billing Batch',    status: 'warning', x: 210, y: 275 },
        { id: 'mariadb', name: 'MariaDB',          status: 'healthy', x: 400, y: 165 },
      ],
      edges: [
        { from: 'portal',  to: 'sub-api' },
        { from: 'portal',  to: 'chatbot' },
        { from: 'portal',  to: 'billing' },
        { from: 'sub-api', to: 'mariadb' },
        { from: 'billing', to: 'mariadb' },
      ],
    },
  },

  step2: {
    alarmHistory: {
      steps: [
        'RDB alarm_history 조회 (service_id=billing-settlement-batch, 30일 윈도우)…',
        'CpuUsageHigh 알람 occurrence 집계…',
        '자동 회복 비율 계산…',
        'pattern_label 분류…',
      ],
      occurrenceCount: 12,
      avgDurationSec: 540,
      autoResolveRatio: 1.0,
      lastOccurrence: '2026-06-17 02:18 KST',
      patternLabel: 'recurring_auto_resolve',
      patternLabelKo: '반복 발생 · 자동 회복',
      patternBasis: '30일간 12회 발생 · 모두 자동 회복 (정렬 단계 정상 패턴)',
    },
    slaStatus: {
      steps: [
        'RDB sla_items + error_budgets JOIN 조회…',
        '잔여 Budget 계산…',
        'burn rate 상태 확인…',
        '위반 예상 시점 산출…',
      ],
      items: [
        {
          itemId: 'sla-billing-correctness',
          category: 'Correctness',
          targetLabel: '≥ 99.99%',
          budgetRemainingPct: 98.5,
          burnRateState: 'normal',
          burnRateValue: 0.1,
          violationEta: '마감까지 3시간 13분 여유',
          alertLevel: 'level0',
        },
      ],
    },
    metricSnapshot: {
      steps: [
        'Prometheus 메트릭 메타 조회…',
        'service_meta.monitoring_metrics 로 수집 대상 결정…',
        '5분 윈도우 PromQL 쿼리 실행…',
        '7일 baseline 비교 · deviation_ratio 계산…',
      ],
      snapshotAt: '2026-06-18 02:17:00 KST',
      metrics: [
        { name: 'cpu_usage_pct',      label: 'CPU Usage',          current: 84,     baseline: 55,    deviationRatio: 1.5,  unit: '%' },
        { name: 'batch_progress_pct', label: 'Batch Progress',     current: 47,     baseline: 50,    deviationRatio: 0.94, unit: '%' },
        { name: 'error_rate',         label: 'Error Rate',         current: 0.0008, baseline: 0.001, deviationRatio: 0.8,  unit: '' },
      ],
      maxDeviationRatio: 1.5,
    },
  },

  step3: {
    steps: [
      'Step 2 정적 분석 결과 fan-in…',
      'burn rate 체크 (가장 우선)…',
      '이상 이력 패턴 체크…',
      '메트릭 편차 체크 (5배 임계)…',
      'route 결정…',
    ],
    burnRateCheck:  { label: 'burn rate',       value: 'normal (0.1×)',                judgment: '다음 기준으로',  triggersDeep: false },
    patternCheck:   { label: '이상 이력 패턴',     value: 'recurring_auto_resolve (12회 / 100% 자동회복)', judgment: '다음 기준으로', triggersDeep: false },
    deviationCheck: { label: '메트릭 편차',       value: '최대 1.5× (5배 미만)',         judgment: '정상 범위',      triggersDeep: false },
    riskLevel: 'low',
    route: 'simple_report',
    reasons: [
      'burn_rate: normal (0.1×) — SLA 위반 위험 없음',
      'pattern: recurring_auto_resolve (30일간 12회, 자동회복률 100%)',
      'max_deviation_ratio: 1.5 (5배 미만)',
    ],
  },

  step4Type: 'simple_report',
  simpleReport: {
    steps: [
      '상황 텍스트 합성 (템플릿 채움)…',
      'embedding 생성 (text-embedding-3-small)…',
      'Vector DB incident_embeddings 적재 (outcome=normal_pattern)…',
      '간단 보고서 작성…',
    ],
    vectorDbStored: {
      embeddingTemplate:
        '[서비스] billing-settlement-batch / batch / ec2_asg_spot / nightly_batch\n' +
        '[시각컨텍스트] 02:17 KST / 배치실행구간\n' +
        '[이상신호]\n' +
        '- cpu_usage_pct: 84 (baseline 55, 1.5배 초과)\n' +
        '[동시알람] 4개 — CpuUsageHigh, SpotStealTime, BatchProgressInfo, PatternMatched\n' +
        '[SLA영향] Correctness: Budget 잔량 98.5% / normal\n' +
        '[배포이력] 최근 6시간 변경 없음',
      outcomeLabel: 'normal_pattern',
      patternLabel: 'recurring_auto_resolve',
    },
    summary: '정상 범위 내 반복 패턴으로 판단. RCA 불필요.',
    evidence: {
      pattern: '30일간 12회 동일 알람 발생, 자동 회복률 100% (정렬 단계 정상 패턴)',
      burnRate: 'normal (0.1×) — SLA 위반 위험 없음',
      maxDeviation: 'cpu_usage_pct 1.5배 (임계 5배 미만)',
    },
    action: '모니터링 유지. 02:48 KST 정상 완료 예상.',
    reportId: 'inc-20260618-0003',
  },

  conclusion: 'SLA 영향 없음 — 정렬 단계 정상 패턴, 06:00 마감까지 3h 13m 여유',
};

// ─────────────────────────────────────────────────────────────
// Scenario B — Subscription POST /subscriptions (Critical, deep_analysis)
// ─────────────────────────────────────────────────────────────
export const SUBSCRIPTION_CRITICAL_BLUEPRINT: TriageStageBlueprint = {
  scenarioId: 'subscription-critical',
  totalElapsedDisplayLabel: '32초',
  totalElapsedDisplayMs: 32_000,
  step1DisplayMs: 8_000,
  step2DisplayMs: 6_000,
  step3DisplayMs: 2_000,
  step4DisplayMs: 10_000,
  step5DisplayMs: 6_000,

  step1: {
    trigger: {
      ts: '14:32:08',
      alertName: 'HighLatencyP95',
      severity: 'critical',
      serviceId: 'subscription-api',
      serviceName: 'Subscription API (POST /subscriptions)',
      metric: 'latency_p95_ms',
      threshold: 300,
      currentValue: 1240,
      unit: 'ms',
      message: 'POST /subscriptions p95 latency 임계치 초과',
    },
    severityStrategy: 'Critical → 즉시 그룹 확정 + 2분 병합 윈도우',
    windowDurationLabel: '2분 병합 윈도우',
    arrivingAlarms: [
      { ts: '14:32:09', alertName: 'ErrorRateSpike',      severity: 'critical', metric: 'error_rate',     threshold: 0.01, currentValue: 0.041, unit: '',     message: '5xx 오류율 임계치 초과' },
      { ts: '14:32:13', alertName: 'DBPoolExhaustion',    severity: 'critical', metric: 'db_pool_active', threshold: 45,   currentValue: 48,    unit: 'conn', message: 'HikariPool 포화 임계치 초과' },
      { ts: '14:32:16', alertName: 'ErrorBudgetFastBurn', severity: 'critical', metric: 'burn_rate',      threshold: 4,    currentValue: 14.4,  unit: '×',    message: 'Error Budget fast burn 감지' },
    ],
    representativeSeverity: 'critical',
    serviceMap: {
      nodes: [
        { id: 'portal',  name: 'Customer Portal',  status: 'healthy',  x: 20,  y: 165 },
        { id: 'sub-api', name: 'Subscription API', status: 'critical', x: 210, y: 55  },
        { id: 'chatbot', name: 'AI Chatbot',       status: 'healthy',  x: 210, y: 165 },
        { id: 'billing', name: 'Billing Batch',    status: 'healthy',  x: 210, y: 275 },
        { id: 'mariadb', name: 'MariaDB',          status: 'critical', x: 400, y: 165 },
      ],
      edges: [
        { from: 'portal',  to: 'sub-api' },
        { from: 'portal',  to: 'chatbot' },
        { from: 'portal',  to: 'billing' },
        { from: 'sub-api', to: 'mariadb' },
        { from: 'billing', to: 'mariadb' },
      ],
    },
  },

  step2: {
    alarmHistory: {
      steps: [
        'RDB alarm_history 조회 (service_id=subscription-api, 30일 윈도우)…',
        'HighLatencyP95 / DBPoolExhaustion 알람 occurrence 집계…',
        '자동 회복 비율 계산…',
        'pattern_label 분류…',
      ],
      occurrenceCount: 3,
      avgDurationSec: 1860,
      autoResolveRatio: 0.0,
      lastOccurrence: '2026-06-01 11:48 KST',
      patternLabel: 'recurring_escalated',
      patternLabelKo: '반복 발생 · Incident 전환 이력',
      patternBasis: '30일간 3회 발생 · 모두 운영자 개입으로 종결 (pool size up + scale-out 패턴)',
    },
    slaStatus: {
      steps: [
        'RDB sla_items + error_budgets JOIN 조회…',
        '잔여 Budget 계산…',
        'fast burn rate 감지…',
        '위반 예상 시점 산출 (월 4.4분 Budget 중 0.37분 잔량)…',
      ],
      items: [
        {
          itemId: 'sla-subscription-post-availability',
          category: 'Availability',
          targetLabel: '≥ 99.99%',
          budgetRemainingPct: 8.5,
          burnRateState: 'fast',
          burnRateValue: 14.4,
          violationEta: '22초 후 위반',
          alertLevel: 'level2 (emergency)',
        },
        {
          itemId: 'sla-subscription-post-latency',
          category: 'Latency p95',
          targetLabel: '≤ 300ms',
          budgetRemainingPct: 0,
          burnRateState: 'critical_breach',
          burnRateValue: 4.13,
          violationEta: '이미 위반 (1240ms)',
          alertLevel: 'level2 (emergency)',
        },
      ],
      estimatedViolationAt: '2026-06-18T14:32:30Z',
    },
    metricSnapshot: {
      steps: [
        'Prometheus 메트릭 메타 조회…',
        'service_meta.monitoring_metrics 로 수집 대상 결정…',
        '5분 윈도우 PromQL 쿼리 실행…',
        '7일 baseline 비교 · deviation_ratio 계산 (410× 감지)…',
      ],
      snapshotAt: '2026-06-18 14:32:00 KST',
      metrics: [
        { name: 'latency_p95_ms', label: 'POST /subscriptions p95',     current: 1240,  baseline: 220,    deviationRatio: 5.6,   unit: 'ms' },
        { name: 'error_rate',     label: '5xx Error Rate',              current: 0.041, baseline: 0.0001, deviationRatio: 410.0, unit: '' },
        { name: 'db_pool_active', label: 'HikariPool Active Connections', current: 48,  baseline: 18,     deviationRatio: 2.7,   unit: 'conn' },
      ],
      maxDeviationRatio: 410.0,
    },
  },

  step3: {
    steps: [
      'Step 2 정적 분석 결과 fan-in…',
      'burn rate 체크 — fast 14.4× 감지…',
      '판단: fast burn 즉시 심층 분석 (이상 이력 / 편차 체크 생략 가능)…',
      'route 결정 — deep_analysis…',
    ],
    burnRateCheck:  { label: 'burn rate',       value: 'fast 14.4× (정상 1.0×)',                     judgment: '심층 분석',     triggersDeep: true },
    patternCheck:   { label: '이상 이력 패턴',     value: 'recurring_escalated (3회 / 자동회복 0%)',     judgment: '심층 분석',     triggersDeep: true },
    deviationCheck: { label: '메트릭 편차',       value: '최대 410× (error_rate, 5배 이상)',           judgment: '심층 분석',     triggersDeep: true },
    riskLevel: 'critical',
    route: 'deep_analysis',
    reasons: [
      'burn_rate: fast (14.4×) — 22초 내 SLA 위반 임박',
      'pattern: recurring_escalated (30일간 3회, 자동회복 0%, 모두 운영자 개입)',
      'max_deviation_ratio: 410.0 (error_rate, 5배 이상)',
    ],
  },

  step4Type: 'deep_analysis',
  deepAnalysis: {
    notification: {
      steps: [
        '운영자 알림 페이로드 생성…',
        'Slack #ops-critical 채널 전파…',
        'block kit 메시지 작성 (이슈 요약 + 행동 버튼)…',
      ],
      channel: '#ops-critical',
      messagePreview:
        ':rotating_light: CRITICAL TRIAGE — Subscription API (POST /subscriptions)\n' +
        '`inc-demo-subscription-001` · Error Budget 8.5% 잔량 · fast burn 14.4×\n' +
        '위반 ETA 22초 · Top Cause 후보: db_connection_pool_exhaustion',
      sentAt: '2026-06-18 14:32:11 KST',
      mentionLabel: '@channel',
    },
    logCollection: {
      steps: [
        'Loki HTTP API 호출 (service="subscription-api", level=ERROR|WARN)…',
        '시간 윈도우 적용 (알람 시점 -30m ~ +5m)…',
        '로그 정규화 (인스턴스 ID / 타임스탬프 제거)…',
        'log_patterns 적재 (confirmed_cause=null)…',
      ],
      queryPreview: '{service="subscription-api"} |= "ERROR" or "WARN"',
      windowLabel: '14:02 ~ 14:37 (35분)',
      totalCount: 142,
      errorCount: 96,
      warnCount: 46,
      samples: [
        { ts: '14:31:42', level: 'ERROR', service: 'subscription-api-2', message: 'POST /subscriptions 500 — HikariPool-1 Connection is not available, request timed out after 30000ms', occurrence: 42 },
        { ts: '14:31:55', level: 'ERROR', service: 'subscription-api-3', message: 'org.hibernate.exception.JDBCConnectionException: Unable to acquire JDBC Connection',             occurrence: 31 },
        { ts: '14:32:02', level: 'ERROR', service: 'subscription-api-1', message: 'POST /subscriptions 503 — upstream connection pool exhausted',                                  occurrence: 18 },
        { ts: '14:31:48', level: 'WARN',  service: 'subscription-api-2', message: 'HikariPool-1 - Thread starvation or clock leap detected (wait queue depth=27)',                  occurrence: 9 },
      ],
    },
    traceCollection: {
      steps: [
        'Tempo HTTP API search (min_duration=1s, limit=20)…',
        'P95 이상 느린 트레이스 필터…',
        '병목 span 추출…',
      ],
      queryPreview: 'service=subscription-api, min_duration=1s, time=±10m',
      totalCount: 14,
      slowSpans: [
        { traceId: 'a7f4c2b9', span: 'subscription.create.db.acquire',     durationMs: 28400, baselineMs: 12,  description: 'HikariPool connection 획득 대기 (timeout 30s 직전)' },
        { traceId: 'b3e7d1a4', span: 'subscription.create.tx.insert',      durationMs: 1180,  baselineMs: 95,  description: '트랜잭션 insert 12× 지연' },
        { traceId: 'c2f9a8b6', span: 'subscription.create.db.commit',      durationMs: 420,   baselineMs: 18,  description: 'commit phase 23× 지연' },
      ],
    },
    vectorSearch: {
      steps: [
        '상황 텍스트 합성 (템플릿 채움)…',
        'embedding 생성 (text-embedding-3-small)…',
        'incident_embeddings 검색 (top_k=5, service_type filter)…',
        '유사도 0.7 이상 평가…',
      ],
      situationText:
        '[서비스] subscription-api / api / ecs_fargate / business_hours_peak\n' +
        '[시각컨텍스트] 14:32 KST / 일반운영시간\n' +
        '[이상신호]\n' +
        '- latency_p95_ms: 1240 (baseline 220, 5.6배 초과)\n' +
        '- error_rate: 0.041 (baseline 0.0001, 410배 초과)\n' +
        '- db_pool_active: 48 (baseline 18, 2.7배 초과)\n' +
        '[동시알람] 4개 — HighLatencyP95, ErrorRateSpike, DBPoolExhaustion, ErrorBudgetFastBurn\n' +
        '[SLA영향] Availability: Budget 잔량 8.5% / fast\n' +
        '[배포이력] 최근 6시간 변경 없음',
      topCauseKey: 'db_connection_pool_exhaustion',
      topCauseLabel: 'DB Connection Pool 고갈',
      confidence: 0.89,
      basis: '유사 사태 3건 모두 동일 원인. HikariPool 부족으로 인한 connection wait → 5xx burst → 동일 해결책(pool size up)',
      similarIncidents: [
        { incidentId: 'inc-20260601-0027', similarity: 0.91, occurredAt: '2026-06-01 11:18', timeContext: '프로모션 시간', resolution: 'db_pool_size_up',         confirmedCause: 'db_connection_pool_exhaustion', summary: 'HikariPool 50→100 상향 + RDS instance class up 으로 30분 내 회복' },
        { incidentId: 'inc-20260512-0019', similarity: 0.87, occurredAt: '2026-05-12 15:42', timeContext: '업무시간 피크', resolution: 'db_pool_size_up',         confirmedCause: 'db_connection_pool_exhaustion', summary: 'pool size up + ECS scale-out 으로 35분 회복' },
        { incidentId: 'inc-20260408-0013', similarity: 0.83, occurredAt: '2026-04-08 11:05', timeContext: '프로모션 시간', resolution: 'db_connection_pool_reset', confirmedCause: 'db_connection_pool_exhaustion', summary: 'HikariPool 강제 reset + size up 으로 25분 회복' },
      ],
    },
  },

  step5: {
    steps: [
      'Vector DB 결과에서 원인 빈도 집계…',
      '로그 패턴 매칭으로 가설 검증…',
      '트레이스 병목 span 결합…',
      '권장 조치 도출 (immediate + iac_change 분리)…',
      'RCA 핸드오프 결정…',
      '보고서 직렬화 + 저장…',
    ],
    reportId: 'inc-demo-subscription-001',
    topHypothesisKey: 'db_connection_pool_exhaustion',
    topHypothesisLabel: 'DB Connection Pool 고갈',
    hypothesisConfidence: 0.89,
    hypothesisBasis: '유사 사태 3건 중 3건 동일 원인. 로그(HikariPool timeout 42회, Unable to acquire JDBC 31회) + 트레이스(db.acquire 28.4s)로 다중 채널 확증.',
    logEvidence: [
      'HikariPool - Connection is not available, request timed out after 30000ms (42회)',
      'Unable to acquire JDBC Connection (31회)',
      'POST /subscriptions 503 — upstream connection pool exhausted (18회)',
      'HikariPool-1 - Thread starvation, wait queue depth=27',
    ],
    traceBottleneck: {
      span: 'subscription.create.db.acquire',
      avgDurationMs: 28400,
      baselineMs: 12,
    },
    recommendedActions: [
      {
        title: 'HikariPool 강제 reset (api-2 / api-3)',
        description: '포화된 HikariPool 을 워커별로 즉시 초기화하고 wait queue(27)를 비웁니다.',
        risk: 'Low',
        type: 'immediate',
        rationale: '유사 사태 3건 모두 동일 조치 적용 — 단기 5xx 차단',
        estimatedRecoveryMinutes: 3,
      },
      {
        title: 'ECS Service Scale-out (3 → 5 task)',
        description: 'task 확장으로 connection demand 를 task 간 분산해 단기 압력 해소.',
        risk: 'Low',
        type: 'immediate',
        rationale: 'task 당 pool 점유 한계 근접',
        estimatedRecoveryMinutes: 5,
      },
      {
        title: 'HikariPool maximumPoolSize 50 → 100',
        description: 'application.yml + RDS max_connections 동시 상향. IaC PR → ArgoCD 30분 내 적용.',
        risk: 'Medium',
        type: 'iac_change',
        rationale: '재발 방지 — 과거 3건 동일 패턴 모두 pool size up 으로 종결',
      },
      {
        title: 'RDS instance class up (r6g.large → r6g.xlarge)',
        description: 'connection 100 수용을 위한 메모리 확보. read replica 활용으로 다운타임 없음.',
        risk: 'High',
        type: 'iac_change',
        rationale: 'max_connections 상향만으로는 메모리 부족 위험',
      },
    ],
    handoff: {
      toRca: true,
      mode: 'hypothesis_first',
      reason: 'Critical 우선순위 + Vector 가설(db_connection_pool_exhaustion) 신뢰도 0.89 → RCA 자동 진입. 가설을 먼저 검증.',
      slackChannel: '#ops-critical',
    },
  },

  conclusion: 'Error Budget 8.5% 잔량 · 22초 내 위반 임박 · DB connection pool 고갈 가설',
};

// incidentId 로 시나리오 블루프린트 선택
export function selectTriageBlueprint(incidentId: string): TriageStageBlueprint {
  if (incidentId.startsWith('inc-demo-subscription')) return SUBSCRIPTION_CRITICAL_BLUEPRINT;
  return BILLING_LOW_BLUEPRINT;
}
