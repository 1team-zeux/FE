import type { FinOpsFinding, FinOpsRun, OptimizationProposal } from '../types/finops.schema'
import { resolveMltCore } from './evidenceMetrics'
import { resolveTopologyCore, resolveTopologyFinding } from './topologyMetrics'

export type InspectorPanel = 'observability' | 'topology' | 'policy'

export interface DrillDownAvailability {
  observability: boolean
  topology: boolean
  policy: boolean
  observabilityHint: string
  topologyHint: string
  policyHint: string
}

export function resolveDrillDownAvailability(
  finding: FinOpsFinding | null,
  proposal: OptimizationProposal | null,
  run: FinOpsRun | null,
): DrillDownAvailability {
  const mlt = resolveMltCore(finding)
  const topo = finding
    ? resolveTopologyCore(resolveTopologyFinding(finding).finding)
    : null

  const hasObs = Boolean(
    finding &&
      (mlt.hasAnyCore ||
        finding.promql ||
        finding.logql ||
        finding.reason ||
        proposal?.evidence_summary ||
        proposal?.cpu_utilization_trend?.length),
  )

  const hasTopo = Boolean(topo?.hasCore || topo?.hasGraphDiff)

  const mltTags = mlt.activePillars.map((p) => p.charAt(0).toUpperCase()).join('·') || '—'
  const topoParts: string[] = []
  if (topo?.proposalImpact) topoParts.push('diff')
  if (topo?.changeEvents.length) topoParts.push(`변경 ${topo.changeEvents.length}`)
  if (topo?.hasGraphDiff) topoParts.push('그래프')

  const hasPolicy = Boolean(
    proposal?.sla_impact_detail ||
      finding?.guard_reason ||
      finding?.guard_status ||
      run?.data_quality_summary?.rca_linked ||
      run?.findings_snapshot?.executive_report?.rca_summary,
  )

  const policyParts: string[] = []
  if (finding?.guard_status) policyParts.push(finding.guard_status.toUpperCase())
  if (run?.data_quality_summary?.rca_linked) policyParts.push('RCA')

  return {
    observability: hasObs,
    topology: hasTopo,
    policy: hasPolicy,
    observabilityHint: hasObs ? `M/L/T ${mltTags}` : '데이터 없음',
    topologyHint: hasTopo ? topoParts.join(' · ') || '맥락' : '스냅샷 없음',
    policyHint: hasPolicy ? policyParts.join(' · ') || 'SLA' : '—',
  }
}

export const INSPECTOR_PANEL_LABELS: Record<InspectorPanel, string> = {
  observability: '관측 증거',
  topology: '토폴로지·what-if',
  policy: 'SLA·정책',
}

export type TopologyLayer = 'resource' | 'design'
export type TopologyView = 'as-is' | 'to-be' | 'diff'

export const TOPOLOGY_LAYER_LABELS: Record<TopologyLayer, string> = {
  resource: '인프라',
  design: '아키텍처 설계',
}

export const TOPOLOGY_VIEW_LABELS: Record<TopologyView, string> = {
  'as-is': '현재 상태',
  'to-be': '적용 후',
  diff: '변경 비교',
}

export const TOPOLOGY_VIEW_HINTS: Record<TopologyView, string> = {
  'as-is': '운영 중인 구성',
  'to-be': '제안 반영 시',
  diff: '무엇이 바뀌나',
}

/** URL query 값 (하이픈 없음) */
export function topologyViewToQuery(view: TopologyView): string {
  if (view === 'as-is') return 'asis'
  if (view === 'to-be') return 'tobe'
  return 'diff'
}

export function topologyViewFromQuery(raw?: string | null): TopologyView | null {
  if (raw === 'asis') return 'as-is'
  if (raw === 'tobe') return 'to-be'
  if (raw === 'diff') return 'diff'
  return null
}

export function topologyLayerFromQuery(raw?: string | null): TopologyLayer | null {
  if (raw === 'resource' || raw === 'design') return raw
  return null
}

export function inspectorPanelFromQuery(raw?: string | null): InspectorPanel | null {
  if (raw === 'observability' || raw === 'topology' || raw === 'policy') return raw
  return null
}
