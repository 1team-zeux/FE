// 데모 시나리오 — 컴포넌트 외부로 분리된 fixture (T-Universe 계약 기준)
import type { TriageAssessment, Alarm } from '../types/incident.schema';

// Billing Settlement Batch — LOW 시나리오 (CPU spike but SLA OK)
// 10만 건 정산 중 CPU 일시 상승이지만 error_rate 정상 · 진행률 정상 · 06:00 마감 여유
export const DEMO_BILLING_ASSESSMENT: TriageAssessment = {
  incident_id: 'inc-demo-billing-001',
  correlation_group_id: 'grp-demo-billing-001',
  assessment_stage: 'provisional',
  triage_priority: 'Low',
  triage_latency_ms: 4200,
  current_state: {
    prometheus_snapshot: {
      snapshot_at: '2026-06-18T02:17:00Z',
      metrics: [
        { name: 'cpu_usage_pct',     current: 84,     baseline: 55,    deviation_ratio: 1.5, unit: 'percent' },
        { name: 'batch_progress_pct', current: 47,    baseline: 50,    deviation_ratio: 0.94, unit: 'percent' },
        { name: 'error_rate',         current: 0.0008, baseline: 0.001, deviation_ratio: 0.8, unit: 'ratio' },
      ],
    },
    infra_status: {
      asg_desired: 4,
      asg_running: 4,
      spot_interruption: false,
      rds_connection_count: 78,
      rds_max_connections: 200,
    },
    recent_deployment: { exists: false },
  },
  sla_impact: {
    affected_items: [{
      sla_item_id: 'sla-billing-correctness',
      category: 'Correctness',
      target: 99.99,
      budget_remaining_pct: 98.5,
      burn_rate_state: 'normal',
      burn_rate_value: 0.1,
      estimated_violation_minutes: undefined,
      current_alert_level: 'level0',
    }],
    triage_priority: 'Low',
    user_impact_estimate: '영향 없음 — 정산 처리율 정상 · 06:00 마감까지 3시간 13분 여유',
    earliest_violation_minutes: null,
  },
  vector_db_hints: {
    top_cause_hypothesis: 'batch_cpu_normal_pattern',
    hypothesis_confidence: 0.91,
    hypothesis_basis: '유사 사태 4건 모두 자동 정상화 — CPU spike는 배치 정렬 단계 특성',
    similar_incidents: [
      { incident_id: 'inc-20260518-0011', similarity: 0.88, confirmed_cause: 'batch_sort_phase_cpu_normal',  occurred_at: '2026-05-18T02:24:00Z', time_context: '배치정렬구간', resolution: 'auto_recovered' },
      { incident_id: 'inc-20260420-0009', similarity: 0.83, confirmed_cause: 'batch_sort_phase_cpu_normal',  occurred_at: '2026-04-20T02:31:00Z', time_context: '배치정렬구간', resolution: 'auto_recovered' },
      { incident_id: 'inc-20260322-0005', similarity: 0.79, confirmed_cause: 'batch_sort_phase_cpu_normal',  occurred_at: '2026-03-22T02:18:00Z', time_context: '배치정렬구간', resolution: 'auto_recovered' },
      { incident_id: 'inc-20260225-0002', similarity: 0.74, confirmed_cause: 'batch_sort_phase_cpu_normal',  occurred_at: '2026-02-25T02:42:00Z', time_context: '배치정렬구간', resolution: 'auto_recovered' },
    ],
  },
  handoff: { to_rca: false, rca_entry_mode: null },
  node_errors: {},
};

// Subscription API (POST /subscriptions) — CRITICAL 시나리오
// p95 latency 5.6× / error_rate 410× / DB connection pool 48/50 (96%) 포화
export const DEMO_SUBSCRIPTION_ASSESSMENT: TriageAssessment = {
  incident_id: 'inc-demo-subscription-001',
  correlation_group_id: 'grp-demo-subscription-001',
  assessment_stage: 'provisional',
  triage_priority: 'Critical',
  triage_latency_ms: 2100,
  current_state: {
    prometheus_snapshot: {
      snapshot_at: '2026-06-18T14:32:00Z',
      metrics: [
        { name: 'latency_p95_ms', current: 1240,   baseline: 220,    deviation_ratio: 5.6,   unit: 'ms' },
        { name: 'error_rate',     current: 0.041,  baseline: 0.0001, deviation_ratio: 410.0, unit: 'ratio' },
        { name: 'db_pool_active', current: 48,     baseline: 18,     deviation_ratio: 2.7,   unit: 'connections' },
      ],
    },
    infra_status: {
      ecs_desired: 3,
      ecs_running: 3,
      alb_healthy_targets: 3,
      alb_total_targets: 3,
      db_pool_active: 48,
      db_pool_max: 50,
    },
    recent_deployment: { exists: false },
  },
  sla_impact: {
    affected_items: [
      {
        sla_item_id: 'sla-subscription-post-availability',
        category: 'Availability',
        target: 99.99,
        budget_remaining_pct: 8.5,
        burn_rate_state: 'fast',
        burn_rate_value: 14.4,
        estimated_violation_minutes: 0.37,
        current_alert_level: 'level2',
      },
      {
        sla_item_id: 'sla-subscription-post-latency',
        category: 'Latency',
        target: 300,
        budget_remaining_pct: 0,
        burn_rate_state: 'critical_breach',
        burn_rate_value: 4.13,
        estimated_violation_minutes: 0,
        current_alert_level: 'level2',
      },
    ],
    triage_priority: 'Critical',
    user_impact_estimate: '신규 가입 실패 — POST /subscriptions 4.1% 5xx · p95 1.24s 초과',
    earliest_violation_minutes: 0.37,
  },
  vector_db_hints: {
    top_cause_hypothesis: 'db_connection_pool_exhaustion',
    hypothesis_confidence: 0.89,
    hypothesis_basis: '유사 사태 3건 모두 동일 — HikariPool 부족으로 인한 connection wait',
    similar_incidents: [
      { incident_id: 'inc-20260601-0027', similarity: 0.91, confirmed_cause: 'db_connection_pool_exhaustion', occurred_at: '2026-06-01T11:18:00Z', time_context: '프로모션시간', resolution: 'db_pool_size_up' },
      { incident_id: 'inc-20260512-0019', similarity: 0.87, confirmed_cause: 'db_connection_pool_exhaustion', occurred_at: '2026-05-12T15:42:00Z', time_context: '업무시간피크', resolution: 'db_pool_size_up' },
      { incident_id: 'inc-20260408-0013', similarity: 0.83, confirmed_cause: 'db_connection_pool_exhaustion', occurred_at: '2026-04-08T11:05:00Z', time_context: '프로모션시간', resolution: 'db_pool_size_up' },
    ],
  },
  handoff: { to_rca: true, rca_entry_mode: 'hypothesis_first' },
  node_errors: {},
};

// 데모 알람 피드 — 1행 = 1 correlation_group (그룹화된 형태)
// Billing(Low, warning) + Subscription(Critical, critical)
export const DEMO_FEED_GROUPS: Array<Alarm & { alarms: Alarm[] }> = [
  {
    id: 'grp-demo-subscription-001',
    ts: '14:32:08',
    serviceId: '2',
    serviceName: 'Subscription API (POST /subscriptions)',
    severity: 'critical',
    status: 'rca_started',
    correlationGroupId: 'grp-demo-subscription-001',
    triage_priority: 'Critical',
    alarmCount: 6,
    alarms: [
      { id: 'alm-201', ts: '14:32:08', serviceId: '2', serviceName: 'Subscription API', severity: 'critical', status: 'merged', source: 'metric', alert_name: 'HighLatencyP95',         metric: 'latency_p95_ms',  current_value: 1240,  baseline: 220,    unit: 'ms' },
      { id: 'alm-202', ts: '14:32:12', serviceId: '2', serviceName: 'Subscription API', severity: 'critical', status: 'merged', source: 'metric', alert_name: 'ErrorRateSpike',         metric: 'error_rate',      current_value: 0.041, baseline: 0.0001, unit: 'ratio' },
      { id: 'alm-203', ts: '14:32:18', serviceId: '2', serviceName: 'Subscription API', severity: 'critical', status: 'merged', source: 'metric', alert_name: 'DBPoolExhaustion',       metric: 'db_pool_active',  current_value: 48,    baseline: 18,     unit: 'connections' },
      { id: 'alm-204', ts: '14:32:21', serviceId: '2', serviceName: 'Subscription API', severity: 'critical', status: 'merged', source: 'metric', alert_name: 'ErrorBudgetFastBurn',    metric: 'burn_rate',       current_value: 14.4,  baseline: 1.0,    unit: 'ratio' },
      { id: 'alm-205', ts: '14:32:26', serviceId: '2', serviceName: 'Subscription API', severity: 'critical', status: 'merged', source: 'log',    alert_name: 'JdbcConnectionTimeout',  log_message: 'HikariPool-1 - Connection is not available, request timed out after 30000ms', occurrence: 42 },
      { id: 'alm-206', ts: '14:32:33', serviceId: '2', serviceName: 'Subscription API', severity: 'warning',  status: 'merged', source: 'trace',  alert_name: 'PostSubscriptionsTrace', trace_id: 'a7f4c2b9', span_duration_ms: 1240 },
    ],
  },
  {
    id: 'grp-demo-billing-001',
    ts: '02:17:03',
    serviceId: '1',
    serviceName: 'Billing Settlement Batch',
    severity: 'warning',
    status: 'triage_done',
    correlationGroupId: 'grp-demo-billing-001',
    triage_priority: 'Low',
    alarmCount: 4,
    alarms: [
      { id: 'alm-001', ts: '02:17:03', serviceId: '1', serviceName: 'Billing Settlement Batch', severity: 'warning', status: 'merged', source: 'metric', alert_name: 'CpuUsageHigh',       metric: 'cpu_usage_pct',     current_value: 84,    baseline: 55,    unit: 'percent' },
      { id: 'alm-002', ts: '02:17:08', serviceId: '1', serviceName: 'Billing Settlement Batch', severity: 'warning', status: 'merged', source: 'metric', alert_name: 'GcPauseElevated',    metric: 'gc_pause_ms',       current_value: 312,   baseline: 180,   unit: 'ms' },
      { id: 'alm-003', ts: '02:17:14', serviceId: '1', serviceName: 'Billing Settlement Batch', severity: 'warning', status: 'merged', source: 'metric', alert_name: 'SpotStealTime',      metric: 'cpu_steal_pct',     current_value: 4.1,   baseline: 0.5,   unit: 'percent' },
      { id: 'alm-004', ts: '02:17:21', serviceId: '1', serviceName: 'Billing Settlement Batch', severity: 'info',    status: 'merged', source: 'log',    alert_name: 'BatchProgressInfo',  log_message: 'settlement batch progress 47/100 records (47.0%)', occurrence: 1 },
    ],
  },
];

// 데모 Incident 이력
export const DEMO_INCIDENTS = [
  { id: 'inc-demo-subscription-001', serviceName: 'Subscription API (POST /subscriptions)', severity: 'critical', status: 'open',     title: 'POST /subscriptions DB pool 고갈 — Error Budget 임박', startedAt: '2026-06-18T14:32:08Z', triagePriority: 'Critical' },
  { id: 'inc-demo-billing-001',      serviceName: 'Billing Settlement Batch',                severity: 'warning',  status: 'open',     title: '정산 배치 CPU 정상 spike — SLA OK',                    startedAt: '2026-06-18T02:17:03Z', triagePriority: 'Low' },
  { id: 'inc-20260601-0027',         serviceName: 'Subscription API',                         severity: 'critical', status: 'resolved', title: 'DB Connection Pool Exhaustion',                         startedAt: '2026-06-01T11:18:00Z', triagePriority: 'Critical', resolvedAt: '2026-06-01T11:48:00Z' },
  { id: 'inc-20260518-0011',         serviceName: 'Billing Settlement Batch',                severity: 'warning',  status: 'resolved', title: '배치 정렬 단계 CPU spike — 자동 회복',                 startedAt: '2026-05-18T02:24:00Z', triagePriority: 'Low',      resolvedAt: '2026-05-18T02:38:00Z' },
  { id: 'inc-20260512-0019',         serviceName: 'Subscription API',                         severity: 'critical', status: 'resolved', title: 'HikariPool wait — POST 가입 5xx 증가',                  startedAt: '2026-05-12T15:42:00Z', triagePriority: 'Critical', resolvedAt: '2026-05-12T16:12:00Z' },
];
