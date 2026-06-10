import { describe, it, expect } from 'vitest'
import {
  ConfidenceLevelSchema,
  SLAItemSchema,
  SLABundleSchema,
} from '../types/sla-bundle.schema'
import {
  TopologyNodeSchema,
  TopologyDraftSchema,
} from '../types/topology.schema'

describe('SLA Bundle Schema', () => {
  it('ConfidenceLevel: 유효한 값 파싱', () => {
    expect(ConfidenceLevelSchema.parse('확실')).toBe('확실')
    expect(ConfidenceLevelSchema.parse('모호')).toBe('모호')
    expect(ConfidenceLevelSchema.parse('추정')).toBe('추정')
    expect(ConfidenceLevelSchema.parse('확정')).toBe('확정')
  })

  it('ConfidenceLevel: 잘못된 값 거부', () => {
    expect(() => ConfidenceLevelSchema.parse('unknown')).toThrow()
  })

  it('SLAItem: 유효한 항목 파싱', () => {
    const item = SLAItemSchema.parse({
      slaItemId: 'portal_availability',
      serviceId: 'svc-portal',
      category: 'availability',
      label: '가용성 목표',
      targetValue: '99.9%',
      confidence: '확실',
      required: true,
    })
    expect(item.slaItemId).toBe('portal_availability')
    expect(item.confidence).toBe('확실')
  })

  it('SLAItem: targetValue는 string | number | null 허용', () => {
    expect(() => SLAItemSchema.parse({
      slaItemId: 'f1', serviceId: 's1', category: 'rto', label: 'L',
      targetValue: null, confidence: '추정', required: false,
    })).not.toThrow()
    expect(() => SLAItemSchema.parse({
      slaItemId: 'f2', serviceId: 's1', category: 'latency', label: 'L',
      targetValue: 99.9, confidence: '모호', required: true,
    })).not.toThrow()
  })

  it('SLABundle: 전체 번들 파싱', () => {
    const bundle = SLABundleSchema.parse({
      bundleId: 'b-001',
      uploadSessionId: 'sess-001',
      services: [],
      slaItems: [],
      bundleFields: [],
      confirmedCount: 0,
      totalRequiredCount: 47,
      status: 'draft',
    })
    expect(bundle.status).toBe('draft')
  })
})

describe('Topology Schema', () => {
  it('TopologyNode: 유효한 노드 파싱', () => {
    const node = TopologyNodeSchema.parse({
      nodeId: 'vpc-01',
      type: 'vpc',
      label: 'Main VPC',
      x: 100,
      y: 200,
      catalogRule: 'VPC CIDR /16',
      applyCondition: 'prod 환경',
    })
    expect(node.type).toBe('vpc')
  })

  it('TopologyDraft: 3개 토폴로지 파싱', () => {
    const draft = TopologyDraftSchema.parse({
      topologyId: 'topo-001',
      label: '고가용성 구성',
      summary: '3-tier HA',
      estimatedMonthlyCost: 1200000,
      slaSatisfaction: { availability: '99.99%', rto: '15분' },
      rationale: ['Multi-AZ 배포', 'Auto Scaling 적용'],
      nodes: [],
      edges: [],
    })
    expect(draft.topologyId).toBe('topo-001')
  })
})
