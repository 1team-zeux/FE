import type { ExecutiveReport, FinOpsRun } from '../types/finops.schema'

/** legacy snapshot without executive_report → minimal fallback */
export function resolveExecutiveReport(run: FinOpsRun): ExecutiveReport {
  const snap = run.findings_snapshot
  if (snap?.executive_report) return snap.executive_report

  const gs = snap?.guard_summary ?? { eligible: 0, defer: 0, blocked: 0 }
  return {
    report_summary: '',
    funnel: {
      findings_total: snap?.findings_count ?? run.findings_count ?? 0,
      guarded_total: snap?.guarded_count ?? 0,
      eligible: gs.eligible,
      defer: gs.defer,
      blocked: gs.blocked,
    },
    total_monthly_waste_usd: snap?.total_monthly_waste_usd ?? 0,
    prioritized_backlog: [],
    pattern_rollup: [],
    blocked_defer: (snap?.findings ?? []).filter(
      (f) => f.guard_status === 'blocked' || f.guard_status === 'defer',
    ),
  }
}

export function formatKrw(value?: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value)
}

export function formatUsd(value?: number | null): string {
  if (value == null) return '—'
  return `$${value.toFixed(2)}`
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function statusBadgeClass(status: string): string {
  if (status === 'COMPLETED' || status === 'PROPOSAL_SENT' || status === 'REPORT_READY') {
    return 'bg-status-ok/10 text-status-ok border-status-ok/30'
  }
  if (status === 'FAILED') return 'bg-status-critical/10 text-status-critical border-status-critical/30'
  return 'bg-status-warning/10 text-status-warning border-status-warning/30'
}
