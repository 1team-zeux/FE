/** Rich client-side topology for FinOps inspector demo / local screen recording. */
import type { TopologyContext, TopologyProposalImpact } from '../types/finops.schema'

export const DEMO_RESOURCE_GRAPH = {
  source: 'demo',
  nodes: [
    { id: 'alb-prod-payment', label: 'ALB payment-prod', resource_type: 'alb', status: 'active' },
    { id: 'i-payment-api-01', label: 'payment-api-01', resource_type: 'ec2', status: 'active' },
    { id: 'i-payment-api-02', label: 'payment-api-02', resource_type: 'ec2', status: 'active' },
    { id: 'i-demo-idle-01', label: 'idle-batch (EC2)', resource_type: 'ec2', status: 'idle' },
    { id: 'i-batch-worker-01', label: 'batch-settlement', resource_type: 'ec2', status: 'active' },
    { id: 'nat-gw-prod-01', label: 'NAT Gateway', resource_type: 'nat', status: 'active' },
    { id: 'db-payment-primary', label: 'RDS payment (primary)', resource_type: 'rds', status: 'active' },
    { id: 'db-payment-replica', label: 'RDS read-replica', resource_type: 'rds', status: 'active' },
    { id: 'elasticache-payment', label: 'ElastiCache sessions', resource_type: 'elasticache', status: 'active' },
    { id: 'lambda-webhook', label: 'Webhook processor', resource_type: 'lambda', status: 'active' },
    { id: 'sqs-settlement', label: 'SQS settlement', resource_type: 'sqs', status: 'active' },
    { id: 's3-logs-payment', label: 'S3 audit logs', resource_type: 's3', status: 'active' },
  ],
  edges: [
    { from: 'alb-prod-payment', to: 'i-payment-api-01', dependency_type: 'traffic' },
    { from: 'alb-prod-payment', to: 'i-payment-api-02', dependency_type: 'traffic' },
    { from: 'i-payment-api-01', to: 'elasticache-payment', dependency_type: 'cache' },
    { from: 'i-payment-api-02', to: 'elasticache-payment', dependency_type: 'cache' },
    { from: 'i-payment-api-01', to: 'db-payment-primary', dependency_type: 'data' },
    { from: 'i-payment-api-02', to: 'db-payment-primary', dependency_type: 'data' },
    { from: 'db-payment-primary', to: 'db-payment-replica', dependency_type: 'replication' },
    { from: 'i-batch-worker-01', to: 'db-payment-primary', dependency_type: 'data' },
    { from: 'i-batch-worker-01', to: 'sqs-settlement', dependency_type: 'async' },
    { from: 'lambda-webhook', to: 'sqs-settlement', dependency_type: 'async' },
    { from: 'lambda-webhook', to: 'i-payment-api-01', dependency_type: 'sync' },
    { from: 'i-payment-api-01', to: 'nat-gw-prod-01', dependency_type: 'egress' },
    { from: 'i-payment-api-02', to: 'nat-gw-prod-01', dependency_type: 'egress' },
    { from: 'i-demo-idle-01', to: 'db-payment-primary', dependency_type: 'data' },
    { from: 'i-payment-api-01', to: 's3-logs-payment', dependency_type: 'logs' },
  ],
  node_count: 12,
  edge_count: 15,
} as const

export const DEMO_DESIGN_DIAGRAM = {
  topology_id: 'skala-commerce-payment',
  concept: 'standard',
  display_name: 'SKALA Commerce · payment-api',
  source: 'demo',
  nodes: [
    { nodeId: 'route53-1', type: 'route53', label: 'Route 53', groupId: 'g-edge' },
    { nodeId: 'alb-1', type: 'elb', label: 'ALB', groupId: 'g-public-a' },
    { nodeId: 'payment-api-1', type: 'ec2', label: 'payment-api', groupId: 'g-private-a' },
    { nodeId: 'payment-api-2', type: 'ec2', label: 'payment-api (standby)', groupId: 'g-private-b' },
    { nodeId: 'order-api-1', type: 'ec2', label: 'order-api', groupId: 'g-private-a' },
    { nodeId: 'notification-api-1', type: 'ec2', label: 'notification-api', groupId: 'g-private-b' },
    { nodeId: 'batch-1', type: 'ec2', label: 'settlement-batch', groupId: 'g-private-a' },
    { nodeId: 'nat-1', type: 'nat', label: 'NAT GW', groupId: 'g-public-a' },
    { nodeId: 'rds-primary', type: 'rds', label: 'RDS Primary', groupId: 'g-db' },
    { nodeId: 'rds-replica', type: 'rds', label: 'RDS Replica', groupId: 'g-db' },
    { nodeId: 'cache-1', type: 'elasticache', label: 'ElastiCache', groupId: 'g-db' },
    { nodeId: 'lambda-1', type: 'lambda', label: 'Webhook λ', groupId: 'g-private-b' },
    { nodeId: 'eventbridge-1', type: 'eventbridge', label: 'EventBridge', groupId: 'g-private-b' },
  ],
  edges: [
    { edgeId: 'e-r53-alb', from: 'route53-1', to: 'alb-1' },
    { edgeId: 'e-alb-p1', from: 'alb-1', to: 'payment-api-1' },
    { edgeId: 'e-alb-p2', from: 'alb-1', to: 'payment-api-2' },
    { edgeId: 'e-alb-order', from: 'alb-1', to: 'order-api-1' },
    { edgeId: 'e-p1-cache', from: 'payment-api-1', to: 'cache-1' },
    { edgeId: 'e-p2-cache', from: 'payment-api-2', to: 'cache-1' },
    { edgeId: 'e-p1-rds', from: 'payment-api-1', to: 'rds-primary' },
    { edgeId: 'e-order-rds', from: 'order-api-1', to: 'rds-primary' },
    { edgeId: 'e-batch-rds', from: 'batch-1', to: 'rds-primary' },
    { edgeId: 'e-rds-rep', from: 'rds-primary', to: 'rds-replica' },
    { edgeId: 'e-lambda-ev', from: 'lambda-1', to: 'eventbridge-1' },
    { edgeId: 'e-notify-ev', from: 'notification-api-1', to: 'eventbridge-1' },
    { edgeId: 'e-p1-nat', from: 'payment-api-1', to: 'nat-1' },
  ],
  groups: [
    { groupId: 'g-vpc', label: 'VPC · ap-northeast-2', type: 'vpc' },
    { groupId: 'g-edge', label: 'Edge / DNS', type: 'public-subnet', parentGroupId: 'g-vpc' },
    { groupId: 'g-public-a', label: 'Public Subnet A', type: 'public-subnet', parentGroupId: 'g-vpc' },
    { groupId: 'g-private-a', label: 'Private Subnet A', type: 'private-subnet', parentGroupId: 'g-vpc' },
    { groupId: 'g-private-b', label: 'Private Subnet B', type: 'private-subnet', parentGroupId: 'g-vpc' },
    { groupId: 'g-db', label: 'DB Subnet (isolated)', type: 'db-subnet', parentGroupId: 'g-vpc' },
  ],
} as const

const STRUCTURAL_ACTIONS = new Set(['stop', 'delete'])

function inferTypes(resourceId: string, resourceType?: string): Set<string> {
  const rid = resourceId.toLowerCase()
  const rtype = (resourceType ?? '').toLowerCase()
  const hits = new Set<string>()
  if (rtype) hits.add(rtype)
  if (rid.startsWith('i-') || rtype.includes('ec2')) hits.add('ec2')
  if (rid.includes('alb') || rtype.includes('alb') || rtype.includes('elb')) hits.add('elb')
  if (rid.startsWith('db-') || rtype.includes('rds')) hits.add('rds')
  if (rid.includes('nat') || rtype.includes('nat')) hits.add('nat')
  if (rid.includes('cache') || rtype.includes('elasticache')) hits.add('elasticache')
  if (rid.includes('lambda') || rtype.includes('lambda')) hits.add('lambda')
  if (rid.includes('sqs')) hits.add('sqs')
  return hits
}

/** Map API finding resource_id to a node in the demo resource graph. */
export function resolveDemoResourceNodeId(resourceId: string, resourceType?: string): string | null {
  const graph = DEMO_RESOURCE_GRAPH
  if (graph.nodes.some((n) => n.id === resourceId)) return resourceId

  const rid = resourceId.toLowerCase()
  if (rid.includes('idle') || rid.includes('demo')) return 'i-demo-idle-01'
  if (rid.includes('payment') && rid.startsWith('i-')) {
    return graph.nodes.find((n) => n.id === 'i-payment-api-01')?.id ?? null
  }
  if (rid.includes('nat')) return 'nat-gw-prod-01'
  if (rid.includes('db') || rid.includes('rds')) return 'db-payment-primary'
  if (rid.includes('cache') || rid.includes('redis')) return 'elasticache-payment'
  if (rid.includes('lambda')) return 'lambda-webhook'
  if (rid.includes('alb')) return 'alb-prod-payment'

  const types = inferTypes(resourceId, resourceType)
  for (const node of graph.nodes) {
    if (types.has(node.resource_type)) return node.id
  }
  return graph.nodes.find((n) => n.resource_type === 'ec2')?.id ?? null
}

export function buildDemoProposalImpact(
  resourceId: string,
  action: string,
  resourceType?: string,
): TopologyProposalImpact | undefined {
  const act = action.toLowerCase()
  if (!['stop', 'delete', 'downsize', 'resize', 'schedule'].includes(act)) return undefined

  const targetId = resolveDemoResourceNodeId(resourceId, resourceType)
  if (!targetId) return undefined

  const graph = DEMO_RESOURCE_GRAPH
  const broken = graph.edges.filter((e) => e.from === targetId || e.to === targetId)
  const affectedPeers = broken
    .flatMap((e) => [e.from, e.to])
    .filter((id) => id !== targetId)
    .map((id) => ({
      resource_id: id,
      resource_type: graph.nodes.find((n) => n.id === id)?.resource_type,
    }))

  const structural = STRUCTURAL_ACTIONS.has(act)
  const removedNodes = structural
    ? graph.nodes.filter((n) => n.id === targetId).map((n) => ({ ...n, change: act }))
    : []
  const modifiedNodes = !structural
    ? graph.nodes.filter((n) => n.id === targetId).map((n) => ({
        ...n,
        change: act,
        status: 'capacity_reduced',
      }))
    : []

  const asIsNodes = graph.nodes.length
  const asIsEdges = graph.edges.length
  const toBeNodes = structural ? asIsNodes - removedNodes.length : asIsNodes
  const toBeEdges = structural
    ? graph.edges.filter((e) => e.from !== targetId && e.to !== targetId).length
    : asIsEdges

  const peerCount = new Set(affectedPeers.map((p) => p.resource_id)).size
  const targetLabel = graph.nodes.find((n) => n.id === targetId)?.label ?? targetId

  return {
    action: act,
    target_resource_id: targetId,
    as_is: { node_count: asIsNodes, edge_count: asIsEdges },
    to_be: { node_count: toBeNodes, edge_count: toBeEdges },
    removed_nodes: removedNodes,
    modified_nodes: modifiedNodes,
    broken_edges: broken.map((e) => ({ ...e, reason: `${targetLabel} ${act}` })),
    affected_peers: affectedPeers,
    impact_level:
      structural && broken.length >= 2 ? 'high' : structural || peerCount >= 2 ? 'medium' : 'low',
    summary: structural
      ? `「${targetLabel}」 ${act} 시 연결 ${broken.length}건 단절 · 영향 리소스 ${peerCount}개`
      : `「${targetLabel}」 ${act} — 용량 조정 (연결 ${graph.edges.length - broken.length}건 유지)`,
    graph_source: 'demo',
  }
}

export function buildDemoDesignImpact(
  resourceId: string,
  resourceType: string | undefined,
  action: string,
) {
  const act = action.toLowerCase()
  const types = inferTypes(resourceId, resourceType)
  const resolvedId = resolveDemoResourceNodeId(resourceId, resourceType)
  if (resolvedId) {
    const resNode = DEMO_RESOURCE_GRAPH.nodes.find((n) => n.id === resolvedId)
    if (resNode?.resource_type) types.add(resNode.resource_type)
    if (resNode?.resource_type === 'ec2' && resolvedId.includes('payment')) {
      types.add('ec2')
    }
  }

  const matched = DEMO_DESIGN_DIAGRAM.nodes.filter((n) => types.has(n.type ?? ''))
  if (!matched.length) return undefined

  const matchedIds = new Set(matched.map((n) => n.nodeId))
  const broken = DEMO_DESIGN_DIAGRAM.edges.filter(
    (e) => matchedIds.has(e.from) || matchedIds.has(e.to),
  )
  const affected = DEMO_DESIGN_DIAGRAM.nodes.filter(
    (n) =>
      !matchedIds.has(n.nodeId)
      && broken.some((e) => e.from === n.nodeId || e.to === n.nodeId),
  )

  const structural = STRUCTURAL_ACTIONS.has(act)
  const level =
    structural && broken.length >= 3 ? 'high' : structural || matched.length >= 2 ? 'medium' : 'low'

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
    affected_design_nodes: affected,
    impact_level: level,
    summary: `설계 뷰 — ${matched.length}개 컴포넌트 · ${broken.length}개 연결에 ${act} 영향 (${affected.length}개 인접 서비스)`,
    diagram_source: 'demo',
  } as NonNullable<TopologyContext['design_proposal_impact']>
}

export function buildDemoTopologyContext(
  finding: { resource_id: string; resource_type?: string | null; recommended_action?: string | null },
): TopologyContext {
  const action = finding.recommended_action ?? 'stop'
  const proposalImpact = buildDemoProposalImpact(
    finding.resource_id,
    action,
    finding.resource_type ?? undefined,
  )
  const designProposalImpact = buildDemoDesignImpact(
    finding.resource_id,
    finding.resource_type ?? undefined,
    action,
  )

  let finopsImpact: TopologyContext['finops_impact'] = 'review'
  if (proposalImpact?.impact_level === 'high' || designProposalImpact?.impact_level === 'high') {
    finopsImpact = 'defer_recommended'
  }

  const now = Date.now()
  return {
    source: 'demo',
    recent_change_within_hours: 36,
    resource_graph: {
      ...DEMO_RESOURCE_GRAPH,
      nodes: [...DEMO_RESOURCE_GRAPH.nodes],
      edges: [...DEMO_RESOURCE_GRAPH.edges],
    },
    design_diagram: {
      ...DEMO_DESIGN_DIAGRAM,
      nodes: [...DEMO_DESIGN_DIAGRAM.nodes],
      edges: [...DEMO_DESIGN_DIAGRAM.edges],
      groups: [...DEMO_DESIGN_DIAGRAM.groups],
    },
    proposal_impact: proposalImpact,
    design_proposal_impact: designProposalImpact,
    finops_impact: finopsImpact,
    rca_link: {
      cause_type: 'error_burst',
      incident_id: 'INC-2026-0618-042',
    },
    change_events: [
      {
        occurred_at: new Date(now - 6 * 3600_000).toISOString(),
        change_type: 'deploy',
        summary: 'payment-api v2.8.3 rollout — ASG instance refresh (2/2 healthy)',
        resource_id: 'i-payment-api-02',
        service_id: 'payment-api',
        source: 'demo',
      },
      {
        occurred_at: new Date(now - 18 * 3600_000).toISOString(),
        change_type: 'scale',
        summary: 'batch-settlement ASG scale-out +1 (Black Friday prep)',
        resource_id: 'i-batch-worker-01',
        service_id: 'settlement-batch',
        source: 'demo',
      },
      {
        occurred_at: new Date(now - 28 * 3600_000).toISOString(),
        change_type: 'config_change',
        summary: 'RDS parameter group — max_connections 200→300',
        resource_id: 'db-payment-primary',
        service_id: 'payment-api',
        source: 'demo',
      },
      {
        occurred_at: new Date(now - 42 * 3600_000).toISOString(),
        change_type: 'topology',
        summary: 'NAT Gateway AZ failover drill — route table update',
        resource_id: 'nat-gw-prod-01',
        service_id: 'payment-api',
        source: 'demo',
      },
    ],
    dependencies: {
      upstream: [
        { service_id: 'api-gateway', dependency_type: 'sync' },
        { service_id: 'order-api', dependency_type: 'sync' },
        { service_id: 'customer-portal', dependency_type: 'async' },
      ],
      downstream: [
        { service_id: 'billing-api', dependency_type: 'async' },
        { service_id: 'notification-api', dependency_type: 'async' },
        { service_id: 'settlement-batch', dependency_type: 'batch' },
        { service_id: 'fraud-detection', dependency_type: 'sync' },
      ],
    },
  }
}
