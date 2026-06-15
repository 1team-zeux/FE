import { describe, it, expect } from 'vitest'
import { gridLayout } from '../utils/elkLayout'

describe('TopologyLayout', () => {
  it('should place nodes in correct column based on layer_id', () => {
    const nodes = [
      { nodeId: 'n1', type: 'ec2', label: 'Entry', layer_id: 'G_ENTRY', az: 'ap-northeast-2a' },
      { nodeId: 'n2', type: 'rds', label: 'Data', layer_id: 'V4_DATA', az: 'ap-northeast-2a' },
      { nodeId: 'n3', type: 'lambda', label: 'App', az: 'ap-northeast-2a' }, // Default col=3
    ] as any
    const pos = gridLayout(nodes)

    // G_ENTRY=col0, V4_DATA=col4, default=col3; COL_STEP=180, MARGIN_X=100
    expect(pos.get('n1')?.x).toBe(100 + 0 * 180)
    expect(pos.get('n2')?.x).toBe(100 + 4 * 180)
    expect(pos.get('n3')?.x).toBe(100 + 3 * 180)
  })

  it('should separate AZ-a and AZ-b rows', () => {
    const nodes = [
      { nodeId: 'a', type: 'ec2', label: 'A', layer_id: 'V3_APP', az: 'ap-northeast-2a' },
      { nodeId: 'b', type: 'ec2', label: 'B', layer_id: 'V3_APP', az: 'ap-northeast-2b' },
    ] as any
    const pos = gridLayout(nodes)

    expect(pos.get('a')?.y).toBeLessThan(pos.get('b')?.y ?? 0)
  })
})
