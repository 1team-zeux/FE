import type { TopologyContext } from '../types/finops.schema'

export type VizNodeState = 'normal' | 'target' | 'removed' | 'modified' | 'affected'

export interface TopologyVizNode {
  id: string
  label: string
  iconType: string
  x: number
  y: number
  state: VizNodeState
  groupId?: string | null
}

export interface TopologyVizEdge {
  id: string
  from: string
  to: string
  broken?: boolean
  label?: string
}

export interface TopologyVizGroup {
  id: string
  label: string
  type: string
  x: number
  y: number
  width: number
  height: number
}

export interface TopologyVizModel {
  nodes: TopologyVizNode[]
  edges: TopologyVizEdge[]
  groups: TopologyVizGroup[]
  width: number
  height: number
}

const NW = 88
const NH = 76
const COL_GAP = 160
const ROW_GAP = 96
const MARGIN = 48

function mapIconType(raw?: string | null): string {
  const t = (raw ?? '').toLowerCase()
  if (t.includes('alb') || t === 'elb') return 'elb'
  if (t.includes('ec2') || t.startsWith('i-')) return 'ec2'
  if (t.includes('rds') || t.includes('db')) return 'rds'
  if (t.includes('nat')) return 'nat'
  if (t.includes('lambda')) return 'lambda'
  if (t.includes('ecs')) return 'ecs'
  if (t.includes('route53')) return 'route53'
  if (t.includes('igw')) return 'igw'
  if (t.includes('elasticache')) return 'elasticache'
  if (t.includes('eventbridge')) return 'eventbridge'
  return t || 'ec2'
}

function layoutDag(
  nodeIds: string[],
  edges: Array<{ from: string; to: string }>,
): Map<string, { x: number; y: number }> {
  const depth = new Map<string, number>()
  for (const id of nodeIds) depth.set(id, 0)

  for (let pass = 0; pass < nodeIds.length; pass++) {
    for (const e of edges) {
      if (!nodeIds.includes(e.from) || !nodeIds.includes(e.to)) continue
      const next = (depth.get(e.from) ?? 0) + 1
      if (next > (depth.get(e.to) ?? 0)) depth.set(e.to, next)
    }
  }

  const byDepth = new Map<number, string[]>()
  for (const id of nodeIds) {
    const d = depth.get(id) ?? 0
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(id)
  }

  const pos = new Map<string, { x: number; y: number }>()
  for (const [d, ids] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    const col = Number(d)
    ids.forEach((id, row) => {
      const total = ids.length
      const yOffset = ((total - 1) * ROW_GAP) / 2
      pos.set(id, {
        x: MARGIN + col * COL_GAP,
        y: MARGIN + row * ROW_GAP - yOffset + 80,
      })
    })
  }
  return pos
}

function bounds(nodes: TopologyVizNode[], groups: TopologyVizGroup[]) {
  const xs: number[] = []
  const ys: number[] = []
  for (const n of nodes) {
    xs.push(n.x - NW / 2, n.x + NW / 2)
    ys.push(n.y - NH / 2, n.y + NH / 2)
  }
  for (const g of groups) {
    xs.push(g.x, g.x + g.width)
    ys.push(g.y, g.y + g.height)
  }
  if (!xs.length) return { width: 400, height: 220 }
  const minX = Math.min(...xs) - 24
  const maxX = Math.max(...xs) + 24
  const minY = Math.min(...ys) - 24
  const maxY = Math.max(...ys) + 24
  return { width: maxX - minX, height: maxY - minY, minX, minY }
}

function buildGroupsFromDesign(
  groups: Array<{ groupId?: string; label?: string; type?: string }>,
  nodes: TopologyVizNode[],
): TopologyVizGroup[] {
  if (!groups.length) return []
  const GROUP_PAD: Record<string, number> = {
    vpc: 40,
    'public-subnet': 24,
    'private-subnet': 24,
    'db-subnet': 24,
  }

  const out: TopologyVizGroup[] = []
  for (const g of groups) {
    const gid = g.groupId ?? ''
    const related = nodes.filter((n) => n.groupId === gid)
    if (!related.length) continue
    const minX = Math.min(...related.map((n) => n.x - NW / 2))
    const maxX = Math.max(...related.map((n) => n.x + NW / 2))
    const minY = Math.min(...related.map((n) => n.y - NH / 2))
    const maxY = Math.max(...related.map((n) => n.y + NH / 2))
    const type = g.type ?? 'vpc'
    const pad = GROUP_PAD[type] ?? 24
    out.push({
      id: gid,
      label: g.label ?? gid,
      type,
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    })
  }
  return out
}

export function buildResourceGraphViz(
  ctx: TopologyContext,
  targetResourceId?: string,
): TopologyVizModel | null {
  return buildResourceGraphAsIsViz(ctx, targetResourceId)
}

export function buildResourceGraphAsIsViz(
  ctx: TopologyContext,
  targetResourceId?: string,
): TopologyVizModel | null {
  const graph = ctx.resource_graph
  if (!graph?.nodes?.length) return null

  const edges = (graph.edges ?? []).map((e, i) => ({
    from: e.from,
    to: e.to,
    id: `re-${i}`,
    label: e.dependency_type,
  }))
  const nodeIds = graph.nodes.map((n) => n.id)
  const pos = layoutDag(nodeIds, edges)

  const removed = new Set((ctx.proposal_impact?.removed_nodes ?? []).map((n) => n.id))
  const modified = new Set((ctx.proposal_impact?.modified_nodes ?? []).map((n) => n.id))
  const affected = new Set((ctx.proposal_impact?.affected_peers ?? []).map((p) => p.resource_id))
  const broken = new Set(
    (ctx.proposal_impact?.broken_edges ?? []).map((e) => `${e.from}->${e.to}`),
  )

  const nodes: TopologyVizNode[] = graph.nodes.map((n) => {
    const p = pos.get(n.id) ?? { x: MARGIN, y: MARGIN }
    let state: VizNodeState = 'normal'
    if (n.id === targetResourceId) state = 'target'
    else if (removed.has(n.id)) state = 'removed'
    else if (modified.has(n.id)) state = 'modified'
    else if (affected.has(n.id)) state = 'affected'
    return {
      id: n.id,
      label: n.label ?? n.id,
      iconType: mapIconType(n.resource_type),
      x: p.x,
      y: p.y,
      state,
    }
  })

  const vizEdges: TopologyVizEdge[] = edges.map((e) => ({
    id: e.id,
    from: e.from,
    to: e.to,
    label: e.label,
    broken: broken.has(`${e.from}->${e.to}`),
  }))

  const b = bounds(nodes, [])
  return {
    nodes,
    edges: vizEdges,
    groups: [],
    width: b.width ?? 400,
    height: b.height ?? 220,
  }
}

export function buildResourceGraphToBeViz(
  ctx: TopologyContext,
  targetResourceId?: string,
): TopologyVizModel | null {
  const asIs = buildResourceGraphAsIsViz(ctx, targetResourceId)
  const impact = ctx.proposal_impact
  if (!asIs || !impact) return null

  const removed = new Set((impact.removed_nodes ?? []).map((n) => n.id))
  const modified = new Set((impact.modified_nodes ?? []).map((n) => n.id))

  const nodes = asIs.nodes
    .filter((n) => !removed.has(n.id))
    .map((n) => ({
      ...n,
      state: (modified.has(n.id) ? 'modified' : 'normal') as VizNodeState,
    }))

  const alive = new Set(nodes.map((n) => n.id))
  const edges = asIs.edges
    .filter((e) => alive.has(e.from) && alive.has(e.to))
    .map((e) => ({ ...e, broken: false }))

  const b = bounds(nodes, [])
  return {
    nodes,
    edges,
    groups: [],
    width: b.width ?? asIs.width,
    height: b.height ?? asIs.height,
  }
}

export function buildDesignDiagramViz(
  ctx: TopologyContext,
  targetResourceId?: string,
): TopologyVizModel | null {
  return buildDesignDiagramAsIsViz(ctx, targetResourceId)
}

export function buildDesignDiagramAsIsViz(
  ctx: TopologyContext,
  targetResourceId?: string,
): TopologyVizModel | null {
  const diagram = ctx.design_diagram
  if (!diagram?.nodes?.length) return null

  const rawNodes = diagram.nodes
  const edges = (diagram.edges ?? []).map((e, i) => ({
    from: e.from,
    to: e.to,
    id: e.edgeId ?? `de-${i}`,
    label: undefined as string | undefined,
  }))

  const nodeIds = rawNodes.map((n) => n.nodeId)
  const pos = layoutDag(nodeIds, edges)

  const matched = new Set(
    (ctx.design_proposal_impact?.matched_design_nodes ?? []).map((n) => n.nodeId),
  )
  const affected = new Set(
    (ctx.design_proposal_impact?.affected_design_nodes ?? []).map((n) => n.nodeId),
  )
  const broken = new Set(
    (ctx.design_proposal_impact?.broken_edges ?? []).map((e) => `${e.from}->${e.to}`),
  )

  const nodes: TopologyVizNode[] = rawNodes.map((n) => {
    const p = pos.get(n.nodeId) ?? { x: MARGIN, y: MARGIN }
    let state: VizNodeState = 'normal'
    if (matched.has(n.nodeId)) state = 'target'
    else if (affected.has(n.nodeId)) state = 'affected'
    return {
      id: n.nodeId,
      label: n.label ?? n.nodeId,
      iconType: mapIconType(n.type),
      x: p.x,
      y: p.y,
      state,
      groupId: n.groupId,
    }
  })

  const vizEdges: TopologyVizEdge[] = edges.map((e) => ({
    id: e.id,
    from: e.from,
    to: e.to,
    broken: broken.has(`${e.from}->${e.to}`),
  }))

  const groups = buildGroupsFromDesign(
    (diagram.groups ?? []) as Array<{ groupId?: string; label?: string; type?: string }>,
    nodes,
  )

  const b = bounds(nodes, groups)
  return {
    nodes,
    edges: vizEdges,
    groups,
    width: b.width ?? 520,
    height: b.height ?? 280,
  }
}

export function buildDesignDiagramToBeViz(
  ctx: TopologyContext,
  targetResourceId?: string,
): TopologyVizModel | null {
  const asIs = buildDesignDiagramAsIsViz(ctx, targetResourceId)
  const impact = ctx.design_proposal_impact
  if (!asIs || !impact) return null

  const matched = new Set((impact.matched_design_nodes ?? []).map((n) => n.nodeId))
  const structural = impact.action === 'stop' || impact.action === 'delete'

  let nodes: TopologyVizNode[] = asIs.nodes
  if (structural && matched.size) {
    nodes = nodes.filter((n) => !matched.has(n.id))
  } else if (matched.size) {
    nodes = nodes.map((n) =>
      matched.has(n.id)
        ? { ...n, state: 'modified' as VizNodeState }
        : { ...n, state: 'normal' as VizNodeState },
    )
  }

  const alive = new Set(nodes.map((n) => n.id))
  const edges = asIs.edges
    .filter((e) => alive.has(e.from) && alive.has(e.to))
    .map((e) => ({ ...e, broken: false }))

  const survivingGroups = asIs.groups.filter((g) => nodes.some((n) => n.groupId === g.id))

  const b = bounds(nodes, survivingGroups)
  return {
    nodes,
    edges,
    groups: survivingGroups,
    width: b.width ?? asIs.width,
    height: b.height ?? asIs.height,
  }
}

export const VIZ_NODE_W = NW
export const VIZ_NODE_H = NH

export function nodeStateStroke(state: VizNodeState): string {
  if (state === 'target') return 'var(--color-brand, #2980B9)'
  if (state === 'removed') return 'var(--color-status-critical, #EF4444)'
  if (state === 'modified') return 'var(--color-status-warning, #F59E0B)'
  if (state === 'affected') return 'var(--color-status-warning, #F59E0B)'
  return 'var(--color-border, #E5E7EB)'
}

export function nodeStateFill(state: VizNodeState): string {
  if (state === 'removed') return 'rgba(239,68,68,0.08)'
  if (state === 'target') return 'rgba(41,128,185,0.08)'
  if (state === 'modified' || state === 'affected') return 'rgba(245,158,11,0.08)'
  return 'var(--color-bg-card, #fff)'
}

export function groupStroke(type: string): string {
  const m: Record<string, string> = {
    vpc: '#F59E0B',
    'public-subnet': '#3B82F6',
    'private-subnet': '#8B5CF6',
    'db-subnet': '#10B981',
  }
  return m[type] ?? '#9CA3AF'
}
