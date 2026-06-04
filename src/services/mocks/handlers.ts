import { http, HttpResponse } from 'msw'
import type { SLABundle } from '@/features/iac/types/sla-bundle.schema'
import type { TopologyDraft } from '@/features/iac/types/topology.schema'

const mockSlaBundleDraft: SLABundle = {
  bundleId: 'bundle-mock-001',
  uploadSessionId: 'sess-mock-001',
  confirmedCount: 0,
  totalRequiredCount: 47,
  status: 'draft',
  items: [
    // ── SLA 기본 정보 ──
    { fieldId: 'customer_name', label: '고객사', value: 'SK Telecom', confidence: '확실', sectionId: 'sla_basic', required: true, description: 'SLA 계약 당사자 (doc1)' },
    { fieldId: 'contract_start', label: '계약 시작일', value: '2026-07-01', confidence: '확실', sectionId: 'sla_basic', required: true },
    { fieldId: 'contract_end', label: '계약 종료일', value: '2027-06-30', confidence: '확실', sectionId: 'sla_basic', required: true },
    { fieldId: 'environment', label: '운영 환경', value: 'prod', confidence: '확실', sectionId: 'sla_basic', required: true },
    { fieldId: 'primary_contact', label: 'SLA Owner 이메일', value: 'sanghoon.kim@sktelecom.com', confidence: '확실', sectionId: 'sla_basic', required: true },
    { fieldId: 'csp', label: '사용 CSP', value: 'aws', confidence: '확실', sectionId: 'sla_basic', required: true },

    // ── 가용성 ──
    { fieldId: 'portal_availability', label: 'Customer Portal Web — 가용성', value: '99.90', confidence: '확실', sectionId: 'availability', required: true, unit: '%', description: '월간, ALB log + synthetic probe' },
    { fieldId: 'subscription_availability', label: 'Subscription API — 가용성', value: '99.95', confidence: '확실', sectionId: 'availability', required: true, unit: '%', description: '월간, ALB log + Ingress metric' },
    { fieldId: 'subscription_endpoint_availability', label: 'POST /subscriptions — 가용성', value: '99.99', confidence: '확실', sectionId: 'availability', required: true, unit: '%', description: '결제 endpoint 별도 SLA, 월간' },

    // ── 지연 시간 ──
    { fieldId: 'portal_latency_p95', label: 'Customer Portal Web — Latency p95', value: 800, confidence: '확실', sectionId: 'latency', required: true, unit: 'ms', description: '5분 rolling window' },
    { fieldId: 'subscription_latency_p95', label: 'Subscription API — Latency p95', value: 500, confidence: '확실', sectionId: 'latency', required: true, unit: 'ms', description: '5분 rolling, OpenTelemetry trace' },

    // ── 복구 목표 ──
    { fieldId: 'portal_rto', label: 'Customer Portal Web — RTO', value: 30, confidence: '확실', sectionId: 'recovery', required: true, unit: '분', description: '장애 탐지 ~ 복구 완료' },
    { fieldId: 'subscription_rpo', label: 'Subscription API — RPO', value: 5, confidence: '확실', sectionId: 'recovery', required: true, unit: '분', description: 'RDS backup·replication 기준' },
    { fieldId: 'batch_rto', label: 'Billing Batch — RTO', value: 120, confidence: '확실', sectionId: 'recovery', required: true, unit: '분', description: '실패 배치 재실행 성공까지' },
    { fieldId: 'batch_rpo', label: 'Billing Batch — RPO', value: 15, confidence: '확실', sectionId: 'recovery', required: true, unit: '분', description: 'S3 checkpoint + RDS replication' },

    // ── 성능 / 트래픽 ──
    { fieldId: 'portal_avg_rps', label: 'Customer Portal Web — 평균 RPS', value: 200, confidence: '확실', sectionId: 'performance', required: true },
    { fieldId: 'portal_peak_rps', label: 'Customer Portal Web — 피크 RPS', value: 1500, confidence: '확실', sectionId: 'performance', required: true, description: '월말 청구 기간 기준' },
    { fieldId: 'portal_max_concurrent', label: 'Customer Portal Web — 최대 동시 사용자', value: 30000, confidence: '확실', sectionId: 'performance', required: true, unit: '명' },
    { fieldId: 'subscription_avg_tps', label: 'Subscription API — 평균 TPS', value: 100, confidence: '확실', sectionId: 'performance', required: true },
    { fieldId: 'subscription_peak_tps', label: 'Subscription API — 피크 TPS', value: 800, confidence: '확실', sectionId: 'performance', required: true, description: '프로모션 기간 기준' },
    { fieldId: 'subscription_peak_write', label: 'Subscription API — 피크 쓰기 TPS', value: 200, confidence: '확실', sectionId: 'performance', required: true },
    { fieldId: 'batch_max_concurrent_jobs', label: 'Billing Batch — 최대 동시 Job', value: 5, confidence: '확실', sectionId: 'performance', required: true },

    // ── 인프라 / 리전 ──
    { fieldId: 'primary_region', label: '기본 리전', value: 'ap-northeast-2', confidence: '확실', sectionId: 'infra', required: true },
    { fieldId: 'multi_az', label: 'Multi-AZ 필요', value: 'true', confidence: '확실', sectionId: 'infra', required: true, description: 'Tier 1 서비스 기준 자동 도출' },
    { fieldId: 'multi_region', label: 'Multi-Region 필요', value: 'false', confidence: '추정', sectionId: 'infra', required: true, description: 'MVP 기본값 — Phase 2에서 재검토 예정' },
    { fieldId: 'failover_required', label: 'Failover 필요', value: 'true', confidence: '확실', sectionId: 'infra', required: true, description: 'SLA RTO 역추론으로 자동 도출' },
    { fieldId: 'data_residency', label: '데이터 저장 지역', value: 'KR', confidence: '확실', sectionId: 'infra', required: true, description: '개인정보보호법 — 국내 리전 저장 필수' },
    { fieldId: 'vpn_required', label: 'VPN 필요', value: 'true', confidence: '확실', sectionId: 'infra', required: true, description: 'SKT 사내망 연동' },
    { fieldId: 'new_vpc_required', label: '신규 VPC 생성', value: 'true', confidence: '모호', sectionId: 'infra', required: true, description: '기존 네트워크 연동 방식 확인 필요' },

    // ── 비용 ──
    { fieldId: 'monthly_budget', label: '월간 인프라 예산', value: 35000000, confidence: '확실', sectionId: 'cost', required: true, unit: 'KRW' },
    { fieldId: 'cost_priority', label: '비용 우선순위', value: 'balanced', confidence: '확실', sectionId: 'cost', required: true, description: '안정성과 비용의 균형' },
    { fieldId: 'spot_instance_scope', label: 'Spot Instance 허용 범위', value: 'Billing Batch worker', confidence: '확실', sectionId: 'cost', required: true },
    { fieldId: 'budget_alert_threshold', label: '예산 초과 경고 기준', value: '80% / 100%', confidence: '확실', sectionId: 'cost', required: true },
    { fieldId: 'sla_violation_loss_limit', label: 'SLA 위반 손실 한도', value: 150000000, confidence: '추정', sectionId: 'cost', required: true, unit: 'KRW', description: 'Phase 2 본격 적용 예정 — 현재 참고값' },

    // ── 보안 / 컴플라이언스 ──
    { fieldId: 'has_pii', label: '개인정보 처리', value: 'true', confidence: '확실', sectionId: 'compliance', required: true },
    { fieldId: 'has_payment_info', label: '결제정보 처리', value: 'true', confidence: '확실', sectionId: 'compliance', required: true, description: 'PG사 (KCP·NICE) 연동' },
    { fieldId: 'regulations', label: '적용 규제·정책', value: '개인정보보호법, ISMS-P, SKT 보안 정책', confidence: '확실', sectionId: 'compliance', required: true },
    { fieldId: 'log_retention_service', label: '서비스 로그 보존', value: 90, confidence: '확실', sectionId: 'compliance', required: true, unit: '일' },
    { fieldId: 'log_retention_audit', label: '감사 로그 보존', value: 365, confidence: '확실', sectionId: 'compliance', required: true, unit: '일' },
    { fieldId: 'encryption_method', label: '암호화 방식', value: 'KMS + TLS 1.3', confidence: '확실', sectionId: 'compliance', required: true },
    { fieldId: 'admin_access_method', label: '관리자 접근 방식', value: 'VPN + SSO', confidence: '확실', sectionId: 'compliance', required: true },

    // ── DB / 데이터 ──
    { fieldId: 'db_type', label: 'DB 유형', value: '관계형 + 오브젝트 스토리지', confidence: '확실', sectionId: 'db', required: true },
    { fieldId: 'consistency_priority', label: '정합성 우선순위', value: 'strong', confidence: '확실', sectionId: 'db', required: true, description: '결제·정산 트랜잭션' },
    { fieldId: 'initial_data_volume', label: '초기 데이터 용량', value: 800, confidence: '확실', sectionId: 'db', required: true, unit: 'GB' },
    { fieldId: 'monthly_data_growth', label: '월간 데이터 증가량', value: 150, confidence: '확실', sectionId: 'db', required: true, unit: 'GB/월' },
    { fieldId: 'read_write_ratio', label: '읽기/쓰기 비율', value: '70:30', confidence: '확실', sectionId: 'db', required: true },
    { fieldId: 'backup_required', label: '백업 필요', value: 'true', confidence: '확실', sectionId: 'db', required: true, description: 'RPO 기준 RDS backup·replication' },
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
