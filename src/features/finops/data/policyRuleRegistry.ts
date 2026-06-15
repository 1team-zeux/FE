/** FinOps Agent 판정 규칙 레지스트리 — 외부·공식 출처 중심 (UI 푸터) */
export type PolicyRuleCategory = 'detection' | 'guard' | 'rca' | 'topology' | 'priority' | 'governance'

export interface PolicyRuleRow {
  ruleId: string
  category: PolicyRuleCategory
  name: string
  condition: string
  outcome: string
  /** 1차 인용 (저자·기관·문서명) */
  sourceRef: string
  sourceUrl?: string
  /** 인용 맥락 (장·절·원문 요지) */
  sourceNote?: string
}

export interface PolicyBibliography {
  id: string
  title: string
  publisher: string
  year?: string
  url?: string
  note?: string
}

export const POLICY_REGISTRY_VERSION = '1.1'
export const POLICY_REGISTRY_DATE = '2026-06-15'
export const POLICY_NORMATIVE_DOC = 'Industry frameworks & cloud provider guidance'

export const DETECTION_RULES: PolicyRuleRow[] = [
  {
    ruleId: 'DET-001',
    category: 'detection',
    name: 'EC2 유휴 (idle_ec2_cpu)',
    condition: 'resource_type=ec2 AND CPU p95 < 5.0% AND 관찰 기간 ≥ 7일',
    outcome: 'recommended_action=stop · confidence 0.70~0.85',
    sourceRef: 'AWS Compute Optimizer — Underutilized EC2 instances',
    sourceUrl: 'https://docs.aws.amazon.com/compute-optimizer/latest/ug/viewing-recommendations.html',
    sourceNote: '14일 lookback·max CPU 기반 rightsizing. ZeuX는 p95 5%로 더 보수 적용.',
  },
  {
    ruleId: 'DET-002',
    category: 'detection',
    name: '미연결 EBS (idle_ebs_unattached)',
    condition: 'resource_type=ebs AND attached=false',
    outcome: 'recommended_action=delete · confidence 0.90',
    sourceRef: 'AWS Trusted Advisor — Cost Optimization checks',
    sourceUrl: 'https://docs.aws.amazon.com/awssupport/latest/user/cost-optimization-checks.html',
    sourceNote: 'Unattached EBS volumes — 스토리지 비용만 발생하는 낭비 패턴.',
  },
  {
    ruleId: 'DET-003',
    category: 'detection',
    name: 'RDS 과잉 (overprovision_rds)',
    condition: 'resource_type=rds AND CPU avg < 20.0% AND 관찰 기간 ≥ 7일',
    outcome: 'recommended_action=downsize · confidence 0.75',
    sourceRef: 'AWS RDS — Performance Insights & rightsizing',
    sourceUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html',
    sourceNote: '지속적 저 CPU는 인스턴스 클래스 축소 후보 (stop/delete 아님).',
  },
  {
    ruleId: 'DET-004',
    category: 'detection',
    name: 'NAT 저트래픽 (idle_nat_gateway)',
    condition: 'resource_type=nat AND egress_gb_per_day < 1.0',
    outcome: 'recommended_action=delete · confidence 0.65',
    sourceRef: 'AWS NAT Gateway — Pricing & architecture',
    sourceUrl: 'https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html',
    sourceNote: '시간당 고정 요금 대비 저 egress → VPC Endpoint 등 아키텍처 재검토.',
  },
  {
    ruleId: 'DET-005',
    category: 'detection',
    name: 'K8s overprovision',
    condition: 'request_vs_usage_ratio ≥ 2.0',
    outcome: 'recommended_action=schedule (확장 예정)',
    sourceRef: 'Kubernetes — Resource requests and limits',
    sourceUrl: 'https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
    sourceNote: 'request 대비 실사용 과다 시 스케줄·rightsizing 검토.',
  },
  {
    ruleId: 'DET-MOD',
    category: 'detection',
    name: '부분 분석 보정',
    condition: 'partial_analysis_mode=true OR data_quality≠ok',
    outcome: 'confidence_score × 0.9 (판정 유지, 신뢰도만 하향)',
    sourceRef: 'NIST SP 800-137 — Information Security Continuous Monitoring',
    sourceUrl: 'https://csrc.nist.gov/publications/detail/sp/800-137/final',
    sourceNote: '관측 데이터 불완전 시 권고 신뢰도 하향 (판정 보수화).',
  },
]

export const GUARD_RULES: PolicyRuleRow[] = [
  {
    ruleId: 'GRD-001',
    category: 'guard',
    name: 'Production 환경',
    condition: 'prod_recommend_block=true AND env=prod',
    outcome: 'guard_status=blocked',
    sourceRef: 'AWS Well-Architected — Cost Optimization Pillar (CO-2)',
    sourceUrl: 'https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/change-management.html',
    sourceNote: 'Production 변경은 승인·롤백 계획·영향 분석 선행.',
  },
  {
    ruleId: 'GRD-002',
    category: 'guard',
    name: 'Critical / Tier1',
    condition: 'critical=true OR service_tier=Tier1',
    outcome: 'standard → defer · conservative → blocked',
    sourceRef: 'Google SRE Book — Embracing Risk (service tiers)',
    sourceUrl: 'https://sre.google/sre-book/chapters/embracing-risk/',
    sourceNote: '상위 tier일수록 변경·비용 조치에 높은 신중성 요구.',
  },
  {
    ruleId: 'GRD-003',
    category: 'guard',
    name: 'Tier2',
    condition: 'service_tier=Tier2',
    outcome: 'guard_status=defer',
    sourceRef: 'Google SRE Book — Managing Critical State',
    sourceUrl: 'https://sre.google/sre-book/chapters/managing-critical-state/',
    sourceNote: '중요도 중간 서비스는 수동 재검토 후 권유.',
  },
  {
    ruleId: 'GRD-004',
    category: 'guard',
    name: 'RPO/RTO — DB 조치',
    condition: 'resource_type∈{rds,db} AND action∈{stop,delete}',
    outcome: 'RPO≤15m → blocked · RTO≤60m → defer',
    sourceRef: 'ISO 22301 — Business continuity (RPO/RTO)',
    sourceUrl: 'https://www.iso.org/standard/75106.html',
    sourceNote: '짧은 RPO/RTO는 DB 중지·삭제가 복구 목표를 침해할 수 있음.',
  },
  {
    ruleId: 'GRD-005',
    category: 'guard',
    name: 'Error Budget at_risk',
    condition: 'error_budget.at_risk=true OR EB 데이터 미가용',
    outcome: 'guard_status=defer',
    sourceRef: 'Google SRE Book — Release Engineering (Error Budget policy)',
    sourceUrl: 'https://sre.google/sre-book/chapters/release-engineering/',
    sourceNote: 'Budget 소진·위험 구간에서 릴리스·리스크 변경 제한.',
  },
  {
    ruleId: 'GRD-006',
    category: 'guard',
    name: 'Open Incident',
    condition: 'open incident AND (resource OR service 매칭)',
    outcome: 'guard_status=defer',
    sourceRef: 'ITIL 4 — Incident Management Practice',
    sourceUrl: 'https://www.axelos.com/certifications/itil-service-management',
    sourceNote: '활성 장애 중 비긴급 변경·최적화 보류.',
  },
  {
    ruleId: 'GRD-007',
    category: 'guard',
    name: 'Compliance (결제·PII)',
    condition: 'has_payment_info OR has_pii AND action=delete',
    outcome: 'guard_status=defer',
    sourceRef: 'PCI DSS v4.0 — Data retention & secure deletion',
    sourceUrl: 'https://www.pcisecuritystandards.org/document_library/',
    sourceNote: '결제·개인정보 스토리지 삭제는 보존·감사 요건 검토 필요.',
  },
  {
    ruleId: 'GRD-008',
    category: 'guard',
    name: '제외 태그',
    condition: 'resource tag finops:exclude',
    outcome: '분석 대상에서 제외',
    sourceRef: 'FinOps Foundation — Resource Tagging capability',
    sourceUrl: 'https://www.finops.org/framework/capabilities/resource-tagging/',
    sourceNote: '비용 배분·제외 대상 리소스 태깅 관행.',
  },
  {
    ruleId: 'GRD-009',
    category: 'guard',
    name: 'Recent topology / deploy change',
    condition: 'change within 48h AND action ∈ stop/delete/downsize/resize',
    outcome: 'guard_status=defer',
    sourceRef: 'ITIL 4 — Change Enablement Practice',
    sourceUrl: 'https://www.axelos.com/certifications/itil-service-management',
    sourceNote: '배포·토폴로지 변경 직후 안정화 기간 — 공격적 비용 조치 보류.',
  },
]

export const TOPOLOGY_RULES: PolicyRuleRow[] = [
  {
    ruleId: 'TOP-001',
    category: 'topology',
    name: 'Recent change defer window',
    condition: 'topology_context.recent_change_within_hours ≤ 48',
    outcome: 'finops_impact=defer_recommended · guard defer for risky actions',
    sourceRef: 'ITIL 4 — Change Enablement · Release validation',
    sourceUrl: 'https://www.axelos.com/certifications/itil-service-management',
    sourceNote: 'action_histories·service_dependencies·RCA config_change 맥락 반영.',
  },
  {
    ruleId: 'TOP-002',
    category: 'topology',
    name: 'Resource graph downstream impact',
    condition: 'proposal_impact: broken_edges OR affected_peers AND action ∈ stop/delete',
    outcome: 'guard_status=defer · as-is vs to-be diff',
    sourceRef: 'FinOps Foundation — Inform phase (impact analysis before action)',
    sourceUrl: 'https://www.finops.org/framework/phases/',
    sourceNote: 'zeux.resource_dependencies 기반 what-if — 제안 전후 그래프 대조.',
  },
  {
    ruleId: 'TOP-003',
    category: 'topology',
    name: 'Topology Agent design diagram overlay',
    condition: 'approved topology diagram + resource type match',
    outcome: 'design_proposal_impact on matched nodes/edges',
    sourceRef: 'ZeuX Topology Recommendation Agent — approved diagram',
    sourceNote: 'SLA bundle_id → approved_topologies.topology_json.diagram what-if.',
  },
]

export const RCA_RULES: PolicyRuleRow[] = [
  {
    ruleId: 'RCA-001',
    category: 'rca',
    name: 'config_change',
    condition: 'RCA cause_type=config_change',
    outcome: 'conservative mode · defer stop/delete/resize',
    sourceRef: 'ITIL 4 — Change Enablement Practice',
    sourceUrl: 'https://www.axelos.com/certifications/itil-service-management',
    sourceNote: '설정 변경 직후 안정화 기간 — 비용 조치 보류.',
  },
  {
    ruleId: 'RCA-002',
    category: 'rca',
    name: 'api_dependency_slowdown',
    condition: 'RCA cause_type=api_dependency_slowdown',
    outcome: 'suppress idle_ec2_cpu, idle_ebs',
    sourceRef: 'Dean & Barroso, "The Tail at Scale" (CACM 2013)',
    sourceUrl: 'https://research.google/pubs/pub40801/',
    sourceNote: 'Upstream 지연 시 downstream 유휴·저부하 오탐 가능.',
  },
  {
    ruleId: 'RCA-003',
    category: 'rca',
    name: 'db_saturation',
    condition: 'RCA cause_type=db_saturation',
    outcome: 'defer stop · blocked delete',
    sourceRef: 'AWS RDS — Best practices for DB instance sizing',
    sourceUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html',
    sourceNote: '용량 포화 구간에서 stop/delete는 복구·성능 리스크.',
  },
  {
    ruleId: 'RCA-004',
    category: 'rca',
    name: 'Resource override (high confidence)',
    condition: 'RCA confidence ≥ 0.65 AND resource ∈ affected_resources',
    outcome: 'guard_status=defer (resource별)',
    sourceRef: 'NIST SP 800-61 — Computer Security Incident Handling Guide',
    sourceUrl: 'https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final',
    sourceNote: '사고·근본원인 확신도 높을 때 자동 조치 보수화.',
  },
]

export const PRIORITY_RULES: PolicyRuleRow[] = [
  {
    ruleId: 'PRI-001',
    category: 'priority',
    name: 'Priority band (P0/P1/P2)',
    condition: 'eligible finding only',
    outcome: 'monthly_waste ≥ $50 → P0 · ≥ $15 → P1 · else P2',
    sourceRef: 'FinOps Foundation — Prioritization (Inform → Optimize)',
    sourceUrl: 'https://www.finops.org/framework/phases/',
    sourceNote: '영향도(절감 규모) 기반 백로그 밴드 분류.',
  },
  {
    ruleId: 'PRI-002',
    category: 'priority',
    name: 'Multi-criteria score',
    condition: 'eligible + cost_line_items',
    outcome: 'score = waste×0.5 + confidence×0.2 + ease×0.2 (+ tier×0.1)',
    sourceRef: 'FinOps Foundation — Workload Optimization & Reduction',
    sourceUrl: 'https://www.finops.org/framework/capabilities/workload-optimization/',
    sourceNote: '절감액·신뢰도·실행 용이도 복합 우선순위.',
  },
  {
    ruleId: 'PRI-003',
    category: 'priority',
    name: 'Cost savings scenario',
    condition: 'eligible finding',
    outcome: 'stop/delete=100% · downsize=35% · schedule=45%',
    sourceRef: 'AWS Billing & Cost Management — Pricing & savings plans',
    sourceUrl: 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bp-sp-ris.html',
    sourceNote: '예상 절감은 시나리오 가정이며 실현 절감과 다를 수 있음.',
  },
]

export const GOVERNANCE_RULES: PolicyRuleRow[] = [
  {
    ruleId: 'GOV-001',
    category: 'governance',
    name: 'Human-in-the-loop (비자동 실행)',
    condition: 'Approve/Reject',
    outcome: '상태 기록만 · 인프라 API/Terraform 미호출',
    sourceRef: 'FinOps Foundation — Inform / Optimize / Operate phases',
    sourceUrl: 'https://www.finops.org/framework/phases/',
    sourceNote: '권유·검토(Inform/Optimize)와 실행(Operate) 분리.',
  },
  {
    ruleId: 'GOV-002',
    category: 'governance',
    name: 'Deterministic decision engine',
    condition: '판정·guard·금액·순위',
    outcome: '규칙 엔진 담당 · LLM은 설명·요약만 (기본 off)',
    sourceRef: 'NIST AI RMF 1.0 — Manage (human oversight of automated decisions)',
    sourceUrl: 'https://www.nist.gov/itl/ai-risk-management-framework',
    sourceNote: '자동 권고의 핵심 판정은 결정론 로직·감사 가능성 유지.',
  },
  {
    ruleId: 'GOV-003',
    category: 'governance',
    name: 'Immutable run scope',
    condition: '단일 run_id 실행',
    outcome: 'scope·policy 실행 중 변경 없음',
    sourceRef: 'ISO/IEC 27001 — Change management (A.8)',
    sourceUrl: 'https://www.iso.org/standard/82875.html',
    sourceNote: '배치 단위 분석 기준 고정 — 재현성·감사 추적.',
  },
  {
    ruleId: 'GOV-004',
    category: 'governance',
    name: 'Stale SLA context',
    condition: 'SLA Bundle age > 14일 OR missing',
    outcome: 'sla_guard_mode=conservative',
    sourceRef: 'ITIL 4 — Service Configuration Management',
    sourceUrl: 'https://www.axelos.com/certifications/itil-service-management',
    sourceNote: '오래된 구성·SLA 메타데이터 시 보수적 가드.',
  },
]

export const GUARD_STATUS_DEFINITIONS = [
  { status: 'eligible', definition: '리포트·비용 산출·우선순위 백로그 대상. 권유 본문 포함 가능.' },
  { status: 'defer', definition: '보류·수동 재검토. 감사 추적용 부록 포함, 자동 권유 본문 제외 권장.' },
  { status: 'blocked', definition: '권유 본문 제외. prod/critical/conservative 등 고위험 분류.' },
] as const

export const POLICY_BIBLIOGRAPHY: PolicyBibliography[] = [
  {
    id: 'REF-01',
    title: 'AWS Compute Optimizer User Guide',
    publisher: 'Amazon Web Services',
    url: 'https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html',
  },
  {
    id: 'REF-02',
    title: 'AWS Well-Architected Framework — Cost Optimization Pillar',
    publisher: 'Amazon Web Services',
    url: 'https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html',
  },
  {
    id: 'REF-03',
    title: 'Site Reliability Engineering (Google SRE Book)',
    publisher: 'Google',
    year: '2016–2023',
    url: 'https://sre.google/sre-book/table-of-contents/',
    note: 'Error Budget, service tiers, release policy',
  },
  {
    id: 'REF-04',
    title: 'FinOps Foundation Framework',
    publisher: 'FinOps Foundation',
    url: 'https://www.finops.org/framework/',
  },
  {
    id: 'REF-05',
    title: 'ITIL 4 Service Management Practices',
    publisher: 'Axelos',
    url: 'https://www.axelos.com/certifications/itil-service-management',
    note: 'Incident, Change Enablement, Configuration Management',
  },
  {
    id: 'REF-06',
    title: 'NIST SP 800-137 — Information Security Continuous Monitoring',
    publisher: 'NIST',
    year: '2011',
    url: 'https://csrc.nist.gov/publications/detail/sp/800-137/final',
  },
  {
    id: 'REF-07',
    title: 'NIST SP 800-61 Rev.2 — Incident Handling Guide',
    publisher: 'NIST',
    year: '2012',
    url: 'https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final',
  },
  {
    id: 'REF-08',
    title: 'PCI DSS v4.0',
    publisher: 'PCI Security Standards Council',
    url: 'https://www.pcisecuritystandards.org/document_library/',
  },
  {
    id: 'REF-09',
    title: 'ISO 22301 — Security and resilience (BCM)',
    publisher: 'ISO',
    url: 'https://www.iso.org/standard/75106.html',
    note: 'RPO/RTO 개념',
  },
  {
    id: 'REF-10',
    title: 'The Tail at Scale',
    publisher: 'Dean & Barroso, Communications of the ACM',
    year: '2013',
    url: 'https://research.google/pubs/pub40801/',
    note: '분산 시스템 연쇄 지연·의존성',
  },
  {
    id: 'REF-11',
    title: 'NIST AI Risk Management Framework (AI RMF 1.0)',
    publisher: 'NIST',
    year: '2023',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
  },
  {
    id: 'REF-12',
    title: 'Kubernetes — Managing Resources for Containers',
    publisher: 'CNCF / Kubernetes',
    url: 'https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/',
  },
]
