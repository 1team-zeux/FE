import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TopologyDiagram from '../TopologyDiagram.vue'
import type { TopologyNode, TopologyEdge } from '../../types/topology.schema'

const nodes: TopologyNode[] = [
  { nodeId: 'vpc-1', type: 'vpc', label: 'Main VPC', x: 100, y: 50 },
  { nodeId: 'ec2-1', type: 'ec2', label: 'EC2', x: 100, y: 200 },
]
const edges: TopologyEdge[] = [
  { edgeId: 'e1', from: 'vpc-1', to: 'ec2-1', dashed: false },
]

describe('TopologyDiagram', () => {
  it('SVG 엘리먼트가 렌더링된다', () => {
    const w = mount(TopologyDiagram, { props: { nodes, edges } })
    expect(w.find('svg').exists()).toBe(true)
  })

  it('노드 수만큼 [data-node] 렌더링', () => {
    const w = mount(TopologyDiagram, { props: { nodes, edges } })
    expect(w.findAll('[data-node]')).toHaveLength(2)
  })

  it('엣지 수만큼 [data-edge] 렌더링', () => {
    const w = mount(TopologyDiagram, { props: { nodes, edges } })
    expect(w.findAll('[data-edge]')).toHaveLength(1)
  })

  it('노드 클릭 시 node-click emit', async () => {
    const w = mount(TopologyDiagram, { props: { nodes, edges } })
    await w.find('[data-node]').trigger('click')
    expect(w.emitted('node-click')).toBeTruthy()
    expect(w.emitted('node-click')![0][0]).toBe('vpc-1')
  })
})
