# ZeuX V04 토폴로지 결정 카탈로그

## 메타

| 항목 | 내용 |
|---|---|
| 버전 | v1.0 (MVP) |
| 적용 범위 | 화면 3 (토폴로지 결정) — FR-iac-006의 결정론 규칙 본체 |
| 단일 진실 공급원 | `sla_bundle_*.yaml` (변형 없이 그대로 입력으로 참조) |
| Phase 2 항목 | EKS / Multi-Region / Aurora / Cross-Region 백업 / 매칭 알고리즘 |

---

## 1. base 시나리오 정의

### 1.1 base 선언

| 항목 | 내용 |
|---|---|
| `base_id` | base-001 |
| `display_name` | 통신사 멀티 서비스 BU (외부 고객 web + 트랜잭션 API + 정산 batch) |
| `input_source` | `sla_bundle_skt_tcare_example.yaml` |
| `mvp_status` | MVP 단일 base (매칭 알고리즘 Phase 2) |
| 등재 근거 | 복합 서비스 구성 + 컴플라이언스 강 + Tier 혼재 → 카탈로그 룰 광범위 검증 |

### 1.2 식별 특성 추출 규칙

향후 base 추가 시·새 시나리오와 매칭 시 sla_bundle YAML에서 다음 경로로 추출. 카탈로그에 값을 박지 않음 (sla_bundle 단일 진실 공급원).

| 식별 특성 | sla_bundle YAML 경로 |
|---|---|
| `service_composition` | `services[].service_type` 집합 |
| `tier_distribution` | `services[].service_tier` 집계 |
| `compliance_strength` | `compliance_security` (PII·결제·민감정보·규제) 평가 |
| `traffic_scale` | `services[].traffic.peak_rps` 합산 → 소(<500) / 중(500~5k) / 대(>5k) |
| `budget_range` | `cost.monthly_budget` → 소(<10M) / 중(10M~50M) / 대(>50M) |
| `data_residency` | `compliance_security.data_residency` |

---

## 2. 컴퓨팅 패턴 옵션 (MVP)

| 코드 | 옵션 | 적용 워크로드 | 모니터링 부착 |
|---|---|---|---|
| C1 | EC2 Auto Scaling Group | container_deployable=false / 호스트 직접 제어 필요한 stateful 워크로드 | ADOT Collector daemon (user_data로 설치) |
| C2 | ECS Fargate | container_deployable=true / web·api 마이크로서비스 | ADOT Collector sidecar (task definition) |
| C3 | Lambda | 이벤트 트리거 / 짧은 배치(<15분) / stateless 짧은 실행 | ADOT Lambda Layer |

**Phase 2**: EKS (Managed Node Group · Fargate Profile · IRSA)

---

## 3. 그 외 차원 옵션 (MVP)

### 3.1 지역 (R)

| 코드 | 옵션 | 이론 가용성 |
|---|---|---|
| R1 | Single Region 1 AZ | ~99.5% |
| R2 | Single Region 2 AZ | ~99.95% |
| R3 | Single Region 3 AZ | ~99.99% |

**Phase 2**: R4 Multi-Region Pilot Light · R5 Warm Standby · R6 Active-Active

### 3.2 네트워크 (N) — 하위 변수 조합

| 하위 변수 | 옵션 |
|---|---|
| Subnet 구조 | Public+App+DB 3-tier / Public+Private 2-tier / Private-only |
| 외부 LB | ALB (L7) / ALB+WAF (compliance 강) / NLB (TCP·UDP) |
| Outbound | NAT Gateway (관리형) / NAT Instance (비용 절감) / VPC Endpoint 전용 (AWS 서비스만 호출 시) |
| 관리자 접근 | VPN Gateway + Client VPN / SSM Session Manager |
| VPC Endpoint 세트 | S3+CloudWatch 기본 / +ECR (컨테이너) / +STS+KMS (compliance 강) / +RDS Endpoint (data residency 강제) |
| Security Group | 기본 단일 SG / Tier별 분리 (tier 0 또는 compliance 강) |

### 3.3 DB 가용성 패턴 (D)

| 코드 | 옵션 | 이론 가용성 |
|---|---|---|
| D1 | EC2 자체 설치 DB | ~99.0% |
| D2 | RDS Single-AZ | ~99.5% |
| D3 | RDS Multi-AZ | ~99.95% |
| D4 | RDS Multi-AZ + Read Replica | ~99.99% |

**Phase 2**: D5 Cross-Region Read Replica · D6 Aurora Cluster · D7 Aurora Global

### 3.4 데이터 영속성 패턴 (P)

| 코드 | 옵션 | 보장 RPO |
|---|---|---|
| P1 | 자동 백업 (보존 7일) | ~24시간 |
| P2 | 자동 백업 + 수동 Snapshot | ~24시간 (수동 보강) |
| P3 | 자동 백업 + PITR | ~5분 |

**Phase 2**: P4 Cross-Region Snapshot · P5 +Glacier 장기 보존

---

## 4. 차원별 결정 룰

본 룰의 우선순위: **SLA 충족 > compliance 충족 > 비용·운영 부담**. SLA·compliance 침해 가능성이 있는 결정은 항상 *강제 강화 룰*로 작동. 보조1(비용 절감)에서도 SLA 침해 시 변형 적용 안 함.

### 4.1 지역 결정 룰

- **리전**: `data_residency` 강제 시 → 그 국가 / 그 외 → `primary_region` 그대로
- **AZ 수**:
  - service_tier ≤ 1 AND availability ≥ 99.95% → AZ = 3 (R3 강제)
  - service_tier ≤ 1 AND availability ≥ 99.9% → AZ ≥ 2 (R2 이상)
  - `failover_required=true` → AZ ≥ 2
  - 그 외 (tier 2~3 + availability < 99.9%) → AZ = 1 가능
- **Multi-Region**: MVP 미지원. 필요 시 Phase 2.

### 4.2 네트워크 결정 룰

- **Subnet 구조**:
  - `db_external_access=false` AND `compliance_strength=강` → Public+App+DB 3-tier
  - 외부 노출 있음 AND DB 없음 → Public+Private 2-tier
  - 외부 노출 없음 → Private-only
- **외부 LB**:
  - 서비스 유형 ∈ {web·api·admin} AND L7 routing 필요 → ALB
  - `compliance_strength=강` (결제·민감정보) → ALB+WAF 강제
  - TCP·UDP 직접 → NLB
- **Outbound**:
  - 관리형 우선 (default) → NAT Gateway (AZ당 1개)
  - `cost_priority=cost_first` → NAT Instance (ASG로 HA)
  - 외부 호출 대상이 AWS 서비스만 → VPC Endpoint 전용 (NAT 미사용)
- **관리자 접근**:
  - `admin_access_method=vpn_sso` → VPN Gateway + Client VPN
  - OS 직접 접근 불필요 → SSM Session Manager
- **VPC Endpoint 세트**:
  - 기본: S3 + CloudWatch
  - `container_deployable=true` → + ECR
  - `compliance_strength=강` → + STS + KMS
  - `data_residency` 강제 AND DB 사용 → + RDS Endpoint
- **Security Group**:
  - `service_tier=0` 또는 `compliance_strength=강` → Tier별 SG 분리 (ALB-SG / App-SG / DB-SG)
  - 그 외 → 기본 단일 SG

### 4.3 컴퓨팅 결정 룰

서비스별로 적용 (BU 안 N개 서비스 각각).

- `workload_type=batch` AND 실행 < 15분 AND stateless → C3 Lambda
- `workload_type=batch` AND (긴 실행 OR stateful) → C1 EC2 ASG
- `container_deployable=true` (web·api 등) → C2 ECS Fargate
- `container_deployable=false` → C1 EC2 ASG
- **HPA/ASG 설정**:
  - `traffic_pattern` ∈ {event_spike · business_hours_peak} → 적극 활용
  - `traffic_pattern=uniform` → 고정 capacity + 20% 여유
  - Min = `ceil(avg_rps / 노드 처리량) × 1.2`
  - Max = `ceil(peak_rps / 노드 처리량) × 1.5`
- **Spot**:
  - `spot_instance_allowed=true` AND `service_tier ≥ 2` → 50%까지 혼용
  - `service_tier=0` → 비추천

### 4.4 DB 결정 룰

- `db_required=false` → DB 차원 제외
- `managed_db=ec2_direct` → D1 (tier 2~3만 가능)
- SLA availability ≥ 99.95% OR `multi_az_required=true` → D3 강제
- SLA RTO ≤ 30분 → D3 강제 (Multi-AZ 없으면 RTO 위반)
- `read_write_ratio.read ≥ 70%` AND peak_rps ≥ 100 → D4 권장
- peak_rps ≥ 1000 → D4 강제

### 4.5 영속성 결정 룰

- `backup_required=false` AND SLA RPO 없음 → 영속성 차원 제외
- SLA RPO ≤ 5분 → P3 강제 (PITR)
- SLA RPO ≤ 1시간 → P3 권장
- SLA RPO ≤ 24시간 → P1 또는 P2
- 규제 (ISMS-P · PCI-DSS) 강 → Phase 2 (P4 · P5). MVP는 P3 + audit log 보존으로 대체

---

## 5. 컨셉별 입력 변형 룰

세 컨셉(main · 보조1 · 보조2)에 대해 *SLA Bundle을 변형해서* 결정 룰을 재실행. LLM 변형이 아니라 *결정론 규칙이 다른 입력을 받아 다른 결과를 내는* 형태.

### 5.1 main (균형)

입력 변형 없음. SLA Bundle 그대로 결정 룰 적용. ZeuX 기본 추천.

### 5.2 보조1 (비용 절감)

**입력 변형**:
- `cost.cost_priority` → `cost_first` 덮어쓰기
- `cost.spot_instance_allowed` → `true` 덮어쓰기 (원래 false였던 경우만)

**결정 차이 예시**:
- 네트워크: NAT Gateway → NAT Instance
- 컴퓨팅: 인스턴스 사이즈 한 단계 축소 (LLM 세부 사양 조정 영역)
- Spot: 50% 혼용 (tier ≥ 2)
- DB: D3 → D2 검토 (SLA availability·RTO 충족 한도 내. 침해 시 적용 안 함)
- 영속성: P3 → P1 검토 (SLA RPO 충족 한도 내)

**제약**: 어떤 변형도 SLA·compliance 충족 *보장 유지*. 침해 시 해당 변형만 미적용, 다른 변형은 적용.

### 5.3 보조2 (안정성 강화)

**입력 변형**: SLA 한 단계 강화
- `availability` +0.05~0.1%p (한 등급 위)
- `multi_az_required` → `true`
- `failover_required` → `true` (이미 true면 변형 없음)

**결정 차이 예시**:
- 지역: AZ 수 +1 (R2 → R3)
- DB: D3 → D4 (Read Replica 추가)
- 영속성: P1 → P3 (PITR)
- 컴퓨팅: ASG max replicas +50% (피크 여유 확대)

**제약**: 월 예산 초과 시 LLM 조정(인스턴스 사이즈·관리형 정책)으로 절약 가능한 부분만 절약 후 산출. 그래도 초과 시 *예산 초과 표시*하되 안 자체는 산출.

---

## 6. 모니터링 컴포넌트 부착 룰

ZeuX는 *고객사 인프라 → 본사 모니터링 백엔드* 송출 시스템. 인프라 띄울 때 송출 컴포넌트가 함께 박혀야 함 (FR-iac-008 명세).

### 6.1 컴퓨팅 노드 부착

| 컴퓨팅 옵션 | 부착 컴포넌트 | 부착 방식 | 수집 signal |
|---|---|---|---|
| C1 EC2 ASG | ADOT Collector | user_data로 daemon 설치, systemd 자동 시작 | metric (hostmetrics) + log (filelog) + trace (OTLP) |
| C2 ECS Fargate | ADOT Collector | task definition에 sidecar container | 동일 3 signal |
| C3 Lambda | ADOT Lambda Layer | function configuration에 layer attach | metric (function metrics) + trace (X-Ray 호환) |

### 6.2 AWS Native 리소스

| 리소스 | 송출 방식 |
|---|---|
| ALB · NLB | CloudWatch Metrics (default, LB가 자동 송출) |
| RDS | CloudWatch Metrics (default) + Enhanced Monitoring 활성화 |
| NAT Gateway | CloudWatch Metrics (default) |
| VPC Endpoint | CloudWatch Metrics (default) |

CloudWatch → 본사 송출은 **CloudWatch Metric Streams + Kinesis Firehose** 경로.

### 6.3 송출 채널

- ADOT Collector → OTLP gRPC (port 4317) → ZeuX 본사 모니터링 백엔드
- CloudWatch Metric Streams → Kinesis Firehose → ZeuX 본사 모니터링 백엔드

### 6.4 필수 사이드 제약 (모든 리소스 공통)

- **ZeuX 표준 태그**: `customer_id` · `service_id` · `tier` · `environment` · `managed_by=zeux` — 모든 리소스
- **IAM Role**: `zeux-cloudwatch-reader` — `cloudwatch:GetMetricData` · `ListMetrics` 권한
- **Outbound 허용**: NAT Gateway/Instance 또는 PrivateLink 경유로 본사 송출 (port 4317 OTLP gRPC, 443 HTTPS)

---

## 7. 산출 형식 정의

### 7.1 토폴로지 JSON 스키마 (간소화)

각 토폴로지 안(main · 보조1 · 보조2) 1개 JSON. 팀원 §11 스키마 기반 MVP 단순화 버전.

**최상위 필드**:
- `metadata` — id, sla_bundle_version, concept, generated_at
- `dimensions` — region · network · compute · database · persistence 각각의 결정 객체
- `services_compute_mapping` — 서비스별 컴퓨팅 패턴 매핑 (BU 안 N개 서비스)
- `monitoring_attachment` — 부착 컴포넌트 목록 + 송출 경로
- `expected_sla_achievement` — 서비스별 SLA 항목 충족 수치
- `expected_monthly_cost` — 카테고리별 min~max
- `diagram` — 구조화 노드·엣지 JSON (AWS 아이콘 키 매핑은 프론트엔드 책임)

**각 dimension 결정 객체**:
- `decision_code` (R3 · D4 등)
- `decision_label`
- `details` (차원별 자유 구조)
- `rule_applied` (§4.X 참조)
- `inputs_used` (sla_bundle 경로 목록)
- `rationale_md` (자연어 근거)

### 7.2 SLA 충족 수치 산출 공식

**가용성**:
```
expected_availability = R_avail × N_avail × C_avail × D_avail
```
- R_avail: §3.1 지역 옵션 이론 가용성
- N_avail: 99.99% (보통 무시 가능)
- C_avail: Multi-AZ ASG 99.99% / Single AZ 99.5%
- D_avail: §3.3 DB 옵션 이론 가용성

**여유율** (등급 라벨 없이 raw 수치):
```
여유율_avail = (expected_availability − target) / (1 − target)
여유율_RPO  = (target − expected_RPO) / target
여유율_RTO  = (target − expected_RTO) / target
```

**기타**:
- expected_latency_p95: LLM 추정 (인스턴스 타입 + 트래픽 기반)
- expected_RTO: 패턴 기반 — Multi-AZ AutoFailover < 5분, Read Replica Promotion < 15분
- expected_RPO: 영속성 패턴 보장값 그대로

### 7.3 비용 산출 카테고리

| 카테고리 | 구성 요소 |
|---|---|
| 컴퓨팅 | ECS Fargate vCPU·메모리 시간 / EC2 ASG 인스턴스 시간 / Lambda 호출·실행 시간 |
| DB | RDS 인스턴스 시간 + 스토리지 GB + IOPS |
| 네트워크 | ALB 시간 + LCU / NAT Gateway·Instance 시간 + 데이터 처리 / VPC Endpoint 시간 |
| 영속성 | RDS 백업 스토리지 + S3 스토리지 |
| 데이터 전송 | 인터넷 outbound + AZ 간 통신 |
| 모니터링 | CloudWatch Metric Streams 데이터량 + ADOT outbound 데이터량 |

**단가 기준**: AWS Pricing API (실제 구현 시) 또는 Infracost. MVP는 추정값 사용 + 산정 근거 주석.

---

## Phase 2 항목 일괄 (참조용)

- **컴퓨팅**: EKS (C4 Managed Node Group · C5 Fargate Profile)
- **지역**: Multi-Region (R4 · R5 · R6)
- **DB**: Aurora (D6) · Aurora Global (D7) · Cross-Region Read Replica (D5)
- **영속성**: Cross-Region Snapshot (P4) · Glacier 장기 보존 (P5)
- **카탈로그 자체**: 매칭 알고리즘 (base 여러 개 등재 시) · base-002 이후 시나리오 등재
