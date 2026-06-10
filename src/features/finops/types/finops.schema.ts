import { z } from 'zod'

export const GuardStatusSchema = z.enum(['eligible', 'defer', 'blocked'])

export const FinOpsFindingSchema = z.object({
  finding_id: z.string().optional(),
  resource_id: z.string(),
  pattern_id: z.string().optional(),
  recommended_action: z.string().optional(),
  guard_status: GuardStatusSchema.optional(),
  guard_reason: z.string().optional(),
  monthly_waste_usd: z.number().optional(),
  data_source: z.string().optional(),
})

export const FindingsSnapshotSchema = z.object({
  findings_count: z.number(),
  guarded_count: z.number(),
  eligible_count: z.number(),
  guard_summary: z.object({
    eligible: z.number(),
    defer: z.number(),
    blocked: z.number(),
  }),
  total_monthly_waste_usd: z.number(),
  findings: z.array(FinOpsFindingSchema),
})

export const DataQualitySummarySchema = z.object({
  overall_quality: z.string().optional(),
  cmdb_source: z.string().optional(),
  utilization_source: z.string().optional(),
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
  findings_count: z.number().nullable().optional(),
  eligible_count: z.number().nullable().optional(),
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
export type FindingsSnapshot = z.infer<typeof FindingsSnapshotSchema>
