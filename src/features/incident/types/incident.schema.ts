import { z } from 'zod';

// ── 알람 피드 ──────────────────────────────────────────────────────
// 단일 알람 또는 correlation group 양쪽 다 표현 가능
export const AlarmSchema = z.object({
  id: z.string(),
  ts: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  severity: z.enum(['critical', 'warning', 'info']),
  status: z.enum(['receiving', 'grouping', 'triage_running', 'triage_done', 'rca_started', 'merged', 'noise']),
  correlationGroupId: z.string().optional(),
  triage_priority: z.enum(['Critical', 'High', 'Medium', 'Low']).nullable().optional(),
  merged_into: z.string().optional(),
  alarmCount: z.number().optional(),
  // 알람 출처 — metric/log/trace 세 가지
  source: z.enum(['metric', 'log', 'trace']).optional(),
  alert_name: z.string().optional(),
  // metric source 필드
  metric: z.string().optional(),
  current_value: z.number().optional(),
  baseline: z.number().optional(),
  unit: z.string().optional(),
  // log source 필드
  log_message: z.string().optional(),
  occurrence: z.number().optional(),
  // trace source 필드
  trace_id: z.string().optional(),
  span_duration_ms: z.number().optional(),
});
export type Alarm = z.infer<typeof AlarmSchema>;

// 알람 그룹 — feed의 1 row는 1 group
export const AlarmGroupSchema = AlarmSchema.extend({
  alarms: z.array(AlarmSchema),
});
export type AlarmGroup = z.infer<typeof AlarmGroupSchema>;

// ── Triage Assessment ─────────────────────────────────────────────
export const MetricDeviationSchema = z.object({
  name: z.string(),
  current: z.number(),
  baseline: z.number(),
  deviation_ratio: z.number(),
  unit: z.string().optional(),
});

export const SlaImpactItemSchema = z.object({
  sla_item_id: z.string(),
  category: z.string(),
  target: z.number().optional(),
  budget_remaining_pct: z.number(),
  burn_rate_state: z.string(),
  burn_rate_value: z.number().optional(),
  estimated_violation_minutes: z.number().optional(),
  current_alert_level: z.string().optional(),
  triage_priority: z.string().optional(),
});

export const SimilarIncidentSchema = z.object({
  incident_id: z.string(),
  similarity: z.number(),
  confirmed_cause: z.string(),
  occurred_at: z.string(),
  time_context: z.string().optional(),
  resolution: z.string().optional(),
});

export const VectorHintsSchema = z.object({
  top_cause_hypothesis: z.string().nullable().optional(),
  hypothesis_confidence: z.number().optional(),
  hypothesis_basis: z.string().optional(),
  similar_incidents: z.array(SimilarIncidentSchema).optional(),
});

export const SlaImpactSchema = z.object({
  affected_items: z.array(SlaImpactItemSchema),
  triage_priority: z.string(),
  user_impact_estimate: z.string().optional(),
  earliest_violation_minutes: z.number().nullable().optional(),
});

export const TriageAssessmentSchema = z.object({
  id: z.string().optional(),
  incident_id: z.string(),
  correlation_group_id: z.string().optional(),
  assessment_stage: z.enum(['provisional', 'refined']).optional(),
  triage_priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  triage_latency_ms: z.number().optional(),
  triggered_alarms: z.array(z.record(z.any())).optional(),
  current_state: z.object({
    prometheus_snapshot: z.object({
      snapshot_at: z.string().optional(),
      metrics: z.array(MetricDeviationSchema),
    }).optional(),
    infra_status: z.record(z.any()).optional(),
    recent_deployment: z.record(z.any()).optional(),
  }).optional(),
  sla_impact: SlaImpactSchema,
  vector_db_hints: VectorHintsSchema.optional(),
  situation_text: z.string().optional(),
  handoff: z.object({
    to_rca: z.boolean(),
    rca_entry_mode: z.string().nullable().optional(),
  }).optional(),
  node_errors: z.record(z.string()).optional(),
  created_at: z.string().optional(),
});
export type TriageAssessment = z.infer<typeof TriageAssessmentSchema>;
export type MetricDeviation = z.infer<typeof MetricDeviationSchema>;
export type SlaImpactItem = z.infer<typeof SlaImpactItemSchema>;

// ── Incident 이력 ─────────────────────────────────────────────────
export const IncidentSummarySchema = z.object({
  id: z.string(),
  serviceId: z.string().optional(),
  serviceName: z.string().optional(),
  severity: z.string().optional(),
  status: z.string(),
  title: z.string().optional(),
  startedAt: z.string().optional(),
  triagePriority: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
});
export type IncidentSummary = z.infer<typeof IncidentSummarySchema>;

// ── 복구 조치 ─────────────────────────────────────────────────────
export const RecoveryActionSchema = z.object({
  id: z.string(),
  actionType: z.enum(['immediate', 'iac_change']),
  title: z.string(),
  description: z.string(),
  rationale: z.string().optional(),
  expectedEffect: z.string().optional(),
  riskLevel: z.enum(['Low', 'Medium', 'High']),
  expectedSlaImprovementPct: z.number().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'executing', 'done']).default('pending'),
});
export type RecoveryAction = z.infer<typeof RecoveryActionSchema>;
