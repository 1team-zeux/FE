# ZeuX V04 Terraform 모듈 카탈로그

## 메타

| 항목 | 내용 |
|---|---|
| 버전 | v1.0 (MVP) |
| 적용 범위 | FR-iac-008 (Terraform HCL 코드 자동 생성) |
| 입력 자산 | 토폴로지 결정 카탈로그가 산출한 토폴로지 JSON (`approved` 상태) |
| Phase 2 항목 | EKS 모듈 / Multi-Region 네트워크 / Aurora / Cross-Region 백업 |

본 카탈로그가 존재하는 본질적 이유 — *LLM이 Terraform 코드를 직접 작성하면 IaC의 핵심 가치인 재현 가능성이 깨진다*. LLM은 학습 데이터의 Terraform CLI·AWS Provider 버전이 섞여 있어 같은 입력이라도 매번 다른 syntax·구조의 코드를 산출한다. 본 카탈로그는 *미리 정의된 모듈 라이브러리*를 두고 LLM 자유도를 *변수 값 산출*로 한정함으로써 *같은 입력 → 같은 코드 → 같은 인프라*를 보장한다.

---

## 1. 버전 핀 정책

IaC 재현 가능성의 기반. 버전 변경 시 본 카탈로그 갱신과 영향 분석 필수.

| 항목 | 핀 | 정책 |
|---|---|---|
| Terraform CLI | `~> 1.6.0` | 메이저 변경 시 카탈로그 전면 재검토 |
| AWS Provider (`hashicorp/aws`) | `~> 5.40.0` | 마이너 업 가능, 메이저 업은 별도 마이그레이션 |
| 외부 모듈 사용 | **원칙 미사용** | 사용 시 정확 버전 핀 (느슨한 `~>` 금지) |
| ZeuX 자체 모듈 | semver | breaking change 시 메이저 업, 카탈로그 명시 |

---

## 2. 모듈 패밀리 6개 + sub-module

### 2.1 `region` 패밀리

| sub-module | 책임 | 매핑 토폴로지 옵션 |
|---|---|---|
| `single_region_n_az` | AWS provider 설정 + AZ data source (AZ 수는 변수) | R1·R2·R3 공통 (az_count 변수로 분기) |

**Phase 2**: Multi-Region 관련 sub-module

### 2.2 `network` 패밀리

| sub-module | 책임 | 매핑 토폴로지 옵션 |
|---|---|---|
| `vpc_3tier` | VPC + Public/App/DB Subnet × N AZ | Subnet 구조 = 3-tier |
| `vpc_2tier` | VPC + Public/Private Subnet × N AZ | Subnet 구조 = 2-tier |
| `vpc_private_only` | VPC + Private Subnet only | Subnet 구조 = Private-only |
| `lb_alb` | ALB + Target Group | LB = ALB |
| `lb_alb_waf` | ALB + WAFv2 WebACL | LB = ALB+WAF (compliance 강) |
| `lb_nlb` | NLB + Target Group | LB = NLB |
| `nat_gateway` | NAT Gateway × N AZ + EIP | NAT = Gateway (관리형) |
| `nat_instance` | NAT Instance ASG + EIP | NAT = Instance (비용 절감) |
| `vpc_endpoint_set` | VPC Endpoint 집합 (S3·CloudWatch 기본 + 조건부 ECR·STS·KMS·RDS) | VPC Endpoint 세트 |
| `security_groups_tiered` | Tier별 SG 분리 (ALB-SG / App-SG / DB-SG) | tier 0 또는 compliance 강 |
| `security_group_basic` | 기본 단일 SG | 그 외 |

### 2.3 `compute` 패밀리

| sub-module | 책임 | 매핑 토폴로지 옵션 |
|---|---|---|
| `ec2_asg` | EC2 Auto Scaling Group + Launch Template + ASG 정책 | C1 |
| `ecs_fargate_service` | ECS Cluster + Service + Task Definition (Fargate launch type) | C2 |
| `lambda_function` | Lambda Function + Execution Role + Trigger 설정 | C3 |

각 sub-module은 *서비스별로 인스턴스화* — SKT T-Care처럼 BU 안 3개 서비스면 web/api 각각 `ecs_fargate_service` 인스턴스 1번, batch는 `ec2_asg` 또는 `lambda_function` 인스턴스 1번. Terraform `module` 블록 여러 번 호출.

### 2.4 `database` 패밀리

| sub-module | 책임 | 매핑 토폴로지 옵션 |
|---|---|---|
| `rds_single_az` | RDS 인스턴스 (Single-AZ) | D2 |
| `rds_multi_az` | RDS 인스턴스 (Multi-AZ) | D3 |
| `rds_multi_az_with_read_replica` | RDS Multi-AZ + Read Replica × N | D4 |

**D1 (EC2 자체 설치 DB) 처리**: database 패밀리에는 sub-module 없음. `compute.ec2_asg` 인스턴스화 + DB 자체 설치 user_data 스크립트로 처리. *MVP는 D1 사용 비권장* (운영 부담 큼).

**Phase 2**: Aurora 관련 sub-module

### 2.5 `persistence` 패밀리

| sub-module | 책임 | 매핑 토폴로지 옵션 |
|---|---|---|
| `backup_basic` | RDS 자동 백업 (보존 7일) | P1 |
| `backup_with_snapshot` | 자동 백업 + 수동 Snapshot 스케줄 | P2 |
| `backup_with_pitr` | 자동 백업 + PITR 활성화 | P3 |

각 sub-module은 *DB 인스턴스에 부착*되는 형태. database 모듈 output을 input으로 받음.

**Phase 2**: Cross-Region Snapshot, Glacier 장기 보존

### 2.6 `common` 패밀리

| sub-module | 책임 | 적용 범위 |
|---|---|---|
| `zeux_standard_tags` | ZeuX 표준 태그 출력 (customer_id·service_id·tier·environment·managed_by) | 모든 리소스 |
| `iam_zeux_cloudwatch_reader` | IAM Role + Policy (cloudwatch:GetMetricData·ListMetrics) | compute·database가 attach |
| `adot_collector_ec2_userdata` | ADOT Collector daemon 설치 user_data 스크립트 (systemd 등록) | C1 부착 |
| `adot_collector_ecs_sidecar` | ECS Task Definition에 ADOT sidecar container 추가 | C2 부착 |
| `adot_lambda_layer` | Lambda Function에 ADOT Layer attach | C3 부착 |
| `cloudwatch_metric_streams` | CloudWatch Metric Streams + Kinesis Firehose → ZeuX 본사 백엔드 | AWS Native 리소스 송출 |

---

## 3. 변수 매핑 규칙

토폴로지 JSON의 어느 필드가 어느 모듈 변수로 들어가는지. 매핑은 **3갈래로 일관** — `dimensions.*` / `llm_adjustments.*` / `metadata.*`.

### 3.1 `dimensions.*` 출처 (결정론적, 결정 규칙 산출)

| 모듈·변수 | 토폴로지 JSON 경로 |
|---|---|
| `region.single_region_n_az.region` | `dimensions.region.details.region` |
| `region.single_region_n_az.az_count` | `dimensions.region.details.az_count` |
| `network.vpc_*tier.vpc_cidr` | `dimensions.network.details.vpc_cidr` |
| `network.vpc_*tier.subnet_cidrs` | `dimensions.network.details.subnet_cidrs` |
| `network.lb_alb_waf.waf_rules` | `dimensions.network.details.waf_rules` |
| `database.rds_*.engine` | `dimensions.database.details.engine` |
| `database.rds_*.multi_az` | `dimensions.database.details.multi_az` |
| `persistence.backup_*.retention_days` | `dimensions.persistence.details.retention_days` |

### 3.2 `llm_adjustments.*` 출처 (LLM 산출, 토폴로지 단계에서 채워짐)

| 모듈·변수 | 토폴로지 JSON 경로 |
|---|---|
| `compute.ec2_asg.instance_type` | `llm_adjustments.instance_types.compute_nodes` |
| `compute.ec2_asg.min_size` / `max_size` | `llm_adjustments.node_counts.compute_min` / `compute_max` |
| `compute.ecs_fargate_service.task_cpu` / `task_memory` | `llm_adjustments.instance_types.ecs_task_cpu` / `ecs_task_memory` |
| `compute.ecs_fargate_service.desired_count` | `llm_adjustments.node_counts.compute_initial` |
| `database.rds_*.db_instance_class` | `llm_adjustments.instance_types.db_writer` |
| `database.rds_multi_az_with_read_replica.read_replica_count` | `llm_adjustments.node_counts.read_replica_count` |
| `database.rds_*.allocated_storage` | `llm_adjustments.storage.db_initial_gb` |

### 3.3 `metadata.*` 출처 (식별·태깅)

| 모듈·변수 | 토폴로지 JSON 경로 |
|---|---|
| `common.zeux_standard_tags.customer_id` | `metadata.customer_id` |
| `common.zeux_standard_tags.service_id` | `metadata.service_id` |
| `common.zeux_standard_tags.environment` | `metadata.environment` |

매핑 불일치(빈 값·타입 불일치)는 카탈로그 위반으로 FR-iac-008의 정적 검증 단계에서 실패 처리.

---

## 4. 모듈 조립 의존 순서

Terraform 모듈은 *output → 다음 모듈 input* 의존이 있어 잘못된 순서로 호출하면 plan 단계에서 실패. 본 카탈로그는 다음 순서를 강제:

| 순서 | 모듈 | 핵심 의존 |
|---|---|---|
| 1 | `common.zeux_standard_tags` | 없음 (다른 모든 모듈에 tags output 전달) |
| 2 | `common.iam_zeux_cloudwatch_reader` | 없음 (compute·database에 role_arn 전달) |
| 3 | `region.single_region_n_az` | 없음 (network에 region·az_names 전달) |
| 4 | `network.vpc_*tier` | region |
| 5 | `network.security_groups_*` | VPC |
| 6 | `network.lb_*` | VPC + Subnet + SG |
| 7 | `network.nat_*` | VPC + Public Subnet |
| 8 | `network.vpc_endpoint_set` | VPC |
| 9 | `database.rds_*` | VPC + DB Subnet + SG + IAM |
| 10 | `compute.*` | VPC + Subnet + SG + IAM + (DB endpoint) |
| 11 | `persistence.backup_*` | RDS 인스턴스 |
| 12 | `common.adot_collector_*` | compute (각 컴퓨팅 옵션별 부착 방식) |
| 13 | `common.cloudwatch_metric_streams` | AWS Native 리소스 식별자 |

### 주요 output → input 연결 예시

| 출처 output | 대상 input |
|---|---|
| `region.region_name` | `network.region` |
| `network.vpc_id` | `compute.vpc_id` · `database.vpc_id` |
| `network.private_subnet_ids` | `compute.subnet_ids` |
| `network.db_subnet_ids` | `database.subnet_ids` |
| `network.app_sg_id` | `compute.security_group_ids` |
| `network.db_sg_id` | `database.security_group_ids` |
| `common.iam_zeux_cloudwatch_reader.role_arn` | `compute.iam_instance_profile` · `database.monitoring_role_arn` |
| `database.db_endpoint` | `compute.environment_variables.DB_HOST` (Lambda·ECS·EC2 환경변수 주입) |
| `compute.*_resource_arns` | `cloudwatch_metric_streams.resource_filter` |

---

## 5. LLM 영역과의 경계

FR-iac-008은 결정론적 모듈 조립이 본체. LLM은 *코드 자체를 쓰지 않음*. 명확한 경계:

| 영역 | 결정론적 (모듈 카탈로그) | LLM 영역 |
|---|---|---|
| 모듈 선택 | ✓ (토폴로지 decision_code → 모듈 매핑) | × |
| 모듈 호출 코드 작성 | ✓ (템플릿 기반 조립) | × |
| 변수 값 주입 | ✓ (3.1·3.3 토폴로지 JSON 경로 매핑) | × |
| 인스턴스 타입·노드 수·HPA 임계값 | × | ✓ (3.2 — `llm_adjustments`에 채워져 토폴로지 단계에서 산출됨) |
| user_data 스크립트 본문 | ✓ (모듈에 템플릿 내장) | ×  |
| user_data 스크립트의 가변 변수만 | × | ✓ (예: 패키지 버전·환경별 분기) |
| 정적 검증 결과 해석·수정 제안 | × | ✓ (tfsec 위반 시 챗봇 명확화 질문) |
| rationale_md 본문 | × | ✓ (토폴로지 단계에서) |

LLM 영역은 모두 *토폴로지 단계*(FR-iac-006)에서 산출되어 토폴로지 JSON에 포함됨. FR-iac-008(본 카탈로그 적용 단계)에는 LLM 코드 작성 영역이 거의 없음 — tfsec 위반 해석 정도만.

---

## 6. 정적 검증 도구 체인

생성된 HCL 코드는 다음 4단계 검증을 자동 수행 (FR-iac-008 명세):

| 단계 | 도구 | 검증 내용 | 실패 시 |
|---|---|---|---|
| 1 | `terraform validate` | syntax·configuration 유효성 | 즉시 실패, Agent 재생성 시도 |
| 2 | `terraform fmt` | 포맷팅 일관성 | 자동 교정 |
| 3 | `tflint` | provider별 모범 사례 | 경고 표시, 운영자 확인 |
| 4 | `tfsec` | 보안 정책 위반 | 위반 잔존 시 챗봇 명확화 질문 |

검증 도구 버전도 핀 — `tflint ~> 0.50`, `tfsec ~> 1.28` (운영 환경에 맞춰 갱신).

---

## Phase 2 항목 일괄 (참조용)

- **컴퓨팅**: `eks_managed_node_group`, `eks_fargate_profile`, `eks_irsa_role`, `eks_addon_set` (VPC CNI · CoreDNS · kube-proxy)
- **네트워크**: `transit_gateway`, `cross_region_vpc_peering`, `privatelink_endpoint`
- **DB**: `aurora_cluster`, `aurora_global_database`, `cross_region_read_replica`
- **영속성**: `backup_cross_region_snapshot`, `backup_glacier_archive`
- **카탈로그 자체**: 모듈 버전 마이그레이션 가이드, 외부 모듈 의존 정책 강화
