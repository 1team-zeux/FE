import { http, HttpResponse } from 'msw'
import type { SLABundle } from '@/features/iac/types/sla-bundle.schema'
import type { TopologyDraft } from '@/features/iac/types/topology.schema'

const mockSlaBundleDraft: SLABundle = {
  bundleId: 'bundle-mock-001',
  uploadSessionId: 'sess-mock-001',
  confirmedCount: 0,
  totalRequiredCount: 10,
  status: 'draft',
  items: [
    { fieldId: 'availability_target', label: '가용성 목표', value: '99.9%', confidence: '확실', sectionId: 'availability', required: true },
    { fieldId: 'rto_minutes', label: 'RTO (분)', value: 30, confidence: '모호', sectionId: 'recovery', required: true, unit: '분' },
    { fieldId: 'rpo_minutes', label: 'RPO (분)', value: 15, confidence: '추정', sectionId: 'recovery', required: true, unit: '분' },
    { fieldId: 'peak_tps', label: '피크 TPS', value: 1000, confidence: '확실', sectionId: 'performance', required: true },
    { fieldId: 'response_time_p99', label: 'P99 응답시간', value: 500, confidence: '모호', sectionId: 'performance', required: true, unit: 'ms' },
    { fieldId: 'monthly_budget', label: '월 예산', value: null, confidence: '추정', sectionId: 'cost', required: false, unit: 'KRW' },
    { fieldId: 'region', label: '배포 리전', value: 'ap-northeast-2', confidence: '확실', sectionId: 'infra', required: true },
    { fieldId: 'multi_az', label: 'Multi-AZ 필요', value: 'true', confidence: '확실', sectionId: 'infra', required: true },
    { fieldId: 'storage_class', label: '스토리지 클래스', value: null, confidence: '추정', sectionId: 'infra', required: false },
    { fieldId: 'backup_retention', label: '백업 보관 기간', value: 7, confidence: '모호', sectionId: 'backup', required: true, unit: '일' },
  ],
}

const mockTopologies: TopologyDraft[] = [
  {
    topologyId: 'topo-ha',
    label: '고가용성 (HA) 구성',
    summary: 'Multi-AZ, Auto Scaling 적용 — 99.99% SLA 보장',
    estimatedMonthlyCost: 2400000,
    slaSatisfaction: { availability: '99.99%', rto: '10분', rpo: '5분' },
    rationale: ['Multi-AZ RDS로 자동 장애 조치', 'ALB + Auto Scaling으로 피크 TPS 흡수', 'CloudWatch 알람 연동'],
    nodes: [
      { nodeId: 'vpc-1', type: 'vpc', label: 'Main VPC', x: 300, y: 50 },
      { nodeId: 'alb-1', type: 'elb', label: 'ALB', x: 300, y: 150 },
      { nodeId: 'ec2-1', type: 'ec2', label: 'EC2 (AZ-a)', x: 150, y: 280 },
      { nodeId: 'ec2-2', type: 'ec2', label: 'EC2 (AZ-c)', x: 450, y: 280 },
      { nodeId: 'rds-1', type: 'rds', label: 'RDS Primary', x: 150, y: 420 },
      { nodeId: 'rds-2', type: 'rds', label: 'RDS Standby', x: 450, y: 420 },
    ],
    edges: [
      { edgeId: 'e1', from: 'alb-1', to: 'ec2-1', dashed: false },
      { edgeId: 'e2', from: 'alb-1', to: 'ec2-2', dashed: false },
      { edgeId: 'e3', from: 'ec2-1', to: 'rds-1', dashed: false },
      { edgeId: 'e4', from: 'rds-1', to: 'rds-2', dashed: true, label: '복제' },
    ],
  },
  {
    topologyId: 'topo-cost',
    label: '비용 최적화 구성',
    summary: '단일 AZ, Spot 인스턴스 — 월 비용 60% 절감',
    estimatedMonthlyCost: 960000,
    slaSatisfaction: { availability: '99.5%', rto: '30분', rpo: '15분' },
    rationale: ['Spot 인스턴스로 컴퓨팅 비용 절감', '단일 AZ로 데이터 전송 비용 최소화'],
    nodes: [
      { nodeId: 'vpc-1', type: 'vpc', label: 'Main VPC', x: 300, y: 50 },
      { nodeId: 'ec2-1', type: 'ec2', label: 'EC2 Spot', x: 300, y: 200 },
      { nodeId: 'rds-1', type: 'rds', label: 'RDS Single', x: 300, y: 380 },
    ],
    edges: [
      { edgeId: 'e1', from: 'ec2-1', to: 'rds-1', dashed: false },
    ],
  },
  {
    topologyId: 'topo-serverless',
    label: '서버리스 구성',
    summary: 'Lambda + Aurora Serverless — 트래픽 0시 비용 없음',
    estimatedMonthlyCost: 1200000,
    slaSatisfaction: { availability: '99.95%', rto: '20분', rpo: '10분' },
    rationale: ['Lambda auto-scaling으로 트래픽 급증 대응', 'Aurora Serverless v2 자동 스케일'],
    nodes: [
      { nodeId: 'apigw-1', type: 'elb', label: 'API Gateway', x: 300, y: 100 },
      { nodeId: 'lambda-1', type: 'lambda', label: 'Lambda', x: 300, y: 250 },
      { nodeId: 'rds-1', type: 'rds', label: 'Aurora Serverless', x: 300, y: 400 },
    ],
    edges: [
      { edgeId: 'e1', from: 'apigw-1', to: 'lambda-1', dashed: false },
      { edgeId: 'e2', from: 'lambda-1', to: 'rds-1', dashed: false },
    ],
  },
]

export const handlers = [
  http.post('*/api/upload-sessions', () => {
    return HttpResponse.json({ uploadSessionId: 'sess-mock-001' }, { status: 201 })
  }),

  http.get('*/api/sla-bundles/draft/:sessionId', () => {
    return HttpResponse.json(mockSlaBundleDraft)
  }),

  http.patch('*/api/sla-bundles/draft/:id/fields', async ({ request }) => {
    const body = await request.json() as { fieldId: string; value: string | number | null }
    return HttpResponse.json({ fieldId: body.fieldId, confirmed: true })
  }),

  http.post('*/api/sla-bundles', () => {
    return HttpResponse.json({ bundleId: 'bundle-mock-001' }, { status: 201 })
  }),

  http.get('*/api/topologies/:bundleId', () => {
    return HttpResponse.json({ topologies: mockTopologies })
  }),

  http.post('*/api/topologies/:id/approve', ({ params }) => {
    return HttpResponse.json({ topologyId: params.id, approved: true })
  }),

  http.post('*/api/terraform/generate', () => {
    return HttpResponse.json({
      planId: 'plan-mock-001',
      hclPreview: `resource "aws_vpc" "main" {\n  cidr_block = "10.0.0.0/16"\n  tags = { Name = "zeux-main" }\n}`,
    })
  }),

  http.post('*/api/terraform/plan', () => {
    return HttpResponse.json({
      planId: 'plan-mock-001',
      summary: { add: 12, change: 2, destroy: 0 },
      riskLevel: 'medium',
      items: [
        { resource: 'aws_vpc.main', changeType: 'add', riskLevel: 'low', slaImpact: '없음', estimatedCost: '+₩45,000/월' },
        { resource: 'aws_instance.app', changeType: 'add', riskLevel: 'medium', slaImpact: '가용성 +0.1%', estimatedCost: '+₩320,000/월' },
        { resource: 'aws_db_instance.primary', changeType: 'add', riskLevel: 'high', slaImpact: 'RTO 달성 필요', estimatedCost: '+₩890,000/월' },
      ],
    })
  }),

  http.get('*/api/terraform/verify/:id', () => {
    return HttpResponse.json({
      verifyId: 'verify-mock-001',
      overall: 'pass',
      categories: [
        { category: '가용성 SLA', status: 'pass', detail: '99.99% 달성 확인' },
        { category: '네트워크 연결성', status: 'pass', detail: '모든 서브넷 라우팅 정상' },
        { category: '보안 그룹', status: 'pass', detail: '최소 권한 원칙 적용' },
        { category: '백업 정책', status: 'pass', detail: '7일 보관 설정 완료' },
        { category: '모니터링', status: 'pass', detail: 'CloudWatch 알람 8개 활성화' },
        { category: '비용 한도', status: 'pass', detail: '예산 내 운영 가능' },
        { category: 'IAM 권한', status: 'pass', detail: '최소 권한 정책 적용' },
        { category: '태그 정책', status: 'pass', detail: '필수 태그 7개 적용 완료' },
      ],
    })
  }),
]
