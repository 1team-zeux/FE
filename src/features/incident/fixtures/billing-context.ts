// 시나리오별 컨텍스트 데이터 — 시계열 / 로그 / 인프라 / 노드 결과 / 스트림
// Billing(Low, SLA OK) + Subscription(Critical, POST /subscriptions DB pool 고갈)

// 메트릭 시계열 — 30분 윈도우, 1분 간격 (총 30개 데이터 포인트)
// idx 0 = 30분 전, idx 29 = 알람 발생 직전
export interface MetricTimeseries {
  name: string;
  label: string;
  unit: string;
  current: number;
  baseline: number;
  deviationRatio: number;
  series: number[];        // 30개 포인트
  breachFrom?: number;     // 임계값 초과 시작 인덱스
  alarmIdx?: number;       // 알람 발생 인덱스
}

// 시계열 생성 헬퍼 — baseline 근처 → 점진 변화 패턴
const buildSeries = (baseline: number, current: number, breachAt: number, jitter = 0.1): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 30; i++) {
    let v: number;
    if (i < breachAt) {
      v = baseline * (1 + (Math.random() - 0.5) * jitter);
    } else {
      const ratio = (i - breachAt) / (29 - breachAt);
      v = baseline + (current - baseline) * Math.min(ratio * 1.3, 1);
    }
    out.push(Number(v.toFixed(baseline < 1 ? 4 : 1)));
  }
  return out;
};

// 정상 진행 곡선 — 0%→47% 선형 증가 (배치 진행률)
const buildProgressSeries = (target: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 30; i++) {
    const v = (target * i) / 29 + (Math.random() - 0.5) * 0.4;
    out.push(Number(Math.max(0, v).toFixed(1)));
  }
  return out;
};

// ─────────────────────────────────────────────────────────────
// BILLING (Low) — CPU spike but SLA OK
// ─────────────────────────────────────────────────────────────

export const BILLING_METRIC_SERIES: MetricTimeseries[] = [
  {
    name: 'cpu_usage_pct',
    label: 'CPU Usage',
    unit: 'percent',
    current: 84,
    baseline: 55,
    deviationRatio: 1.5,
    series: buildSeries(55, 84, 22, 0.12),
    breachFrom: 22,
    alarmIdx: 26,
  },
  {
    name: 'batch_progress_pct',
    label: 'Batch Progress',
    unit: 'percent',
    current: 47,
    baseline: 50,
    deviationRatio: 0.94,
    series: buildProgressSeries(47),
    // breach 없음 — 정상 진행
  },
  {
    name: 'error_rate',
    label: 'Error Rate',
    unit: 'ratio',
    current: 0.0008,
    baseline: 0.001,
    deviationRatio: 0.8,
    series: buildSeries(0.001, 0.0008, 28, 0.3),
    // breach 없음 — baseline 이하
  },
];

// Loki 로그 샘플 — INFO/WARN only (ERROR 없음, SLA 영향 없음)
export interface LogSample {
  ts: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  service: string;
  message: string;
  occurrence?: number;
}

export const BILLING_LOG_SAMPLES: LogSample[] = [
  { ts: '02:16:12', level: 'INFO', service: 'billing-worker-1', message: 'settlement batch progress 42/100 records (42.0%) — sorting phase started' },
  { ts: '02:16:33', level: 'INFO', service: 'billing-worker-2', message: 'sort-merge join in progress (chunk 12/27)' },
  { ts: '02:16:45', level: 'WARN', service: 'billing-worker-2', message: 'GC pause 312ms (G1 Mixed, within tolerance < 500ms)', occurrence: 3 },
  { ts: '02:16:51', level: 'WARN', service: 'billing-worker-3', message: 'CPU steal time 4.1% — Spot host noisy neighbour suspected', occurrence: 2 },
  { ts: '02:17:03', level: 'INFO', service: 'billing-worker-1', message: 'settlement batch progress 47/100 records (47.0%)' },
  { ts: '02:17:08', level: 'INFO', service: 'billing-worker-2', message: 'HikariPool active=12 idle=8 wait=0 — normal' },
  { ts: '02:17:15', level: 'INFO', service: 'billing-coordinator', message: 'ETA to completion: 02:48 KST (16% buffer before 06:00 deadline)' },
];

// 인프라 상태 시계열 — RDS connection 정상, ASG 정상
export interface InfraSnapshot {
  ts: string;
  rdsConnections: number;
  rdsMax: number;
  asgRunning: number;
  asgDesired: number;
  spotEvent?: 'interrupted' | 'replacing';
}

export const BILLING_INFRA_TIMELINE: InfraSnapshot[] = [
  { ts: '01:50', rdsConnections: 42, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '02:00', rdsConnections: 48, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '02:05', rdsConnections: 55, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '02:10', rdsConnections: 61, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '02:13', rdsConnections: 65, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '02:15', rdsConnections: 70, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '02:16', rdsConnections: 74, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '02:17', rdsConnections: 78, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
];

// 노드별 작업 결과 요약 (Section D: 노드 결과 카드)
export interface NodeResult {
  nodeKey: string;
  nodeName: string;
  status: 'done' | 'failed';
  summaryHeadline: string;
  highlights: Array<{ label: string; value: string; state?: 'critical' | 'warning' | 'healthy' | 'normal' }>;
  detailRows?: string[];
}

export const BILLING_NODE_RESULTS: NodeResult[] = [
  {
    nodeKey: 'prometheus',
    nodeName: 'PrometheusNode',
    status: 'done',
    summaryHeadline: 'CPU 1.5× · 진행률 정상 · error_rate 정상',
    highlights: [
      { label: 'cpu',           value: '1.5×',  state: 'warning' },
      { label: 'progress',      value: '47/100', state: 'normal' },
      { label: 'error_rate',    value: '0.8×',  state: 'normal' },
    ],
    detailRows: [
      'cpu_usage_pct: 84 (baseline 55) — 정렬 단계 정상 패턴',
      'batch_progress: 47/100 records (계획선 50% 대비 ETA 02:48 KST)',
      'error_rate: 0.0008 (baseline 0.001) — 정상 이하',
    ],
  },
  {
    nodeKey: 'service_meta',
    nodeName: 'ServiceMetaNode',
    status: 'done',
    summaryHeadline: 'Tier2 Correctness 99.99% · Budget 98.5% · normal burn',
    highlights: [
      { label: 'service',  value: 'batch',        state: 'normal' },
      { label: 'SLA',      value: '99.99%',       state: 'normal' },
      { label: 'burn',     value: 'normal 0.1×',  state: 'normal' },
    ],
    detailRows: [
      '서비스 유형: batch / nightly_settlement',
      'SLA 항목: Correctness ≥ 99.99% (Tier 2)',
      'Budget 잔량: 98.5% · 06:00 마감까지 3h 13m 여유',
    ],
  },
  {
    nodeKey: 'aws_infra',
    nodeName: 'AWSInfraNode',
    status: 'done',
    summaryHeadline: 'ASG 4/4 · RDS 78/200 (39%) · Spot 정상',
    highlights: [
      { label: 'ASG',           value: '4/4',     state: 'normal' },
      { label: 'RDS conn',      value: '78/200',  state: 'normal' },
      { label: 'Spot',          value: '정상',     state: 'normal' },
    ],
    detailRows: [
      'ASG desired 4, running 4 — 모든 인스턴스 정상',
      'RDS connection: 78/200 (39%) · 여유 충분',
      '최근 배포: 없음 (최근 6시간)',
    ],
  },
  {
    nodeKey: 'vector_search',
    nodeName: 'VectorSearchNode',
    status: 'done',
    summaryHeadline: '유사 4건 모두 자동 정상화 · CPU spike 정상 패턴',
    highlights: [
      { label: 'similar',    value: '4건',                state: 'normal' },
      { label: 'top cause',  value: 'cpu_normal_pattern', state: 'normal' },
      { label: 'avg sim',    value: '0.81',               state: 'normal' },
    ],
    detailRows: [
      '#1: inc-20260518 (sim 0.88) → auto_recovered',
      '#2: inc-20260420 (sim 0.83) → auto_recovered',
      '#3: inc-20260322 (sim 0.79) → auto_recovered',
      '#4: inc-20260225 (sim 0.74) → auto_recovered',
    ],
  },
  {
    nodeKey: 'sla_impact',
    nodeName: 'SLAImpactNode',
    status: 'done',
    summaryHeadline: 'SLA 영향 없음 · 우선순위 Low',
    highlights: [
      { label: 'priority',    value: 'Low',     state: 'normal' },
      { label: 'EB 잔량',      value: '98.5%',   state: 'normal' },
      { label: '마감까지',      value: '3h 13m',  state: 'normal' },
    ],
    detailRows: [
      'burn_rate 0.1× · normal',
      '06:00 KST 마감 대비 ETA 02:48 (16% buffer)',
      'user impact: 없음 — 정산 처리율 정상',
    ],
  },
  {
    nodeKey: 'handoff',
    nodeName: 'HandoffDecisionNode',
    status: 'done',
    summaryHeadline: 'RCA 미진입 · 자율 모니터링 유지',
    highlights: [
      { label: 'to RCA',    value: 'no',                   state: 'normal' },
      { label: 'mode',      value: 'monitor',              state: 'normal' },
      { label: 'top cause', value: 'cpu_normal_pattern',   state: 'normal' },
    ],
    detailRows: [
      'Low 우선순위 → RCA 미진입',
      '자동 회복 가능 패턴 — 다음 폴링 사이클까지 자율 모니터링',
    ],
  },
];

// SSE 스트림 모의 라인 (Low 결론 흐름) — Console 토글 시 사용
export const BILLING_STREAM_LINES: string[] = [
  '$ Triage Agent 시작 (correlation_group_id=grp-demo-billing-001)',
  '✓ AlarmGroupNode — 4개 알람 그룹 확정 (metric 3, log 1)',
  '  » fan-out: PrometheusNode / ServiceMetaNode / AWSInfraNode 병렬 실행',
  '✓ PrometheusNode — CPU 1.5× spike. 진행률/error_rate 정상',
  '✓ ServiceMetaNode — Tier 2 Correctness 99.99% / Budget 98.5% / normal burn',
  '✓ AWSInfraNode — ASG 4/4 / RDS 78/200 (39%) / Spot 정상',
  '  » fan-in 완료 — situation 합성 시작',
  '✓ SituationSynthesisNode — 상황 텍스트 합성 (420자, "정상 배치 진행")',
  '✓ VectorSearchNode — 유사 사태 4건 모두 자동 정상화 (CPU spike는 정렬 단계 정상 패턴)',
  '✓ SLAImpactNode — SLA 영향 없음. 우선순위: Low',
  '✓ AssessmentNode — Assessment 저장 완료 (provisional, id=assess-demo-billing-001)',
  '✓ HandoffDecisionNode — RCA 미진입 (자율 모니터링)',
  '$ Triage Agent 완료 (4.2s)',
];

// ─────────────────────────────────────────────────────────────
// SUBSCRIPTION (Critical) — POST /subscriptions DB pool 고갈
// ─────────────────────────────────────────────────────────────

export const SUBSCRIPTION_METRIC_SERIES: MetricTimeseries[] = [
  {
    name: 'latency_p95_ms',
    label: 'POST /subscriptions p95 Latency',
    unit: 'ms',
    current: 1240,
    baseline: 220,
    deviationRatio: 5.6,
    series: buildSeries(220, 1240, 22, 0.15),
    breachFrom: 22,
    alarmIdx: 25,
  },
  {
    name: 'error_rate',
    label: 'Error Rate (5xx)',
    unit: 'ratio',
    current: 0.041,
    baseline: 0.0001,
    deviationRatio: 410.0,
    series: buildSeries(0.0001, 0.041, 24, 0.5),
    breachFrom: 24,
    alarmIdx: 26,
  },
  {
    name: 'db_pool_active',
    label: 'HikariPool Active Connections',
    unit: 'connections',
    current: 48,
    baseline: 18,
    deviationRatio: 2.7,
    series: buildSeries(18, 48, 21, 0.18),
    breachFrom: 21,
    alarmIdx: 24,
  },
];

export const SUBSCRIPTION_LOG_SAMPLES: LogSample[] = [
  { ts: '14:31:42', level: 'ERROR', service: 'subscription-api-2', message: 'POST /subscriptions 500 — HikariPool-1 - Connection is not available, request timed out after 30000ms', occurrence: 42 },
  { ts: '14:31:48', level: 'WARN',  service: 'subscription-api-2', message: 'HikariPool-1 - Thread starvation or clock leap detected (wait queue depth=27)', occurrence: 9 },
  { ts: '14:31:55', level: 'ERROR', service: 'subscription-api-3', message: 'org.hibernate.exception.JDBCConnectionException: Unable to acquire JDBC Connection', occurrence: 31 },
  { ts: '14:32:02', level: 'ERROR', service: 'subscription-api-1', message: 'POST /subscriptions 503 — upstream connection pool exhausted', occurrence: 18 },
  { ts: '14:32:08', level: 'WARN',  service: 'sla-agent',          message: 'ErrorBudget fast burn 14.4× — alerting (sla-subscription-post-availability)', occurrence: 1 },
  { ts: '14:32:14', level: 'ERROR', service: 'subscription-api-2', message: 'CreateSubscriptionService: rollback after 30s wait — DataAccessResourceFailureException' },
  { ts: '14:32:21', level: 'ERROR', service: 'subscription-api-3', message: '5xx burst 4.1% of last 60s requests (812/19828)', occurrence: 1 },
];

export const SUBSCRIPTION_INFRA_TIMELINE: InfraSnapshot[] = [
  { ts: '14:05', rdsConnections: 14, rdsMax: 50, asgRunning: 3, asgDesired: 3 },
  { ts: '14:10', rdsConnections: 17, rdsMax: 50, asgRunning: 3, asgDesired: 3 },
  { ts: '14:15', rdsConnections: 19, rdsMax: 50, asgRunning: 3, asgDesired: 3 },
  { ts: '14:20', rdsConnections: 24, rdsMax: 50, asgRunning: 3, asgDesired: 3 },
  { ts: '14:25', rdsConnections: 34, rdsMax: 50, asgRunning: 3, asgDesired: 3 },
  { ts: '14:28', rdsConnections: 41, rdsMax: 50, asgRunning: 3, asgDesired: 3 },
  { ts: '14:30', rdsConnections: 46, rdsMax: 50, asgRunning: 3, asgDesired: 3 },
  { ts: '14:32', rdsConnections: 48, rdsMax: 50, asgRunning: 3, asgDesired: 3 },
];

export const SUBSCRIPTION_NODE_RESULTS: NodeResult[] = [
  {
    nodeKey: 'prometheus',
    nodeName: 'PrometheusNode',
    status: 'done',
    summaryHeadline: '메트릭 3개 수집 · 최대 편차 410× (error_rate)',
    highlights: [
      { label: 'error_rate',  value: '410×',  state: 'critical' },
      { label: 'latency p95', value: '5.6×',  state: 'critical' },
      { label: 'db_pool',     value: '2.7×',  state: 'warning' },
    ],
    detailRows: [
      'error_rate: 0.041 (baseline 0.0001)',
      'latency_p95: 1240ms (baseline 220ms) — SLA 300ms 위반',
      'db_pool_active: 48 (baseline 18, pool size 50)',
    ],
  },
  {
    nodeKey: 'service_meta',
    nodeName: 'ServiceMetaNode',
    status: 'done',
    summaryHeadline: 'Tier 1 POST /subscriptions 99.99% · Budget 8.5% · fast 14.4×',
    highlights: [
      { label: 'service',  value: 'api',           state: 'normal' },
      { label: 'SLA',      value: '99.99%',        state: 'critical' },
      { label: 'burn',     value: 'fast 14.4×',    state: 'critical' },
    ],
    detailRows: [
      '서비스 유형: api / Subscription API (POST /subscriptions)',
      'SLA: Availability 99.99% (월 4.4분 Budget) · Latency p95 ≤ 300ms',
      'Budget 잔량: 8.5% (0.37분 남음) · fast burn 14.4×',
    ],
  },
  {
    nodeKey: 'aws_infra',
    nodeName: 'AWSInfraNode',
    status: 'done',
    summaryHeadline: 'ECS 3/3 healthy · DB pool 48/50 (96%) 포화',
    highlights: [
      { label: 'ECS',           value: '3/3',    state: 'normal' },
      { label: 'DB pool',       value: '48/50',  state: 'critical' },
      { label: 'wait queue',    value: '27',     state: 'critical' },
    ],
    detailRows: [
      'ECS desired 3, running 3 — 인스턴스는 정상',
      'HikariPool: active 48 / max 50 (96%), wait queue 27',
      '최근 배포: 없음 (최근 6시간)',
    ],
  },
  {
    nodeKey: 'vector_search',
    nodeName: 'VectorSearchNode',
    status: 'done',
    summaryHeadline: '유사 3건 전부 동일 원인 · db_connection_pool_exhaustion',
    highlights: [
      { label: 'similar',    value: '3건',                 state: 'warning' },
      { label: 'top cause',  value: 'db_pool_exhaustion',  state: 'critical' },
      { label: 'avg sim',    value: '0.87',                state: 'warning' },
    ],
    detailRows: [
      '#1: inc-20260601 (sim 0.91) → db_pool_size_up',
      '#2: inc-20260512 (sim 0.87) → db_pool_size_up',
      '#3: inc-20260408 (sim 0.83) → db_pool_size_up',
    ],
  },
  {
    nodeKey: 'sla_impact',
    nodeName: 'SLAImpactNode',
    status: 'done',
    summaryHeadline: '위반 예상 22초 · 우선순위 Critical',
    highlights: [
      { label: 'priority',    value: 'Critical', state: 'critical' },
      { label: '위반까지',      value: '22초',     state: 'critical' },
      { label: '영향',          value: '가입실패', state: 'critical' },
    ],
    detailRows: [
      'budget 8.5% × 4.4분 ÷ 14.4× = 0.37분 ≈ 22초',
      'latency p95 1240ms 이미 300ms SLA 위반 상태',
      'user impact: 신규 가입 실패 — POST /subscriptions 4.1% 5xx',
    ],
  },
  {
    nodeKey: 'handoff',
    nodeName: 'HandoffDecisionNode',
    status: 'done',
    summaryHeadline: 'RCA 자동 진입 · hypothesis_first · Slack #zeux 전파',
    highlights: [
      { label: 'to RCA',    value: 'yes',                  state: 'critical' },
      { label: 'mode',      value: 'hypothesis_first',     state: 'warning' },
      { label: 'Slack',     value: '#zeux',        state: 'critical' },
    ],
    detailRows: [
      'Critical 우선순위 → RCA 자동 진입',
      'Vector hint 가설(db_connection_pool_exhaustion)을 먼저 검증',
      'Slack #zeux 채널에 @channel 전파 완료',
    ],
  },
];

export const SUBSCRIPTION_STREAM_LINES: string[] = [
  '$ Triage Agent 시작 (correlation_group_id=grp-demo-subscription-001)',
  '✓ AlarmGroupNode — 6개 알람 그룹 확정 (metric 4, log 1, trace 1)',
  '  » fan-out: PrometheusNode / ServiceMetaNode / AWSInfraNode 병렬 실행',
  '✓ PrometheusNode — 메트릭 3개 수집. 최대 편차: error_rate 410× (current 0.041 vs baseline 0.0001)',
  '✓ ServiceMetaNode — Tier 1 POST /subscriptions 99.99% / Budget 8.5% / fast 14.4×',
  '✓ AWSInfraNode — ECS 3/3 healthy / HikariPool 48/50 (96%) wait queue 27',
  '  » fan-in 완료 — situation 합성 시작',
  '✓ SituationSynthesisNode — 상황 텍스트 합성 (520자, "DB connection pool 고갈")',
  '✓ VectorSearchNode — 유사 사태 3건 발견 (전부 db_connection_pool_exhaustion, 평균 유사도 0.87)',
  '✓ SLAImpactNode — 위반 예상까지 22초. 우선순위: Critical',
  '✓ AssessmentNode — Assessment 저장 완료 (provisional, id=assess-demo-subscription-001)',
  '✓ HandoffDecisionNode — RCA 자동 진입 + Slack #zeux 채널 @channel 전파',
  '$ Triage Agent 완료 (2.1s)',
];

// ─────────────────────────────────────────────────────────────
// SURGE (Critical) — 트래픽 6.2× / ECS 처리 용량 부족
// ─────────────────────────────────────────────────────────────

export const SURGE_METRIC_SERIES: MetricTimeseries[] = [
  {
    name: 'request_rate',
    label: '요청량 (RPS)',
    unit: 'req/s',
    current: 3000,
    baseline: 500,
    deviationRatio: 6.2,
    series: buildSeries(500, 3000, 22, 0.12),
    breachFrom: 22,
    alarmIdx: 25,
  },
  {
    name: 'cpu_util',
    label: 'CPU 사용률',
    unit: '%',
    current: 95,
    baseline: 40,
    deviationRatio: 2.4,
    series: buildSeries(40, 95, 23, 0.1),
    breachFrom: 23,
    alarmIdx: 25,
  },
  {
    name: 'latency_p95_ms',
    label: 'p95 응답시간',
    unit: 'ms',
    current: 1200,
    baseline: 80,
    deviationRatio: 15.0,
    series: buildSeries(80, 1200, 23, 0.15),
    breachFrom: 23,
    alarmIdx: 26,
  },
  {
    name: 'error_rate',
    label: '5xx 오류율',
    unit: 'ratio',
    current: 0.08,
    baseline: 0.001,
    deviationRatio: 80.0,
    series: buildSeries(0.001, 0.08, 24, 0.4),
    breachFrom: 24,
    alarmIdx: 26,
  },
];

export const SURGE_LOG_SAMPLES: LogSample[] = [
  { ts: '14:32:03', level: 'ERROR', service: 'subscription-api-1', message: 'request queue full, rejecting incoming request (HTTP 503)', occurrence: 38 },
  { ts: '14:32:04', level: 'ERROR', service: 'subscription-api-2', message: 'request queue full, rejecting incoming request (HTTP 503)', occurrence: 42 },
  { ts: '14:32:05', level: 'ERROR', service: 'subscription-api-3', message: '5xx response — capacity exceeded (queue depth 218 / max 50)', occurrence: 18 },
  { ts: '14:32:06', level: 'WARN',  service: 'alb-controller',     message: 'target response time exceeded p95 threshold (1100ms / target 500ms)', occurrence: 9 },
  { ts: '14:32:08', level: 'WARN',  service: 'sla-agent',          message: 'ErrorBudget fast burn 14.4× — alerting (sla-subscription-availability)', occurrence: 1 },
  { ts: '14:32:11', level: 'ERROR', service: 'subscription-api-1', message: 'task handler timeout — queue wait > 30s', occurrence: 12 },
  { ts: '14:32:14', level: 'WARN',  service: 'ecs-agent',          message: 'task-3 memory pressure detected (84% / threshold 75%)', occurrence: 3 },
];

export const SURGE_INFRA_TIMELINE: InfraSnapshot[] = [
  { ts: '14:00', rdsConnections: 18, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '14:15', rdsConnections: 21, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '14:25', rdsConnections: 24, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '14:30', rdsConnections: 28, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '14:31', rdsConnections: 31, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '14:32', rdsConnections: 34, rdsMax: 200, asgRunning: 4, asgDesired: 4 },
  { ts: '14:33', rdsConnections: 36, rdsMax: 200, asgRunning: 4, asgDesired: 12 },
  { ts: '14:34', rdsConnections: 38, rdsMax: 200, asgRunning: 12, asgDesired: 12 },
];
