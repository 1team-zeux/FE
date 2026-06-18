import type { TopologyNode, TopologyEdge, TopologyGroup } from '../types/topology.schema'

const NW = 72
const NODE_GAP_DEFAULT = 80
const NODE_GAP_MIN = 20

// ── 3-column VPC-centric layout constants ─────────────────────────────────────
// Column order: g-public (LEFT) | g-private-* (CENTER) | g-db (RIGHT)
const VPC_X = 250
const VPC_Y = 60
const VPC_W = 1200
const VPC_PAD_LR = 100
const VPC_PAD_TOP = 110
const VPC_PAD_BOT = 60

const INNER_X = VPC_X + VPC_PAD_LR        // 350
const INNER_W = VPC_W - VPC_PAD_LR * 2    // 1000

const COL_GAP  = 15
const PUB_W    = 180                                        // left column
const DB_W     = 280                                        // right column
const PRIV_W   = INNER_W - PUB_W - DB_W - COL_GAP * 2     // 510, center column

const PUB_X    = INNER_X                                    // 350
const PRIV_X   = PUB_X  + PUB_W  + COL_GAP                // 545
const DB_X     = PRIV_X + PRIV_W + COL_GAP                // 1070

const COL_TOP_Y    = VPC_Y + VPC_PAD_TOP   // 170  — all 3 columns start here
const PRIV_ROW_H   = 200
const PRIV_ROW_GAP = 20

const VPC_HEADER_Y = VPC_Y + VPC_PAD_TOP / 2  // 115 — IGW/VPN placement

const ENTRY_X       = VPC_X - 130              // 120
const RIGHT_X       = VPC_X + VPC_W + 100      // 1550
const RIGHT_Y_START = VPC_Y + 60               // 120
const RIGHT_Y_STEP  = 100

// ── Fixed box calculation ─────────────────────────────────────────────────────

type Box = { x: number; y: number; width: number; height: number }

function _privTotalH(azCount: number): number {
  return azCount * PRIV_ROW_H + Math.max(0, azCount - 1) * PRIV_ROW_GAP
}

function _vpcHeight(azCount: number): number {
  return VPC_PAD_TOP + _privTotalH(azCount) + VPC_PAD_BOT
}

function _buildFixedBoxes(groups: TopologyGroup[], azCount: number): Map<string, Box> {
  const boxes = new Map<string, Box>()
  const colH = _privTotalH(azCount)

  boxes.set('g-vpc', { x: VPC_X, y: VPC_Y, width: VPC_W, height: _vpcHeight(azCount) })
  boxes.set('g-public', { x: PUB_X, y: COL_TOP_Y, width: PUB_W, height: colH })

  if (groups.some(g => g.groupId === 'g-db')) {
    boxes.set('g-db', { x: DB_X, y: COL_TOP_Y, width: DB_W, height: colH })
  }

  const privGids = ['g-private-a', 'g-private-b', 'g-private-c']
  privGids.forEach((gid, idx) => {
    if (groups.some(g => g.groupId === gid)) {
      boxes.set(gid, {
        x: PRIV_X,
        y: COL_TOP_Y + idx * (PRIV_ROW_H + PRIV_ROW_GAP),
        width: PRIV_W,
        height: PRIV_ROW_H,
      })
    }
  })

  return boxes
}

// ── Node placement helpers ────────────────────────────────────────────────────

function _spreadInBox(box: Box, count: number): { x: number; y: number }[] {
  const usableW = box.width - NW
  const gap = count > 1
    ? Math.max(NODE_GAP_MIN, Math.min(NODE_GAP_DEFAULT, (usableW - count * NW) / (count - 1)))
    : 0
  const totalSpan = count * NW + (count - 1) * gap
  const x0 = box.x + (box.width - totalSpan) / 2 + NW / 2
  const y = box.y + box.height / 2
  return Array.from({ length: count }, (_, i) => ({ x: x0 + i * (NW + gap), y }))
}

// Barycenter crossing minimization: sorts nodes by average x of their external connections.
// In 3-column layout: ALB/NAT-connected (x≈440) → LEFT, RDS/EventBridge-connected (x≈1200+) → RIGHT.
function _barycenterOrder(
  nodes: TopologyNode[],
  edges: TopologyEdge[],
  knownPositions: Map<string, { x: number; y: number }>,
): TopologyNode[] {
  if (nodes.length <= 1) return nodes

  const nodeIds = new Set(nodes.map(n => n.nodeId))

  const scored = nodes.map(node => {
    const externalX = edges
      .filter(e => {
        const involved = e.from === node.nodeId || e.to === node.nodeId
        if (!involved) return false
        const otherId = e.from === node.nodeId ? e.to : e.from
        return !nodeIds.has(otherId) && knownPositions.has(otherId)
      })
      .map(e => knownPositions.get(e.from === node.nodeId ? e.to : e.from)!.x)

    const score = externalX.length > 0
      ? externalX.reduce((a, b) => a + b, 0) / externalX.length
      : RIGHT_X

    return { node, score }
  })

  return scored.sort((a, b) => a.score - b.score).map(s => s.node)
}

// ── Main exports ──────────────────────────────────────────────────────────────

export function gridLayout(
  nodes: TopologyNode[],
  groups: TopologyGroup[],
  edges: TopologyEdge[] = [],
): Map<string, { x: number; y: number }> {
  const azCount = Math.max(groups.filter(g => g.type === 'private-subnet').length, 1)
  const fixedBoxes = _buildFixedBoxes(groups, azCount)
  const vpcH = _vpcHeight(azCount)

  const nodesByGroup = new Map<string, TopologyNode[]>()
  const ungrouped: TopologyNode[] = []
  for (const node of nodes) {
    if (node.parentGroupId) {
      if (!nodesByGroup.has(node.parentGroupId)) nodesByGroup.set(node.parentGroupId, [])
      nodesByGroup.get(node.parentGroupId)!.push(node)
    } else {
      ungrouped.push(node)
    }
  }

  const nodePos = new Map<string, { x: number; y: number }>()

  // Pass 1: place all non-private-subnet nodes first (their positions feed barycenter)
  for (const [gid, gNodes] of nodesByGroup) {
    if (gid.startsWith('g-private-')) continue

    if (gid === 'g-vpc') {
      // VPC-direct nodes (IGW, VPN): header band centered above g-public
      const headerCenterX = PUB_X + PUB_W / 2  // 440
      const count = gNodes.length
      const gap = count > 1 ? Math.min(NODE_GAP_DEFAULT, (PUB_W - count * NW) / (count - 1)) : 0
      const totalSpan = count * NW + (count - 1) * gap
      const x0 = headerCenterX - totalSpan / 2 + NW / 2
      gNodes.forEach((n, i) => nodePos.set(n.nodeId, { x: x0 + i * (NW + gap), y: VPC_HEADER_Y }))
      continue
    }

    const box = fixedBoxes.get(gid)
    if (!box) continue
    const positions = _spreadInBox(box, gNodes.length)
    gNodes.forEach((n, i) => nodePos.set(n.nodeId, positions[i]))
  }

  const entryNodes = ungrouped.filter(n => n.layer_id === 'G_ENTRY')
  const rightNodes = ungrouped.filter(n => n.layer_id !== 'G_ENTRY')
  const vcenterY = VPC_Y + vpcH / 2
  const entryTotalH = (entryNodes.length - 1) * 100
  entryNodes.forEach((n, i) => nodePos.set(n.nodeId, { x: ENTRY_X, y: vcenterY - entryTotalH / 2 + i * 100 }))
  rightNodes.forEach((n, i) => nodePos.set(n.nodeId, { x: RIGHT_X, y: RIGHT_Y_START + i * RIGHT_Y_STEP }))

  // Pass 2: private subnet nodes ordered by barycenter to minimize crossings
  for (const [gid, gNodes] of nodesByGroup) {
    if (!gid.startsWith('g-private-')) continue
    const box = fixedBoxes.get(gid)
    if (!box) continue
    const ordered = edges.length > 0 ? _barycenterOrder(gNodes, edges, nodePos) : gNodes
    const positions = _spreadInBox(box, ordered.length)
    ordered.forEach((n, i) => nodePos.set(n.nodeId, positions[i]))
  }

  return nodePos
}

export function computeGroupBoxes(
  _nodePos: Map<string, { x: number; y: number }>,
  _nodes: TopologyNode[],
  groups: TopologyGroup[],
): Map<string, Box> {
  const azCount = Math.max(groups.filter(g => g.type === 'private-subnet').length, 1)
  return _buildFixedBoxes(groups, azCount)
}
