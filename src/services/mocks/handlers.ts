import { http, HttpResponse } from 'msw'
import type { SLABundle } from '@/features/iac/types/sla-bundle.schema'
import type { TopologyDraft } from '@/features/iac/types/topology.schema'

const mockSlaBundleDraft: SLABundle = {
  bundleId: 'bundle-mock-001',
  uploadSessionId: 'sess-mock-001',
  confirmedCount: 47,
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
    summary: 'Multi-AZ, Auto Scaling — 99.99% SLA 보장',
    estimatedMonthlyCost: 2400000,
    slaSatisfaction: { availability: '99.99%', rto: '10분', rpo: '5분' },
    rationale: ['Multi-AZ RDS 자동 장애 조치', 'ALB + Auto Scaling으로 피크 TPS 흡수', 'CloudWatch 알람 연동'],
    groups: [
      { groupId: 'g-vpc',      label: 'VPC  10.0.0.0/16',        type: 'vpc',            x: 130, y: 10,  width: 790, height: 660 },
      { groupId: 'g-pub',      label: 'Public Subnet',            type: 'public-subnet',  x: 170, y: 55,  width: 170, height: 600 },
      { groupId: 'g-priv-a',   label: 'Private Subnet (AZ-a)',    type: 'private-subnet', x: 385, y: 55,  width: 195, height: 275 },
      { groupId: 'g-priv-c',   label: 'Private Subnet (AZ-c)',    type: 'private-subnet', x: 385, y: 365, width: 195, height: 285 },
      { groupId: 'g-db',       label: 'DB Subnet',                type: 'db-subnet',      x: 625, y: 120, width: 185, height: 510 },
    ],
    nodes: [
      { nodeId: 'route53-1', type: 'route53',    label: 'Route 53',     x: 60,  y: 300, catalogRule: "SLA 문서의 '가용성 99.99%' 요구사항을 만족하기 위해 DNS 헬스체크 기반 자동 장애 전환을 구성합니다." },
      { nodeId: 'alb-1',     type: 'elb',        label: 'ALB',          x: 255, y: 195, parentGroupId: 'g-pub',     catalogRule: "SLA 문서의 '피크 TPS 500 이상 처리' 요구사항을 만족하기 위해 Application Load Balancer로 트래픽을 Multi-AZ EC2에 분산합니다." },
      { nodeId: 'nat-1',     type: 'nat',        label: 'NAT GW',       x: 255, y: 490, parentGroupId: 'g-pub',     catalogRule: "보안 요구사항에 따라 Private Subnet 내 EC2의 아웃바운드 경로를 NAT Gateway로 제한합니다." },
      { nodeId: 'ec2-1',     type: 'ec2',        label: 'EC2 (AZ-a)',   x: 482, y: 165, parentGroupId: 'g-priv-a',  catalogRule: "SLA 문서의 '가용성 99.99%' 요구사항을 만족하기 위해 AZ-a에 EC2 인스턴스를 배치해 이중화합니다." },
      { nodeId: 'ec2-2',     type: 'ec2',        label: 'EC2 (AZ-c)',   x: 482, y: 480, parentGroupId: 'g-priv-c',  catalogRule: "SLA 문서의 '가용성 99.99%' 요구사항을 만족하기 위해 AZ-c에 EC2 인스턴스를 배치해 단일 AZ 장애를 방지합니다." },
      { nodeId: 'rds-1',     type: 'rds',        label: 'RDS Primary',  x: 717, y: 265, parentGroupId: 'g-db',      catalogRule: "SLA 문서의 'RPO 5분' 요구사항을 만족하기 위해 Multi-AZ RDS Primary를 구성합니다." },
      { nodeId: 'rds-2',     type: 'rds',        label: 'RDS Standby',  x: 717, y: 470, parentGroupId: 'g-db',      catalogRule: "SLA 문서의 'RTO 10분 · RPO 5분' 요구사항을 만족하기 위해 RDS Standby 복제본으로 자동 장애 조치를 지원합니다." },
      { nodeId: 'cw-1',      type: 'cloudwatch', label: 'CloudWatch',   x: 980, y: 110, catalogRule: "SLA 문서의 'RTO 10분' 요구사항을 만족하기 위해 CloudWatch 알람으로 장애를 조기 감지하고 자동화된 대응을 트리거합니다." },
    ],
    edges: [
      { edgeId: 'e1', from: 'route53-1', to: 'alb-1',  dashed: false },
      { edgeId: 'e2', from: 'alb-1',     to: 'ec2-1',  dashed: false },
      { edgeId: 'e3', from: 'alb-1',     to: 'ec2-2',  dashed: false },
      { edgeId: 'e4', from: 'ec2-1',     to: 'rds-1',  dashed: false },
      { edgeId: 'e5', from: 'ec2-2',     to: 'rds-1',  dashed: false },
      { edgeId: 'e6', from: 'rds-1',     to: 'rds-2',  dashed: true, label: '복제' },
      { edgeId: 'e7', from: 'ec2-1',     to: 'cw-1',   dashed: true },
    ],
  },
  {
    topologyId: 'topo-cost',
    label: '비용 최적화 구성',
    summary: '단일 AZ, Spot 인스턴스 — 월 비용 60% 절감',
    estimatedMonthlyCost: 960000,
    slaSatisfaction: { availability: '99.5%', rto: '30분', rpo: '15분' },
    rationale: ['Spot 인스턴스로 컴퓨팅 비용 절감', '단일 AZ로 데이터 전송 비용 최소화'],
    groups: [
      { groupId: 'g-vpc',  label: 'VPC  10.0.0.0/16', type: 'vpc',            x: 100, y: 20,  width: 500, height: 500 },
      { groupId: 'g-priv', label: 'Private Subnet',    type: 'private-subnet', x: 140, y: 60,  width: 420, height: 420 },
    ],
    nodes: [
      { nodeId: 'alb-1',  type: 'elb', label: 'ALB',        x: 200, y: 160, parentGroupId: 'g-priv', catalogRule: "SLA 문서의 '가용성 99.5%' 요구사항을 만족하기 위해 단일 AZ 내 트래픽 분산을 담당합니다." },
      { nodeId: 'ec2-1',  type: 'ec2', label: 'EC2 Spot',   x: 400, y: 240, parentGroupId: 'g-priv', catalogRule: "비용 최적화 요구사항을 만족하기 위해 Spot 인스턴스를 활용해 컴퓨팅 비용을 최대 70% 절감합니다." },
      { nodeId: 'rds-1',  type: 'rds', label: 'RDS Single', x: 400, y: 390, parentGroupId: 'g-priv', catalogRule: "SLA 문서의 'RPO 15분' 요구사항을 만족하기 위해 단일 AZ RDS에 자동 백업을 구성합니다." },
    ],
    edges: [
      { edgeId: 'e1', from: 'alb-1', to: 'ec2-1', dashed: false },
      { edgeId: 'e2', from: 'ec2-1', to: 'rds-1', dashed: false },
    ],
  },
  {
    topologyId: 'topo-serverless',
    label: '서버리스 구성',
    summary: 'Lambda + Aurora Serverless — 트래픽 0시 비용 없음',
    estimatedMonthlyCost: 1200000,
    slaSatisfaction: { availability: '99.95%', rto: '20분', rpo: '10분' },
    rationale: ['Lambda auto-scaling으로 트래픽 급증 대응', 'Aurora Serverless v2 자동 스케일'],
    groups: [
      { groupId: 'g-vpc', label: 'VPC  10.0.0.0/16', type: 'vpc', x: 200, y: 20, width: 400, height: 500 },
    ],
    nodes: [
      { nodeId: 'apigw-1',  type: 'apigw',  label: 'API Gateway',       x: 120, y: 120 },
      { nodeId: 'lambda-1', type: 'lambda', label: 'Lambda',             x: 400, y: 240, parentGroupId: 'g-vpc' },
      { nodeId: 'rds-1',    type: 'rds',    label: 'Aurora Serverless',  x: 400, y: 400, parentGroupId: 'g-vpc' },
    ],
    edges: [
      { edgeId: 'e1', from: 'apigw-1',  to: 'lambda-1', dashed: false },
      { edgeId: 'e2', from: 'lambda-1', to: 'rds-1',    dashed: false },
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

  http.post('*/api/terraform/generate', async ({ request }) => {
    const body = await request.json() as { topologyId: string }
    const { topologyId } = body

    const HCL: Record<string, string> = {
      'topo-ha': `# ── 고가용성 구성 (HA) ──────────────────────────────
provider "aws" {
  region = "ap-northeast-2"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "zeux-ha-vpc" }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-northeast-2a"
  tags = { Name = "zeux-public-a" }
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-northeast-2b"
  tags = { Name = "zeux-public-b" }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "ap-northeast-2a"
  tags = { Name = "zeux-private-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = "ap-northeast-2b"
  tags = { Name = "zeux-private-b" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "zeux-igw" }
}

resource "aws_eip" "nat" { domain = "vpc" }

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  tags          = { Name = "zeux-nat" }
}

resource "aws_route53_zone" "main" {
  name = "zeux-internal.local"
}

resource "aws_route53_health_check" "alb" {
  fqdn              = aws_lb.app.dns_name
  port              = 443
  type              = "HTTPS"
  failure_threshold = 3
}

resource "aws_lb" "app" {
  name               = "zeux-ha-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  tags               = { Name = "zeux-alb" }
}

resource "aws_launch_template" "app" {
  name_prefix   = "zeux-app-"
  image_id      = "ami-0c9c942bd7bf113a2"
  instance_type = "t3.medium"
}

resource "aws_autoscaling_group" "app" {
  desired_capacity    = 2
  min_size            = 2
  max_size            = 6
  vpc_zone_identifier = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
  tag { key = "Name" value = "zeux-app" propagate_at_launch = true }
}

resource "aws_db_subnet_group" "main" {
  name       = "zeux-db-subnet"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_db_instance" "primary" {
  identifier              = "zeux-rds-primary"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = "db.t3.medium"
  allocated_storage       = 100
  multi_az                = true
  db_subnet_group_name    = aws_db_subnet_group.main.name
  backup_retention_period = 7
  tags                    = { Name = "zeux-rds" }
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "zeux-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 80
}`,

      'topo-cost': `# ── 비용 최적화 구성 ────────────────────────────────
provider "aws" {
  region = "ap-northeast-2"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "zeux-cost-vpc" }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-northeast-2a"
  tags              = { Name = "zeux-private" }
}

resource "aws_lb" "app" {
  name               = "zeux-cost-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = [aws_subnet.private.id]
  tags               = { Name = "zeux-alb" }
}

resource "aws_spot_instance_request" "app" {
  ami                    = "ami-0c9c942bd7bf113a2"
  instance_type          = "t3.small"
  spot_type              = "persistent"
  subnet_id              = aws_subnet.private.id
  wait_for_fulfillment   = true
  tags                   = { Name = "zeux-spot-app" }
}

resource "aws_db_instance" "main" {
  identifier           = "zeux-rds-single"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  multi_az             = false
  db_subnet_group_name = aws_db_subnet_group.main.name
  backup_retention_period = 3
  tags                 = { Name = "zeux-rds" }
}

resource "aws_db_subnet_group" "main" {
  name       = "zeux-db-subnet"
  subnet_ids = [aws_subnet.private.id]
}`,

      'topo-serverless': `# ── 서버리스 구성 ────────────────────────────────────
provider "aws" {
  region = "ap-northeast-2"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "zeux-serverless-vpc" }
}

resource "aws_subnet" "lambda" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-northeast-2a"
  tags              = { Name = "zeux-lambda-subnet" }
}

resource "aws_api_gateway_rest_api" "main" {
  name        = "zeux-api"
  description = "ZeuX Serverless API Gateway"
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"
}

resource "aws_lambda_function" "app" {
  function_name = "zeux-app-handler"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  role          = aws_iam_role.lambda.arn
  memory_size   = 512
  timeout       = 30
  vpc_config {
    subnet_ids         = [aws_subnet.lambda.id]
    security_group_ids = [aws_security_group.lambda.id]
  }
  environment {
    variables = { DB_HOST = aws_rds_cluster.aurora.endpoint }
  }
  tags = { Name = "zeux-lambda" }
}

resource "aws_iam_role" "lambda" {
  name               = "zeux-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_security_group" "lambda" {
  name   = "zeux-lambda-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_rds_cluster" "aurora" {
  cluster_identifier   = "zeux-aurora-serverless"
  engine               = "aurora-mysql"
  engine_mode          = "provisioned"
  engine_version       = "8.0.mysql_aurora.3.04.0"
  database_name        = "zeuxdb"
  master_username      = "admin"
  master_password      = var.db_password
  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16
  }
  tags = { Name = "zeux-aurora" }
}

resource "aws_rds_cluster_instance" "aurora" {
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora.engine
}

variable "db_password" {
  description = "Aurora master password"
  type        = string
  sensitive   = true
}`,
    }

    const PLAN_ITEMS: Record<string, { resource: string; changeType: 'add' | 'change' | 'destroy'; riskLevel: 'low' | 'medium' | 'high'; slaImpact: string; estimatedCost: string }[]> = {
      'topo-ha': [
        { resource: 'aws_vpc.main',               changeType: 'add', riskLevel: 'low',    slaImpact: '없음',            estimatedCost: '+₩0/월' },
        { resource: 'aws_internet_gateway.igw',   changeType: 'add', riskLevel: 'low',    slaImpact: '없음',            estimatedCost: '+₩0/월' },
        { resource: 'aws_nat_gateway.nat',         changeType: 'add', riskLevel: 'low',    slaImpact: '없음',            estimatedCost: '+₩50,000/월' },
        { resource: 'aws_lb.app',                  changeType: 'add', riskLevel: 'medium', slaImpact: '가용성 +0.3%',   estimatedCost: '+₩28,000/월' },
        { resource: 'aws_autoscaling_group.app',   changeType: 'add', riskLevel: 'medium', slaImpact: '가용성 +0.5%',   estimatedCost: '+₩640,000/월' },
        { resource: 'aws_db_instance.primary',     changeType: 'add', riskLevel: 'high',   slaImpact: 'RTO 10분 달성',  estimatedCost: '+₩890,000/월' },
        { resource: 'aws_route53_health_check.alb',changeType: 'add', riskLevel: 'low',    slaImpact: 'RPO 5분 달성',   estimatedCost: '+₩2,500/월' },
        { resource: 'aws_cloudwatch_metric_alarm.cpu_high', changeType: 'add', riskLevel: 'low', slaImpact: '장애 감지 개선', estimatedCost: '+₩0/월' },
      ],
      'topo-cost': [
        { resource: 'aws_vpc.main',                changeType: 'add', riskLevel: 'low',    slaImpact: '없음',            estimatedCost: '+₩0/월' },
        { resource: 'aws_lb.app',                  changeType: 'add', riskLevel: 'medium', slaImpact: '가용성 +0.1%',   estimatedCost: '+₩18,000/월' },
        { resource: 'aws_spot_instance_request.app', changeType: 'add', riskLevel: 'high', slaImpact: '인터럽트 위험',  estimatedCost: '+₩96,000/월' },
        { resource: 'aws_db_instance.main',        changeType: 'add', riskLevel: 'medium', slaImpact: 'RPO 15분',       estimatedCost: '+₩180,000/월' },
      ],
      'topo-serverless': [
        { resource: 'aws_api_gateway_rest_api.main', changeType: 'add', riskLevel: 'low',  slaImpact: '없음',           estimatedCost: '+₩5,000/월' },
        { resource: 'aws_lambda_function.app',     changeType: 'add', riskLevel: 'low',    slaImpact: '가용성 +0.2%',   estimatedCost: '+₩120,000/월' },
        { resource: 'aws_rds_cluster.aurora',      changeType: 'add', riskLevel: 'medium', slaImpact: 'RPO 10분 달성',  estimatedCost: '+₩350,000/월' },
        { resource: 'aws_rds_cluster_instance.aurora', changeType: 'add', riskLevel: 'medium', slaImpact: '자동 스케일', estimatedCost: '+₩0 (사용량 과금)' },
        { resource: 'aws_iam_role.lambda',         changeType: 'add', riskLevel: 'low',    slaImpact: '없음',           estimatedCost: '+₩0/월' },
      ],
    }

    const hcl = HCL[topologyId] ?? HCL['topo-ha']
    const items = PLAN_ITEMS[topologyId] ?? PLAN_ITEMS['topo-ha']

    return HttpResponse.json({
      planId: `plan-${topologyId}`,
      hclPreview: hcl,
      _planItems: items,
    })
  }),

  http.post('*/api/terraform/plan', async ({ request }) => {
    const body = await request.json() as { planId: string }
    const topologyId = body.planId.replace('plan-', '')

    const PLAN_ITEMS: Record<string, { resource: string; changeType: 'add' | 'change' | 'destroy'; riskLevel: 'low' | 'medium' | 'high'; slaImpact: string; estimatedCost: string }[]> = {
      'topo-ha': [
        { resource: 'aws_vpc.main',               changeType: 'add', riskLevel: 'low',    slaImpact: '없음',            estimatedCost: '+₩0/월' },
        { resource: 'aws_internet_gateway.igw',   changeType: 'add', riskLevel: 'low',    slaImpact: '없음',            estimatedCost: '+₩0/월' },
        { resource: 'aws_nat_gateway.nat',         changeType: 'add', riskLevel: 'low',    slaImpact: '없음',            estimatedCost: '+₩50,000/월' },
        { resource: 'aws_lb.app',                  changeType: 'add', riskLevel: 'medium', slaImpact: '가용성 +0.3%',   estimatedCost: '+₩28,000/월' },
        { resource: 'aws_autoscaling_group.app',   changeType: 'add', riskLevel: 'medium', slaImpact: '가용성 +0.5%',   estimatedCost: '+₩640,000/월' },
        { resource: 'aws_db_instance.primary',     changeType: 'add', riskLevel: 'high',   slaImpact: 'RTO 10분 달성',  estimatedCost: '+₩890,000/월' },
        { resource: 'aws_route53_health_check.alb',changeType: 'add', riskLevel: 'low',    slaImpact: 'RPO 5분 달성',   estimatedCost: '+₩2,500/월' },
        { resource: 'aws_cloudwatch_metric_alarm.cpu_high', changeType: 'add', riskLevel: 'low', slaImpact: '장애 감지 개선', estimatedCost: '+₩0/월' },
      ],
      'topo-cost': [
        { resource: 'aws_vpc.main',                changeType: 'add', riskLevel: 'low',    slaImpact: '없음',            estimatedCost: '+₩0/월' },
        { resource: 'aws_lb.app',                  changeType: 'add', riskLevel: 'medium', slaImpact: '가용성 +0.1%',   estimatedCost: '+₩18,000/월' },
        { resource: 'aws_spot_instance_request.app', changeType: 'add', riskLevel: 'high', slaImpact: '인터럽트 위험',  estimatedCost: '+₩96,000/월' },
        { resource: 'aws_db_instance.main',        changeType: 'add', riskLevel: 'medium', slaImpact: 'RPO 15분',       estimatedCost: '+₩180,000/월' },
      ],
      'topo-serverless': [
        { resource: 'aws_api_gateway_rest_api.main', changeType: 'add', riskLevel: 'low',  slaImpact: '없음',           estimatedCost: '+₩5,000/월' },
        { resource: 'aws_lambda_function.app',     changeType: 'add', riskLevel: 'low',    slaImpact: '가용성 +0.2%',   estimatedCost: '+₩120,000/월' },
        { resource: 'aws_rds_cluster.aurora',      changeType: 'add', riskLevel: 'medium', slaImpact: 'RPO 10분 달성',  estimatedCost: '+₩350,000/월' },
        { resource: 'aws_rds_cluster_instance.aurora', changeType: 'add', riskLevel: 'medium', slaImpact: '자동 스케일', estimatedCost: '+₩0 (사용량 과금)' },
        { resource: 'aws_iam_role.lambda',         changeType: 'add', riskLevel: 'low',    slaImpact: '없음',           estimatedCost: '+₩0/월' },
      ],
    }

    const items = PLAN_ITEMS[topologyId] ?? PLAN_ITEMS['topo-ha']
    const addCount = items.filter(i => i.changeType === 'add').length

    return HttpResponse.json({
      planId: body.planId,
      summary: { add: addCount, change: 0, destroy: 0 },
      riskLevel: items.some(i => i.riskLevel === 'high') ? 'high' : 'medium',
      items,
    })
  }),

  http.get('*/api/terraform/apply/stream', async ({ request }) => {
    const url = new URL(request.url)
    const planId = url.searchParams.get('planId') ?? 'plan-topo-ha'
    const topologyId = planId.replace('plan-', '')

    const RESOURCES: Record<string, Array<{ resource: string; detail: string }>> = {
      'topo-ha': [
        { resource: 'aws_vpc.main',                              detail: 'VPC 생성 완료 (10.0.0.0/16)' },
        { resource: 'aws_internet_gateway.igw',                  detail: 'IGW 연결 완료' },
        { resource: 'aws_nat_gateway.nat',                       detail: 'NAT Gateway 생성 완료' },
        { resource: 'aws_lb.app',                                detail: 'ALB 생성 완료 (Multi-AZ)' },
        { resource: 'aws_autoscaling_group.app',                 detail: 'Auto Scaling Group 생성 완료 (min:2 max:10)' },
        { resource: 'aws_db_instance.primary',                   detail: 'RDS Primary 생성 완료 (Multi-AZ)' },
        { resource: 'aws_route53_health_check.alb',              detail: 'Route53 헬스체크 활성화 완료' },
        { resource: 'aws_cloudwatch_metric_alarm.cpu_high',      detail: 'CloudWatch 알람 8개 활성화 완료' },
      ],
      'topo-cost': [
        { resource: 'aws_vpc.main',                              detail: 'VPC 생성 완료' },
        { resource: 'aws_lb.app',                                detail: 'ALB 생성 완료' },
        { resource: 'aws_spot_instance_request.app',             detail: 'Spot Instance 요청 완료' },
        { resource: 'aws_db_instance.main',                      detail: 'RDS Single-AZ 생성 완료' },
      ],
      'topo-serverless': [
        { resource: 'aws_api_gateway_rest_api.main',             detail: 'API Gateway 생성 완료' },
        { resource: 'aws_lambda_function.app',                   detail: 'Lambda 함수 배포 완료' },
        { resource: 'aws_rds_cluster.aurora',                    detail: 'Aurora Serverless 클러스터 생성 완료' },
        { resource: 'aws_rds_cluster_instance.aurora',           detail: 'Aurora 인스턴스 연결 완료' },
        { resource: 'aws_iam_role.lambda',                       detail: 'Lambda 실행 역할 생성 완료' },
      ],
    }

    const resources = RESOURCES[topologyId] ?? RESOURCES['topo-ha']
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
        for (const { resource, detail } of resources) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ resource, status: 'in_progress', detail: '리소스 생성 중...' })}\n\n`
          ))
          await sleep(350)
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ resource, status: 'complete', detail })}\n\n`
          ))
          await sleep(150)
        }
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`))
        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }),

  http.post('*/api/ai/suggest', async ({ request }) => {
    const body = await request.json() as { fieldId: string; label: string; value: unknown }
    await new Promise(r => setTimeout(r, 750))

    const SUGGESTIONS: Record<string, Array<{ value: string; reason: string }>> = {
      multi_region: [
        { value: 'false', reason: 'MVP 단계에서는 단일 리전으로 시작하고 Phase 2에서 Active-Standby DR 구성을 추가하는 방식이 비용 효율적입니다.' },
        { value: 'true', reason: 'RTO 10분 요구사항을 완전히 충족하려면 us-east-1 Active-Standby 리전 구성이 필요합니다.' },
        { value: 'true (active-standby)', reason: 'SKT 통신 인프라 수준의 99.99% SLA 달성을 위해 Active-Standby 멀티 리전 구성을 권장합니다.' },
      ],
      sla_violation_loss_limit: [
        { value: '150000000', reason: '계약서 내 서비스 다운타임 1시간당 예상 매출 손실 기준 추정값으로, 현 단계에서 가장 현실적입니다.' },
        { value: '50000000', reason: 'SKT 유사 규모 B2B 프로젝트의 평균 SLA 위반 페널티 상한선으로, 보수적 접근에 적합합니다.' },
        { value: '300000000', reason: '결제 서비스 포함 미션 크리티컬 시스템의 위약금 조항 기준 최대 리스크 금액입니다.' },
      ],
      new_vpc_required: [
        { value: 'true', reason: '기존 VPC와 CIDR 충돌을 방지하고 보안 격리를 위해 신규 VPC 생성을 권장합니다.' },
        { value: 'false', reason: 'SKT 기존 네트워크 인프라 재활용으로 비용 절감 및 VPN 연동 복잡도를 낮출 수 있습니다.' },
        { value: 'true (10.1.0.0/16)', reason: '전용 CIDR 블록으로 신규 VPC를 구성해 IP 충돌 없이 Transit Gateway로 피어링합니다.' },
      ],
    }

    const fieldSuggestions = SUGGESTIONS[body.fieldId as string]
    if (fieldSuggestions) {
      return HttpResponse.json({ suggestions: fieldSuggestions })
    }

    const currentVal = String(body.value ?? '')
    return HttpResponse.json({
      suggestions: [
        { value: currentVal, reason: `문서에서 추출한 값으로 ${body.label} 기준값으로 적합합니다. 운영팀 확인 후 확정을 권장합니다.` },
        { value: currentVal, reason: '유사 규모 프로젝트의 평균값을 참고한 추정치입니다. 실제 계약 조건과 대조해 주세요.' },
        { value: '미정', reason: '현 시점에서 확정이 어렵다면 다음 단계에서 재검토 후 반영할 수 있습니다.' },
      ],
    })
  }),

  http.get('*/api/terraform/verify/:id', () => {
    return HttpResponse.json({
      verifyId: 'verify-mock-001',
      overall: 'pass',
      categories: [
        { category: '리소스 존재 확인',     status: 'pass', detail: '12개 리소스 모두 프로비저닝 확인' },
        { category: '네트워크 연결성',      status: 'pass', detail: 'VPC 라우팅·서브넷 간 통신 정상' },
        { category: '보안 그룹 규칙',       status: 'pass', detail: '최소 권한 원칙 적용, 불필요 포트 차단' },
        { category: '컴퓨팅 헬스체크',      status: 'pass', detail: 'EC2/ASG 헬스체크 통과 (2/2 인스턴스)' },
        { category: 'DB 연결 확인',         status: 'pass', detail: 'RDS Primary 응답 정상, 복제 지연 0ms' },
        { category: '모니터링 메트릭 송출', status: 'pass', detail: 'CloudWatch 메트릭 8종 수집 중' },
        { category: '토폴로지 정합성',      status: 'pass', detail: '승인된 토폴로지와 구성 일치 확인' },
        { category: '컴플라이언스 점검',    status: 'pass', detail: 'ISMS-P·개인정보보호법 항목 통과' },
      ],
    })
  }),
]
