import type { FinOpsFinding } from '../types/finops.schema'

export type LogSample = NonNullable<FinOpsFinding['log_samples']>[number]

export interface MltPillarCore {
  available: boolean
}

export interface MltCoreView {
  metrics: MltPillarCore & {
    label?: string
    series?: number[]
    threshold?: number
    grafanaUrl?: string
    seriesSource?: string
  }
  logs: MltPillarCore & {
    highlights: LogSample[]
    totalCount: number
    lokiUrl?: string
  }
  traces: MltPillarCore & {
    tempoUrl?: string
    traceId?: string
  }
  hasAnyCore: boolean
  activePillars: Array<'metrics' | 'logs' | 'traces'>
}

const LOG_LEVEL_RANK: Record<string, number> = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 }

function pickLogHighlights(samples?: LogSample[]): LogSample[] {
  if (!samples?.length) return []
  return [...samples]
    .sort((a, b) => (LOG_LEVEL_RANK[a.level] ?? 9) - (LOG_LEVEL_RANK[b.level] ?? 9))
    .slice(0, 2)
}

export function resolveMltCore(finding: FinOpsFinding | null | undefined): MltCoreView {
  const empty: MltCoreView = {
    metrics: { available: false },
    logs: { available: false, highlights: [], totalCount: 0 },
    traces: { available: false },
    hasAnyCore: false,
    activePillars: [],
  }
  if (!finding) return empty

  const metricsAvailable = Boolean(
    finding.metric_series?.length || finding.grafana_url || finding.promql,
  )
  const logsAvailable = Boolean(
    finding.log_samples?.length || finding.loki_url,
  )
  const tracesAvailable = Boolean(
    (finding as FinOpsFinding & { tempo_url?: string }).tempo_url,
  )

  const activePillars: MltCoreView['activePillars'] = []
  if (metricsAvailable) activePillars.push('metrics')
  if (logsAvailable) activePillars.push('logs')
  if (tracesAvailable) activePillars.push('traces')

  return {
    metrics: {
      available: metricsAvailable,
      label: finding.metric_label,
      series: finding.metric_series,
      threshold: finding.metric_threshold,
      grafanaUrl: finding.grafana_url,
      seriesSource: finding.metric_series_source,
    },
    logs: {
      available: logsAvailable,
      highlights: pickLogHighlights(finding.log_samples),
      totalCount: finding.log_samples?.length ?? 0,
      lokiUrl: finding.loki_url,
    },
    traces: {
      available: tracesAvailable,
      tempoUrl: (finding as FinOpsFinding & { tempo_url?: string }).tempo_url,
    },
    hasAnyCore: activePillars.length > 0,
    activePillars,
  }
}

export function mltPillarLabel(pillar: 'metrics' | 'logs' | 'traces'): string {
  if (pillar === 'metrics') return 'M · Metrics'
  if (pillar === 'logs') return 'L · Logs'
  return 'T · Traces'
}
export function sparklinePoints(values: number[], width = 200, height = 48): string {
  if (!values.length) return ''
  const max = Math.max(...values, 1)
  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width
      const y = height - (v / max) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(' ')
}

export function thresholdLineY(threshold: number, values: number[], height = 48): number {
  const max = Math.max(...values, threshold, 1)
  return height - (threshold / max) * (height - 8) - 4
}

export function evidenceMetricLabel(finding: FinOpsFinding): string {
  if (finding.metric_label) return finding.metric_label
  const pid = finding.pattern_id ?? ''
  if (pid.includes('ec2') || pid.includes('rds')) return 'CPU 이용률 (%)'
  if (pid.includes('nat')) return 'NAT egress (GB/day)'
  return '관측 메트릭'
}

export function formatEvidenceEntries(evidence?: Record<string, unknown>): { key: string; value: string }[] {
  if (!evidence) return []
  return Object.entries(evidence).map(([key, value]) => ({
    key,
    value: typeof value === 'number' ? String(value) : String(value ?? '—'),
  }))
}

export function sourceBadgeLabel(source?: string): string {
  if (!source) return 'unknown'
  if (source === 'prometheus') return 'Prometheus 실측'
  if (source === 'demo') return 'demo (시뮬레이션)'
  if (source === 'mixed') return 'mixed'
  return source
}

export function seriesSourceBadgeLabel(source?: string): string {
  if (source === 'prometheus') return 'Prometheus 시계열'
  if (source === 'synthetic') return '집계값 근사'
  return ''
}

export function sourceBadgeClass(source?: string): string {
  if (source === 'prometheus') return 'bg-status-ok/10 text-status-ok border-status-ok/25'
  if (source === 'demo') return 'bg-amber-500/10 text-amber-700 border-amber-500/25'
  return 'bg-gray-100 text-gray-500 border-border'
}

export function findingToProposalMetrics(finding: FinOpsFinding) {
  return {
    evidence_summary: finding.reason ?? finding.guard_reason,
    cpu_utilization_trend: finding.metric_series,
    metric_series_timestamps: finding.metric_series_timestamps,
    metric_series_source: finding.metric_series_source,
    metric_label: finding.metric_label ?? evidenceMetricLabel(finding),
    metric_threshold: finding.metric_threshold,
    promql: finding.promql,
    grafana_url: finding.grafana_url,
    loki_url: finding.loki_url,
    logql: finding.logql,
    log_samples: finding.log_samples,
    confidence_score: finding.confidence_score,
    utilization_source: finding.utilization_source,
    evidence: finding.evidence,
    utilization: finding.utilization,
  }
}
