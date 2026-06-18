import type { FinOpsFinding, TopologyContext, TopologyProposalImpact } from '../types/finops.schema'
import { buildDemoTopologyContext } from '../data/topologyDemoCatalog'

export interface TopologyCoreView {
  hasCore: boolean
  changeEvents: NonNullable<TopologyContext['change_events']>
  upstream: NonNullable<TopologyContext['dependencies']>['upstream']
  downstream: NonNullable<TopologyContext['dependencies']>['downstream']
  recentHours: number | null | undefined
  finopsImpact: TopologyContext['finops_impact']
  rcaLink: TopologyContext['rca_link']
  source?: string
  resourceGraph: NonNullable<TopologyContext['resource_graph']>
  proposalImpact?: TopologyProposalImpact
  designDiagram: NonNullable<TopologyContext['design_diagram']>
  designProposalImpact?: TopologyContext['design_proposal_impact']
  hasGraphDiff: boolean
  isClientFallback: boolean
}

const CHANGE_TYPE_LABEL: Record<string, string> = {
  deploy: '배포',
  config_change: '설정 변경',
  resize: '스케일',
  topology: '토폴로지',
  scale: '스케일',
}

const IMPACT_LEVEL_LABEL: Record<string, string> = {
  high: '높음',
  medium: '중간',
  low: '낮음',
}

export function buildClientDemoTopologyContext(
  finding: Pick<FinOpsFinding, 'resource_id' | 'resource_type' | 'recommended_action'>,
): TopologyContext {
  return buildDemoTopologyContext(finding)
}

function hasTopologyPayload(ctx?: TopologyContext): boolean {
  if (!ctx) return false
  return Boolean(
    ctx.change_events?.length
    || ctx.resource_graph?.nodes?.length
    || ctx.design_diagram?.nodes?.length
    || ctx.proposal_impact
    || ctx.design_proposal_impact
    || ctx.dependencies?.upstream?.length
    || ctx.dependencies?.downstream?.length,
  )
}

/** Merge finding + proposal topology fields; apply client demo when snapshot lacks BE data. */
export function resolveTopologyFinding(
  finding: FinOpsFinding | null | undefined,
): { finding: FinOpsFinding | null; isClientFallback: boolean } {
  if (!finding?.resource_id) return { finding: null, isClientFallback: false }

  const ctx = finding.topology_context
  if (!hasTopologyPayload(ctx)) {
    const demo = buildClientDemoTopologyContext(finding)
    return {
      finding: { ...finding, topology_context: demo },
      isClientFallback: true,
    }
  }

  const needsResource = !(ctx!.resource_graph?.nodes?.length)
  const needsDesign = !(ctx!.design_diagram?.nodes?.length)
  if (!needsResource && !needsDesign) {
    return { finding, isClientFallback: false }
  }

  const demo = buildClientDemoTopologyContext(finding)
  const merged: TopologyContext = {
    ...ctx!,
    ...(needsResource
      ? {
          resource_graph: demo.resource_graph,
          proposal_impact: ctx!.proposal_impact ?? demo.proposal_impact,
        }
      : {}),
    ...(needsDesign
      ? {
          design_diagram: demo.design_diagram,
          design_proposal_impact: ctx!.design_proposal_impact ?? demo.design_proposal_impact,
        }
      : {}),
  }

  return {
    finding: { ...finding, topology_context: merged },
    isClientFallback: needsResource || needsDesign,
  }
}

export function changeTypeLabel(changeType: string): string {
  return CHANGE_TYPE_LABEL[changeType] ?? changeType
}

export function impactLevelLabel(level?: string): string {
  if (!level) return '—'
  return IMPACT_LEVEL_LABEL[level] ?? level
}

export function impactLevelClass(level?: string): string {
  if (level === 'high') return 'text-red-700 bg-red-500/10 border-red-500/25'
  if (level === 'medium') return 'text-amber-700 bg-amber-500/10 border-amber-500/25'
  return 'text-gray-600 bg-gray-100 border-border'
}

export function finopsImpactLabel(impact?: TopologyContext['finops_impact']): string {
  if (impact === 'defer_recommended') return '조치 보류 권장'
  if (impact === 'review') return '검토 필요'
  return '영향 없음'
}

export function finopsImpactClass(impact?: TopologyContext['finops_impact']): string {
  if (impact === 'defer_recommended') return 'text-amber-700 bg-amber-500/10 border-amber-500/25'
  if (impact === 'review') return 'text-brand bg-brand/5 border-brand/20'
  return 'text-gray-500 bg-gray-100 border-border'
}

export function formatTopologyTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function resolveTopologyCore(
  finding: FinOpsFinding | null | undefined,
): TopologyCoreView {
  const { finding: resolved, isClientFallback } = resolveTopologyFinding(finding)
  const empty: TopologyCoreView = {
    hasCore: false,
    changeEvents: [],
    upstream: [],
    downstream: [],
    recentHours: null,
    finopsImpact: 'none',
    rcaLink: undefined,
    resourceGraph: { nodes: [], edges: [] },
    proposalImpact: undefined,
    designDiagram: { nodes: [], edges: [] },
    designProposalImpact: undefined,
    hasGraphDiff: false,
    isClientFallback: false,
  }
  if (!resolved) return empty

  const ctx = resolved.topology_context
  if (!ctx) return empty

  const changeEvents = ctx.change_events ?? []
  const upstream = ctx.dependencies?.upstream ?? []
  const downstream = ctx.dependencies?.downstream ?? []
  const resourceGraph = ctx.resource_graph ?? { nodes: [], edges: [] }
  const proposalImpact = ctx.proposal_impact
  const designDiagram = ctx.design_diagram ?? { nodes: [], edges: [] }
  const designProposalImpact = ctx.design_proposal_impact
  const hasGraph = (resourceGraph.nodes?.length ?? 0) > 0
  const hasDesign = (designDiagram.nodes?.length ?? 0) > 0
  const hasCore =
    changeEvents.length > 0
    || upstream.length > 0
    || downstream.length > 0
    || hasGraph
    || hasDesign
    || Boolean(proposalImpact)
    || Boolean(designProposalImpact)

  return {
    hasCore,
    changeEvents,
    upstream,
    downstream,
    recentHours: ctx.recent_change_within_hours,
    finopsImpact: ctx.finops_impact ?? 'none',
    rcaLink: ctx.rca_link,
    source: ctx.source,
    resourceGraph,
    proposalImpact,
    designDiagram,
    designProposalImpact,
    hasGraphDiff: Boolean(proposalImpact || designProposalImpact),
    isClientFallback,
  }
}

export function findingToTopologyMetrics(finding: FinOpsFinding) {
  const { finding: resolved } = resolveTopologyFinding(finding)
  return {
    topology_context: resolved?.topology_context,
  }
}
