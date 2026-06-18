import { z } from 'zod'

export const GuardStatusSchema = z.union([
  z.enum(['eligible', 'defer', 'blocked']),
  z.string(),
])
export const PriorityBandSchema = z.enum(['P0', 'P1', 'P2'])

export const LogSampleSchema = z.object({
  timestamp: z.string(),
  level: z.string(),
  message: z.string(),
})

export const TopologyChangeEventSchema = z.object({
  occurred_at: z.string(),
  change_type: z.string(),
  summary: z.string(),
  resource_id: z.string().nullable().optional(),
  service_id: z.string().optional(),
  source: z.string().optional(),
})

export const TopologyDependencySchema = z.object({
  service_id: z.string(),
  dependency_type: z.string().optional(),
  criticality: z.number().optional(),
})

export const TopologyGraphNodeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  resource_type: z.string().optional(),
  status: z.string().optional(),
  change: z.string().optional(),
})

export const TopologyGraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  dependency_type: z.string().optional(),
  reason: z.string().optional(),
})

export const TopologyResourceGraphSchema = z.object({
  source: z.string().optional(),
  nodes: z.array(TopologyGraphNodeSchema).optional(),
  edges: z.array(TopologyGraphEdgeSchema).optional(),
  node_count: z.number().optional(),
  edge_count: z.number().optional(),
})

export const TopologyProposalImpactSchema = z.object({
  action: z.string(),
  target_resource_id: z.string(),
  as_is: z.object({
    node_count: z.number(),
    edge_count: z.number(),
  }),
  to_be: z.object({
    node_count: z.number(),
    edge_count: z.number(),
  }),
  removed_nodes: z.array(TopologyGraphNodeSchema).optional(),
  modified_nodes: z.array(TopologyGraphNodeSchema).optional(),
  broken_edges: z.array(TopologyGraphEdgeSchema).optional(),
  dependent_callers: z.array(z.string()).optional(),
  affected_peers: z
    .array(
      z.object({
        resource_id: z.string(),
        resource_type: z.string().nullable().optional(),
        dependency_type: z.string().optional(),
      }),
    )
    .optional(),
  impact_level: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
  graph_source: z.string().optional(),
})

export const TopologyDesignNodeSchema = z.object({
  nodeId: z.string(),
  type: z.string().optional(),
  label: z.string().optional(),
  groupId: z.string().nullable().optional(),
})

export const TopologyDesignEdgeSchema = z.object({
  edgeId: z.string().optional(),
  from: z.string(),
  to: z.string(),
  dashed: z.boolean().optional(),
  reason: z.string().optional(),
})

export const TopologyDesignDiagramSchema = z.object({
  topology_id: z.string().optional(),
  concept: z.string().optional(),
  display_name: z.string().optional(),
  bundle_id: z.string().nullable().optional(),
  source: z.string().optional(),
  groups: z
    .array(
      z.object({
        groupId: z.string().optional(),
        label: z.string().optional(),
        type: z.string().optional(),
        parentGroupId: z.string().optional(),
      }),
    )
    .optional(),
  nodes: z.array(TopologyDesignNodeSchema).optional(),
  edges: z.array(TopologyDesignEdgeSchema).optional(),
})

export const TopologyDesignProposalImpactSchema = z.object({
  action: z.string(),
  target_resource_id: z.string(),
  matched_design_nodes: z.array(
    z.object({
      nodeId: z.string(),
      type: z.string().optional(),
      label: z.string().optional(),
      match_reason: z.string().optional(),
    }),
  ),
  broken_edges: z.array(TopologyDesignEdgeSchema).optional(),
  affected_design_nodes: z.array(TopologyDesignNodeSchema).optional(),
  impact_level: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
  diagram_source: z.string().optional(),
})

export const TopologyContextSchema = z.object({
  change_events: z.array(TopologyChangeEventSchema).optional(),
  dependencies: z
    .object({
      upstream: z.array(TopologyDependencySchema).optional(),
      downstream: z.array(TopologyDependencySchema).optional(),
    })
    .optional(),
  recent_change_within_hours: z.number().nullable().optional(),
  finops_impact: z.enum(['defer_recommended', 'review', 'none']).optional(),
  rca_link: z
    .object({
      cause_type: z.string().optional(),
      incident_id: z.string().optional(),
    })
    .optional(),
  source: z.string().optional(),
  resource_graph: TopologyResourceGraphSchema.optional(),
  proposal_impact: TopologyProposalImpactSchema.optional(),
  design_diagram: TopologyDesignDiagramSchema.optional(),
  design_proposal_impact: TopologyDesignProposalImpactSchema.optional(),
})

export const FinOpsFindingSchema = z.object({
  finding_id: z.string().optional(),
  resource_id: z.union([z.string(), z.null()]).transform((v) => v ?? ''),
  resource_type: z.string().optional(),
  pattern_id: z.string().optional(),
  recommended_action: z.string().optional(),
  guard_status: GuardStatusSchema.optional(),
  guard_reason: z.string().optional(),
  monthly_waste_usd: z.number().nullable().optional(),
  monthly_potential_waste_usd: z.number().nullable().optional(),
  monthly_cost_usd: z.number().nullable().optional(),
  data_source: z.string().optional(),
  reason: z.string().nullable().optional(),
  evidence: z
    .record(z.string(), z.union([z.number(), z.boolean(), z.string(), z.null()]))
    .optional(),
  confidence_score: z.coerce.number().nullable().optional(),
  utilization_source: z.string().optional(),
  utilization: z
    .record(z.string(), z.union([z.number(), z.boolean(), z.string(), z.null()]))
    .optional(),
  metric_series: z.array(z.coerce.number()).optional(),
  metric_series_timestamps: z.array(z.string()).optional(),
  metric_series_source: z.union([z.enum(['prometheus', 'synthetic']), z.string()]).optional(),
  metric_label: z.string().optional(),
  metric_threshold: z.number().optional(),
  promql: z.string().optional(),
  promql_metric: z.string().optional(),
  grafana_url: z.string().optional(),
  loki_url: z.string().optional(),
  logql: z.string().optional(),
  log_samples: z.array(LogSampleSchema).optional(),
  observability_service_id: z.string().optional(),
  topology_context: TopologyContextSchema.optional().catch(undefined),
})

export const BacklogItemSchema = z.object({
  priority_band: PriorityBandSchema.optional(),
  priority_score: z.number().optional(),
  pattern_id: z.string().optional(),
  resource_id: z.string(),
  resource_type: z.string().optional(),
  recommended_action: z.string().optional(),
  monthly_waste_usd: z.number().nullable().optional(),
  confidence_score: z.number().nullable().optional(),
  reason: z.string().nullable().optional(),
})

export const PatternRollupSchema = z.object({
  pattern_id: z.string(),
  count: z.number(),
  waste_usd: z.number(),
})

export const PrioritySummarySchema = z.object({
  count: z.number(),
  waste_usd: z.number(),
})

export const OptimizationCategorySchema = z.enum([
  'rightsizing',
  'unused',
  'scheduling',
  'reserved',
])

export const OptimizationProposalSchema = z.object({
  id: z.string(),
  category: OptimizationCategorySchema,
  service_name: z.string(),
  title: z.string(),
  monthly_savings_krw: z.number(),
  monthly_savings_usd: z.number().optional(),
  priority_band: PriorityBandSchema.optional(),
  sla_target: z.string().optional(),
  sla_impact: z.enum(['none', 'low', 'review']).optional(),
  sla_impact_detail: z.string().optional(),
  evidence_summary: z.string().optional(),
  cpu_utilization_trend: z.array(z.number()).optional(),
  metric_series_timestamps: z.array(z.string()).optional(),
  metric_series_source: z.enum(['prometheus', 'synthetic']).optional(),
  metric_label: z.string().optional(),
  metric_threshold: z.number().optional(),
  promql: z.string().optional(),
  grafana_url: z.string().optional(),
  loki_url: z.string().optional(),
  logql: z.string().optional(),
  log_samples: z.array(LogSampleSchema).optional(),
  confidence_score: z.number().nullable().optional(),
  utilization_source: z.string().optional(),
  evidence: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])).optional(),
  utilization: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])).optional(),
  event_spike_note: z.string().optional(),
  resource_id: z.string().optional(),
  recommended_action: z.string().optional(),
  terraform_handoff: z.boolean().optional(),
  iac_change_label: z.string().optional(),
  topology_context: TopologyContextSchema.optional(),
})

export const TradeoffRowSchema = z.object({
  label: z.string(),
  monthly_cost_krw: z.number(),
  availability_forecast: z.string(),
  notes: z.string().optional(),
  is_recommended: z.boolean().optional(),
})

export const SlaEvidenceServiceSchema = z.object({
  service_name: z.string(),
  availability_target: z.string(),
  availability_actual: z.string(),
  status: z.enum(['met', 'at_risk', 'breach']),
})

export const SlaEvidenceSchema = z.object({
  period_label: z.string(),
  services: z.array(SlaEvidenceServiceSchema),
  error_budget_trend: z.array(
    z.object({ label: z.string(), remaining_pct: z.number() }),
  ),
  incidents_summary: z.string(),
  executive_summary: z.string(),
  recipient: z.string().optional(),
  send_status: z.enum(['draft', 'sent', 'pending']).optional(),
})

export const OptimizationReportSchema = z.object({
  lead_message: z.string().optional(),
  proposals: z.array(OptimizationProposalSchema),
  tradeoff_rows: z.array(TradeoffRowSchema).optional(),
  sla_evidence: SlaEvidenceSchema.optional(),
})

export const ExecutiveReportSchema = z.object({
  report_summary: z.string().optional(),
  sla_context: z
    .object({
      bundle_id: z.string().nullable().optional(),
      environment: z.string().nullable().optional(),
      primary_region: z.string().nullable().optional(),
      monthly_budget_krw: z.number().nullable().optional(),
      spot_instance_allowed: z.boolean().nullable().optional(),
      cost_priority: z.string().nullable().optional(),
    })
    .optional(),
  scope: z
    .object({
      regions: z.array(z.string()).optional(),
      environments: z.array(z.string()).optional(),
      evaluation_days: z.number().nullable().optional(),
      prod_recommend_block: z.boolean().nullable().optional(),
    })
    .optional(),
  funnel: z
    .object({
      findings_total: z.number(),
      guarded_total: z.number(),
      eligible: z.number(),
      defer: z.number(),
      blocked: z.number(),
    })
    .optional(),
  priority_summary: z
    .object({
      P0: PrioritySummarySchema,
      P1: PrioritySummarySchema,
      P2: PrioritySummarySchema,
    })
    .optional(),
  total_monthly_waste_usd: z.number().optional(),
  prioritized_backlog: z.array(BacklogItemSchema).optional(),
  pattern_rollup: z.array(PatternRollupSchema).optional(),
  blocked_defer: z.array(FinOpsFindingSchema).optional(),
  rca_summary: z
    .object({
      hint_count: z.coerce.number(),
      hints: z.array(
        z.object({
          cause_type: z.string().optional(),
          confidence: z.coerce.number().optional(),
          rationale: z.string().optional(),
        }),
      ),
      rules_applied: z
        .array(z.union([z.string(), z.null()]))
        .transform((items) => items.filter((item): item is string => typeof item === 'string')),
      rca_informed: z.boolean(),
    })
    .nullable()
    .optional(),
  optimization: OptimizationReportSchema.optional(),
})

export const FindingsSnapshotSchema = z.object({
  findings_count: z.coerce.number(),
  guarded_count: z.coerce.number(),
  eligible_count: z.coerce.number(),
  guard_summary: z.object({
    eligible: z.coerce.number(),
    defer: z.coerce.number(),
    blocked: z.coerce.number(),
  }),
  total_monthly_waste_usd: z.coerce.number(),
  executive_report: ExecutiveReportSchema.optional(),
  findings: z.array(FinOpsFindingSchema),
})

export const DataQualitySummarySchema = z.object({
  overall_quality: z.string().optional(),
  cmdb_source: z.string().optional(),
  utilization_source: z.string().optional(),
  sla_bundle_freshness: z.string().optional(),
  eb_available: z.boolean().optional(),
  rca_linked: z.boolean().optional(),
  rca_source: z.string().optional(),
  rca_incident_id: z.string().optional(),
  rca_hint_count: z.number().optional(),
  warnings: z.array(z.string()).optional(),
})

export const FinOpsRunSchema = z.object({
  id: z.string(),
  run_id: z.string(),
  batch_id: z.string().nullable().optional(),
  tenant_id: z.string(),
  team_id: z.string().nullable().optional(),
  service_id: z.string(),
  service_name: z.string().nullable().optional(),
  schedule_window: z.string().nullable().optional(),
  status: z.string(),
  report_artifact_uri: z.string().nullable().optional(),
  findings_count: z.coerce.number().nullable().optional(),
  eligible_count: z.coerce.number().nullable().optional(),
  error_message: z.string().nullable().optional(),
  approval_status: z.string().nullable().optional(),
  approval_reviewer: z.string().nullable().optional(),
  approval_comment: z.string().nullable().optional(),
  approval_reviewed_at: z.string().nullable().optional(),
  findings_snapshot: FindingsSnapshotSchema.nullable().optional(),
  data_quality_summary: DataQualitySummarySchema.nullable().optional(),
  started_at: z.string().nullable().optional(),
  finished_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
})

export const FinOpsRunsResponseSchema = z.object({
  storage: z.string(),
  runs: z.array(FinOpsRunSchema),
})

export const FinOpsRunDetailResponseSchema = z.object({
  storage: z.string(),
  run: FinOpsRunSchema,
})

export type FinOpsRun = z.infer<typeof FinOpsRunSchema>
export type FinOpsFinding = z.infer<typeof FinOpsFindingSchema>
export type TopologyContext = z.infer<typeof TopologyContextSchema>
export type TopologyProposalImpact = z.infer<typeof TopologyProposalImpactSchema>
export type TopologyDesignProposalImpact = z.infer<typeof TopologyDesignProposalImpactSchema>
export type FindingsSnapshot = z.infer<typeof FindingsSnapshotSchema>
export type ExecutiveReport = z.infer<typeof ExecutiveReportSchema>
export type BacklogItem = z.infer<typeof BacklogItemSchema>
export type OptimizationProposal = z.infer<typeof OptimizationProposalSchema>
export type OptimizationCategory = z.infer<typeof OptimizationCategorySchema>
export type OptimizationReport = z.infer<typeof OptimizationReportSchema>
export type SlaEvidence = z.infer<typeof SlaEvidenceSchema>
export type TradeoffRow = z.infer<typeof TradeoffRowSchema>
