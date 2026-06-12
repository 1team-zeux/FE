import type { FinOpsRun } from '../types/finops.schema'

export interface FinOpsTenantGroup {
  tenantId: string
  tenantLabel: string
  runs: FinOpsRun[]
  totalFindings: number
  totalEligible: number
  totalMonthlyWasteUsd: number
}

export function formatTenantLabel(tenantId: string): string {
  return tenantId
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function groupFinOpsRunsByTenant(runs: FinOpsRun[]): FinOpsTenantGroup[] {
  const byTenant = new Map<string, FinOpsRun[]>()

  for (const run of runs) {
    const key = run.tenant_id || 'unknown'
    const bucket = byTenant.get(key) ?? []
    bucket.push(run)
    byTenant.set(key, bucket)
  }

  return [...byTenant.entries()]
    .map(([tenantId, tenantRuns]) => {
      const sorted = [...tenantRuns].sort((a, b) => {
        const aName = a.service_name ?? a.service_id
        const bName = b.service_name ?? b.service_id
        return aName.localeCompare(bName, 'ko')
      })

      return {
        tenantId,
        tenantLabel: formatTenantLabel(tenantId),
        runs: sorted,
        totalFindings: sorted.reduce((sum, r) => sum + (r.findings_count ?? 0), 0),
        totalEligible: sorted.reduce((sum, r) => sum + (r.eligible_count ?? 0), 0),
        totalMonthlyWasteUsd: sorted.reduce(
          (sum, r) => sum + (r.findings_snapshot?.total_monthly_waste_usd ?? 0),
          0,
        ),
      }
    })
    .sort((a, b) => a.tenantLabel.localeCompare(b.tenantLabel, 'ko'))
}
