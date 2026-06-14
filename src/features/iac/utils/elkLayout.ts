import type { TopologyNode, TopologyGroup } from '../types/topology.schema'

const NW = 72, NH = 72

const LAYER_MAP: Record<string, number> = {
  'G_ENTRY': 0, 'V1_CONNECT': 1, 'V2_PUBLIC': 2, 'V3_APP': 3, 'V4_DATA': 4,
  'G_EXT_API': 5, 'G_STORAGE': 5, 'G_MGMT': 6,
}

const GROUP_PADDING: Record<string, number> = {
  vpc: 56, 'public-subnet': 28, 'private-subnet': 28, 'db-subnet': 28, asg: 20,
}

const COL_STEP = 180
const MARGIN_X = 100
const AZ_A_Y = 100   // ap-northeast-2a row
const AZ_B_Y = 380   // ap-northeast-2b row
const NODE_VSTEP = 100

// Deterministic column × AZ grid. layer_id → X column, az → Y band.
export function gridLayout(nodes: TopologyNode[]): Map<string, { x: number; y: number }> {
  const colAzCounter = new Map<string, number>()
  const nodePos = new Map<string, { x: number; y: number }>()
  for (const node of nodes) {
    const col = LAYER_MAP[node.layer_id ?? ''] ?? 3
    const isB = node.az?.endsWith('b') || node.az?.endsWith('c')
    const bucket = `${col}-${isB ? 'b' : 'a'}`
    const idx = colAzCounter.get(bucket) ?? 0
    colAzCounter.set(bucket, idx + 1)
    nodePos.set(node.nodeId, {
      x: MARGIN_X + col * COL_STEP,
      y: (isB ? AZ_B_Y : AZ_A_Y) + idx * NODE_VSTEP,
    })
  }
  return nodePos
}

// Derives group bounding boxes from positioned nodes.
// Handles nested groups (e.g. subnets inside VPC) by collecting all descendants.
export function computeGroupBoxes(
  nodePos: Map<string, { x: number; y: number }>,
  nodes: TopologyNode[],
  groups: TopologyGroup[],
): Map<string, { x: number; y: number; width: number; height: number }> {
  const childGroups = new Map<string, string[]>()
  for (const g of groups) {
    if (g.parentGroupId) {
      if (!childGroups.has(g.parentGroupId)) childGroups.set(g.parentGroupId, [])
      childGroups.get(g.parentGroupId)!.push(g.groupId)
    }
  }

  function descendantIds(id: string): string[] {
    const children = childGroups.get(id) ?? []
    return [...children, ...children.flatMap(c => descendantIds(c))]
  }

  const result = new Map<string, { x: number; y: number; width: number; height: number }>()

  for (const g of groups) {
    const memberGroupIds = new Set([g.groupId, ...descendantIds(g.groupId)])
    const positions = nodes
      .filter(n => n.parentGroupId && memberGroupIds.has(n.parentGroupId))
      .map(n => nodePos.get(n.nodeId))
      .filter(Boolean) as { x: number; y: number }[]

    if (!positions.length) continue

    const padding = GROUP_PADDING[g.type] ?? 28
    const minX = Math.min(...positions.map(p => p.x - NW / 2))
    const maxX = Math.max(...positions.map(p => p.x + NW / 2))
    const minY = Math.min(...positions.map(p => p.y - NH / 2))
    const maxY = Math.max(...positions.map(p => p.y + NH / 2))

    result.set(g.groupId, {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    })
  }

  return result
}
