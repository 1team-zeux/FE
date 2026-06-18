import { z } from 'zod'
import {
  DataQualitySummarySchema,
  FindingsSnapshotSchema,
  FinOpsRunSchema,
  type FinOpsRun,
} from './finops.schema'

/** Run metadata without nested snapshot blobs (validated separately). */
const FinOpsRunBaseSchema = FinOpsRunSchema.omit({
  findings_snapshot: true,
  data_quality_summary: true,
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

/** Lenient parser — keeps UI working when nested snapshot shape drifts from Zod. */
export function parseFinOpsRun(raw: unknown): FinOpsRun | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const base = FinOpsRunBaseSchema.safeParse(row)
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

export function formatZodIssues(error: z.ZodError): unknown {
  return error.format()
}
