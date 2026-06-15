import type { FinOpsFinding, TopologyContext, TopologyProposalImpact } from '../types/finops.schema'

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

const DEMO_RESOURCE_GRAPH = {
  source: 'demo',
  nodes: [
    { id: 'alb-prod-01', label: 'alb-prod-01 (alb)', resource_type: 'alb', status: 'active' },
    { id: 'i-demo-idle-01', label: 'i-demo-idle-01 (ec2)', resource_type: 'ec2', status: 'active' },
    { id: 'db-prod-01', label: 'db-prod-01 (rds)', resource_type: 'rds', status: 'active' },
  ],
  edges: [
    { from: 'alb-prod-01', to: 'i-demo-idle-01', dependency_type: 'traffic' },
    { from: 'i-demo-idle-01', to: 'db-prod-01', dependency_type: 'data' },
  ],
  node_count: 3,
  edge_count: 2,
}

const DEMO_DESIGN_DIAGRAM = {
  topology_id: 'demo-api-gateway-standard',
  concept: 'standard',
  display_name: 'api-gateway · Standard',
  source: 'demo',
  nodes: [
    { nodeId: 'route53-1', type: 'route53', label: 'Route 53', groupId: null },
    { nodeId: 'alb-1', type: 'elb', label: 'ALB', groupId: 'g-public' },
    { nodeId: 'c1-1', type: 'ec2', label: 'api-gateway (EC2)', groupId: 'g-private-a' },
    { nodeId: 'rds-1', type: 'rds', label: 'RDS', groupId: 'g-db' },
  ],
  edges: [
    { edgeId: 'e-alb-c1', from: 'alb-1', to: 'c1-1' },
    { edgeId: 'e-c1-rds', from: 'c1-1', to: 'rds-1' },
  ],
  groups: [
    { groupId: 'g-vpc', label: 'VPC · ap-northeast-2', type: 'vpc' },
    { groupId: 'g-public', label: 'Public Subnet', type: 'public-subnet', parentGroupId: 'g-vpc' },
    { groupId: 'g-private-a', label: 'Private Subnet A', type: 'private-subnet', parentGroupId: 'g-vpc' },
    { groupId: 'g-db', label: 'DB Subnet', type: 'db-subnet', parentGroupId: 'g-vpc' },
  ],
}

function inferTypes(resourceId: string, resourceType?: string): Set<string> {
  const rid = resourceId.toLowerCase()
  const rtype = (resourceType ?? '').toLowerCase()
  const hits = new Set<string>()
  if (rtype) hits.add(rtype)
  if (rid.startsWith('i-') || rtype.includes('ec2')) hits.add('ec2')
  if (rid.includes('alb') || rtype.includes('alb')) hits.add('elb')
  if (rid.startsWith('db-') || rtype.includes('rds')) hits.add('rds')
  return hits
}

function buildClientProposalImpact(
  resourceId: string,
  action: string,
): TopologyProposalImpact | undefined {
  const act = action.toLowerCase()
  if (!['stop', 'delete', 'downsize', 'resize', 'schedule'].includes(act)) return undefined
  if (!DEMO_RESOURCE_GRAPH.nodes.some((n) => n.id === resourceId)) return undefined

  const broken = DEMO_RESOURCE_GRAPH.edges.filter(
    (e) => e.from === resourceId || e.to === resourceId,
  )
  const affectedPeers = broken
    .flatMap((e) => [e.from, e.to])
    .filter((id) => id !== resourceId)
    .map((id) => ({
      resource_id: id,
      resource_type: DEMO_RESOURCE_GRAPH.nodes.find((n) => n.id === id)?.resource_type,
    }))

  const structural = act === 'stop' || act === 'delete'
  return {
    action: act,
    target_resource_id: resourceId,
    as_is: { node_count: 3, edge_count: 2 },
    to_be: {
      node_count: structural ? 2 : 3,
      edge_count: structural ? broken.length === 2 ? 0 : 1 : 2,
    },
    removed_nodes: structural
      ? DEMO_RESOURCE_GRAPH.nodes.filter((n) => n.id === resourceId).map((n) => ({ ...n, change: act }))
      : [],
    modified_nodes: !structural
      ? DEMO_RESOURCE_GRAPH.nodes.filter((n) => n.id === resourceId).map((n) => ({ ...n, change: act, status: 'capacity_reduced' }))
      : [],
    broken_edges: broken.map((e) => ({ ...e, reason: `source ${act}` })),
    affected_peers: affectedPeers,
    impact_level: structural && broken.length > 0 ? 'high' : 'medium',
    summary: structural
      ? `${act} 시 연결 리소스 ${affectedPeers.length}개 영향 (demo)`
      : `${act} — 용량 변경 (demo)`,
    graph_source: 'demo',
  }
}

function buildClientDesignImpact(
  resourceId: string,
  resourceType: string | undefined,
  action: string,
) {
  const act = action.toLowerCase()
  const types = inferTypes(resourceId, resourceType)
  const matched = DEMO_DESIGN_DIAGRAM.nodes.filter((n) => types.has(n.type ?? ''))
  if (!matched.length) return undefined

  const matchedIds = new Set(matched.map((n) => n.nodeId))
  const broken = DEMO_DESIGN_DIAGRAM.edges.filter(
    (e) => matchedIds.has(e.from) || matchedIds.has(e.to),
  )

  return {
    action: act,
    target_resource_id: resourceId,
    matched_design_nodes: matched.map((n) => ({
      nodeId: n.nodeId,
      type: n.type,
      label: n.label,
      match_reason: `type:${n.type}`,
    })),
    broken_edges: broken.map((e) => ({ ...e, reason: `design:${act}` })),
    affected_design_nodes: DEMO_DESIGN_DIAGRAM.nodes.filter(
      (n) => !matchedIds.has(n.nodeId)
        && broken.some((e) => e.from === n.nodeId || e.to === n.nodeId),
    ),
    impact_level: (act === 'stop' || act === 'delete') && broken.length ? 'high' : 'medium',
    summary: `설계 다이어그램 — ${matched.length}개 컴포넌트·${broken.length}개 연결에 ${act} 영향 (demo)`,
    diagram_source: 'demo',
  } as NonNullable<TopologyContext['design_proposal_impact']>
}

export function buildClientDemoTopologyContext(
  finding: Pick<FinOpsFinding, 'resource_id' | 'resource_type' | 'recommended_action'>,
): TopologyContext {
  const action = finding.recommended_action ?? 'stop'
  const proposalImpact = buildClientProposalImpact(finding.resource_id, action)
  const designProposalImpact = buildClientDesignImpact(
    finding.resource_id,
    finding.resource_type,
    action,
  )

  let finopsImpact: TopologyContext['finops_impact'] = 'review'
  if (proposalImpact?.impact_level === 'high' || designProposalImpact?.impact_level === 'high') {
    finopsImpact = 'defer_recommended'
  }

  return {
    source: 'demo',
    resource_graph: DEMO_RESOURCE_GRAPH,
    design_diagram: DEMO_DESIGN_DIAGRAM,
    proposal_impact: proposalImpact,
    design_proposal_impact: designProposalImpact,
    finops_impact: finopsImpact,
    change_events: [
      {
        occurred_at: new Date(Date.now() - 18 * 3600_000).toISOString(),
        change_type: 'deploy',
        summary: 'api-gateway staging rollout v2.4.1 (client demo)',
        resource_id: 'i-demo-idle-01',
        service_id: 'api-gateway',
        source: 'demo',
      },
    ],
    dependencies: {
      upstream: [{ service_id: 'payment-api', dependency_type: 'sync' }],
      downstream: [{ service_id: 'billing-api', dependency_type: 'async' }],
    },
  }
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
  if (hasTopologyPayload(ctx)) {
    return { finding, isClientFallback: false }
  }

  const demo = buildClientDemoTopologyContext(finding)
  return {
    finding: { ...finding, topology_context: demo },
    isClientFallback: true,
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
