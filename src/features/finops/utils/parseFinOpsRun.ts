import { z } from 'zod'
import {
  DataQualitySummarySchema,
  FindingsSnapshotSchema,
  type FinOpsRun,
} from './finops.schema'

/** API run row — coerce common BE type drift; skip nested snapshot in strict pass. */
const FinOpsRunCoreSchema = z.object({
  id: z.coerce.string(),
  run_id: z.coerce.string(),
  batch_id: z.union([z.string(), z.null()]).optional(),
  tenant_id: z.coerce.string(),
  team_id: z.union([z.string(), z.null()]).optional(),
  service_id: z.coerce.string(),
  service_name: z.union([z.string(), z.null()]).optional(),
  schedule_window: z.union([z.string(), z.null()]).optional(),
  status: z.coerce.string(),
  report_artifact_uri: z.union([z.string(), z.null()]).optional(),
  findings_count: z.coerce.number().nullable().optional(),
  eligible_count: z.coerce.number().nullable().optional(),
  error_message: z.union([z.string(), z.null()]).optional(),
  approval_status: z.union([z.string(), z.null()]).optional(),
  approval_reviewer: z.union([z.string(), z.null()]).optional(),
  approval_comment: z.union([z.string(), z.null()]).optional(),
  approval_reviewed_at: z.union([z.string(), z.null()]).optional(),
  started_at: z.union([z.string(), z.null()]).optional(),
  finished_at: z.union([z.string(), z.null()]).optional(),
  created_at: z.union([z.string(), z.null()]).optional(),
})

function parseFindingsSnapshot(raw: unknown): FinOpsRun['findings_snapshot'] {
  if (raw == null) return null
  const result = FindingsSnapshotSchema.safeParse(raw)
  if (result.success) return result.data
  if (typeof raw === 'object') {
    return raw as FinOpsRun['findings_snapshot']
  }
  return null
}

function parseDataQualitySummary(raw: unknown): FinOpsRun['data_quality_summary'] {
  if (raw == null) return null
  const result = DataQualitySummarySchema.nullable().safeParse(raw)
  if (result.success) return result.data ?? null
  if (typeof raw === 'object') {
    return raw as FinOpsRun['data_quality_summary']
  }
  return null
}

/** Lenient parser for /api/finops/runs — never throws, no console noise. */
export function parseFinOpsRun(raw: unknown): FinOpsRun | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const base = FinOpsRunCoreSchema.safeParse(row)
  if (!base.success) {
    return null
  }
  return {
    ...base.data,
    findings_snapshot: parseFindingsSnapshot(row.findings_snapshot),
    data_quality_summary: parseDataQualitySummary(row.data_quality_summary),
  }
}

export function parseFinOpsRunsResponse(raw: unknown): FinOpsRun[] {
  const rows = (raw as { runs?: unknown })?.runs
  if (!Array.isArray(rows)) return []
  return rows.map(parseFinOpsRun).filter((run): run is FinOpsRun => run !== null)
}
