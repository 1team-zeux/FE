# ZeuX V04 토폴로지 결정 카탈로그

## 메타

| 항목 | 내용 |
|---|---|
| 버전 | v1.1 (MVP) |
| 적용 범위 | 화면 3 (토폴로지 결정) — FR-iac-006의 결정론 규칙 본체 |
| 단일 진실 공급원 | `sla_bundle_*.yaml` (변형 없이 그대로 입력으로 참조) |
| Phase 2 항목 | Multi-Region / Aurora Global / Cross-Region 백업 / 매칭 알고리즘 |

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

향후 base 추가 시·새 시나리오와 매칭 시 sla_bundle YAML에서 다음 경로로 추출.
카탈로그에 값을 박지 않음 (sla_bundle 단일 진실 공급원).

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

> 컴퓨팅 선택은 단순히 "컨테이너 여부"가 아니라 워크로드 복잡도·상태관리·운영 오케스트레이션 필요성을 종합해야 한다.
> `container_deployable=true`라도 stateful 컨테이너, 멀티 컴포넌트, AI 추론 워크로드는 ECS보다 EKS가 운영상 유리하다.

| 코드 | 옵션 | 적용 워크로드 | 모니터링 부착 |
|---|---|---|---|
| C1 | EC2 Auto Scaling Group | `container_deployable=false` 또는 호스트 직접 제어가 필요한 stateful 워크로드. JVM 튜닝·커널 파라미터 조정이 필요한 레거시 앱에 해당. | ADOT Collector daemon (user_data로 설치) |
| C2 | ECS Fargate | `container_deployable=true`인 stateless web·api 마이크로서비스. 단일 컨테이너 단순 구조. 운영팀이 쿠버네티스를 별도로 운영하지 않을 때 선호. | ADOT Collector sidecar (task definition) |
| C3 | Lambda | 이벤트 트리거 / 15분 이내 짧은 배치 / stateless. 상시 대기 비용이 없어야 하는 낮은 빈도 작업에 적합. 콜드 스타트 허용 범위 확인 필수. | ADOT Lambda Layer |
| C4 | EKS (Managed Node Group) | stateful 컨테이너·AI 추론·멀티 컴포넌트 단일 서비스·Spark Job 등 ECS로 커버 불가한 고복잡도 워크로드. BU 내 EKS 서비스가 하나라도 있으면 나머지 컨테이너 서비스도 동일 클러스터로 통합하는 것이 운영 효율상 권장. | ADOT Collector DaemonSet (Helm chart) |

---

## 3. 그 외 차원 옵션 (MVP)

### 3.1 지역 (R)

> AZ 수는 가용성의 하한선을 결정한다. 단, 실제 서비스 가용성은 컴퓨팅·DB·네트워크의 조합으로 결정되므로 R 코드는 "최소 AZ 구성"으로 해석한다.

| 코드 | 옵션 | 이론 가용성 |
|---|---|---|
| R1 | Single Region 1 AZ | ~99.5% |
| R2 | Single Region 2 AZ | ~99.95% |
| R3 | Single Region 3 AZ | ~99.99% |

**Phase 2**: R4 Multi-Region Pilot Light · R5 Warm Standby · R6 Active-Active

---

### 3.2 네트워크 (N) — 하위 변수 조합

> 네트워크 설계는 "외부에서 내부로 들어오는 경로"와 "내부에서 외부로 나가는 경로"를 분리해서 생각해야 한다.
> 인바운드는 사용자 트래픽과 관리자 접근, 아웃바운드는 외부 API 호출과 AWS 서비스 연결로 나뉜다.

| 하위 변수 | 옵션 |
|---|---|
| Subnet 구조 | Public+App+DB 3-tier / Public+Private 2-tier / Private-only |
| CDN / 정적 리소스 | S3 + CloudFront (web 서비스의 정적 리소스 배포 표준 패턴) / 없음 |
| 외부 LB | ALB (L7, HTTP/HTTPS 라우팅) / ALB+WAF (compliance 강, 결제·PII 처리 시) / NLB (TCP·UDP 직접) |
| Outbound | NAT Gateway (관리형) / NAT Instance (비용 절감) / VPC Endpoint 전용 |
| LLM Provider 연결 | VPC Endpoint (AWS Bedrock 등 AWS 네이티브 LLM) / NAT Gateway (OpenAI 등 외부 LLM) |
| 관리자 접근 | VPN Gateway + Client VPN / SSM Session Manager |
| VPC Endpoint 세트 | S3+CloudWatch 기본 / +ECR (컨테이너) / +STS+KMS (compliance 강) / +RDS Endpoint (data residency 강제) / +Bedrock (LLM Provider) |
| Security Group | 기본 단일 SG / Tier별 분리 (tier 0 또는 compliance 강) |

---

### 3.3 DB 가용성 패턴 (D)

> D 코드는 "DB의 가용성 구성 패턴"을 결정한다. DB 엔진 선택(PostgreSQL/Aurora/벡터 DB)은 §3.6에서 별도 결정한다.
> Multi-AZ와 Read Replica는 독립 개념이다. Multi-AZ는 HA(장애 자동 전환), Read Replica는 읽기 분산이 목적이다.

| 코드 | 옵션 | 이론 가용성 |
|---|---|---|
| D1 | EC2 자체 설치 DB | ~99.0% — 관리형 서비스 미사용. tier 2~3 + 비용 극한 절감 케이스에만 허용. |
| D2 | RDS Single-AZ | ~99.5% — 개발·스테이징 또는 RTO 허용 범위가 넉넉한 Tier 2~3 서비스. |
| D3 | RDS Multi-AZ | ~99.95% — Tier 1 서비스 기본. AZ 장애 시 60~120초 내 자동 Failover. |
| D4 | RDS Multi-AZ + Read Replica | ~99.99% — 읽기 트래픽이 70% 이상이거나 peak RPS가 1,000 이상일 때. Read Replica는 읽기 부하 분산 + Promote 대기용으로 활용. |

**Phase 2**: D5 Cross-Region Read Replica · D6 Aurora Cluster · D7 Aurora Global

---

### 3.4 데이터 영속성 패턴 (P)

> RPO는 "얼마나 오래된 데이터까지 잃어도 되는가"이다. 자동 백업(P1)은 최소 1일 단위이므로 RPO ≤ 1시간이 요구되면 반드시 P3(PITR)을 선택해야 한다.
> RPO ≤ 5분처럼 매우 짧은 요건은 PITR만으로는 경계 케이스이므로 CDC(Change Data Capture) 구성을 병행하는 것이 전문가 관행이다.

| 코드 | 옵션 | 보장 RPO |
|---|---|---|
| P1 | 자동 백업 (보존 7일) | ~24시간 |
| P2 | 자동 백업 + 수동 Snapshot | ~24시간 (수동 보강, 규제 감사 대응) |
| P3 | 자동 백업 + PITR | ~5분 (RDS PITR의 복구 시점 최소 단위는 5분) |

**Phase 2**: P4 Cross-Region Snapshot · P5 +Glacier 장기 보존

---

### 3.5 캐시 레이어 (K) — 신규

> 캐시 레이어는 DB 부하 분산과 응답 지연 단축 두 가지 목적으로 사용된다.
> 읽기 캐시(K1)는 DB 앞단에서 반복 조회를 차단하고, 세션 스토어(K2)는 애플리케이션 서버의 stateless 운영을 가능하게 한다.
> ElastiCache Redis는 Multi-AZ 클러스터 모드로 구성하면 캐시 레이어도 HA를 확보할 수 있다.

| 코드 | 옵션 | 적용 상황 |
|---|---|---|
| K0 | 캐시 없음 | 트래픽이 낮거나 DB 처리 용량이 충분한 경우. 캐시 무효화 복잡도를 피하고 싶을 때. |
| K1 | ElastiCache Redis (읽기 캐시) | peak_rps ≥ 500 AND read_ratio ≥ 60%. DB 읽기 부하 분산. TTL 기반 캐시 무효화. |
| K2 | ElastiCache Redis (세션 스토어) | stateful 세션 관리가 필요한 서비스. 서버 재시작·스케일 인·아웃 시에도 세션 유지. |
| K3 | ElastiCache Redis (읽기 캐시 + 세션 스토어) | K1·K2 조건 모두 해당. 동일 Redis 클러스터를 DB 분리(keyspace)로 활용. |

---

### 3.6 DB 엔진 선택 (E) — 신규

> DB 엔진 선택은 데이터 특성(정합성 요구도, 쿼리 패턴, 확장 방식)에 따라 결정한다.
> 관계형 트랜잭션 위주라면 PostgreSQL, 읽기 극대화가 필요하면 Aurora, AI/벡터 검색이 필요하면 pgvector 또는 OpenSearch를 선택한다.
> 한 BU 안에 여러 DB 엔진이 공존하는 것은 정상이다 — 서비스별로 적합한 엔진을 독립적으로 선택한다.

| 코드 | 옵션 | 적용 상황 |
|---|---|---|
| E1 | RDS PostgreSQL | 결제·정산 등 strong consistency가 필요한 트랜잭션 위주. ACID 보장. ISMS-P·PCI-DSS 컴플라이언스 대응에 검증된 엔진. |
| E2 | RDS MySQL | 단순 CRUD 위주, PostgreSQL 대비 운영 인력 확보가 쉬운 경우. JSON 처리 성능은 PostgreSQL보다 낮음. |
| E3 | Aurora PostgreSQL | D4(Multi-AZ+Read Replica) AND read_ratio ≥ 70% AND peak_rps ≥ 1,000. 스토리지 자동 확장, 최대 15개 Read Replica. RDS PostgreSQL 대비 비용이 높지만 읽기 처리량이 월등히 높음. |
| E4 | pgvector on RDS PostgreSQL | service_type=ai AND 벡터 검색 필요. 관계형 DB와 벡터 검색을 단일 인스턴스에서 처리. 벡터 차원 ≤ 2,000, 인덱스 크기 ≤ 100GB 범위에서 적합. |
| E5 | OpenSearch Service | service_type=ai AND (벡터 차원 > 2,000 OR 지식베이스 > 100GB OR 전문 검색·랭킹 필요). pgvector 대비 확장성·검색 성능이 높지만 별도 클러스터 운영 비용 발생. |

**Phase 2**: E6 Aurora MySQL · E7 DynamoDB (NoSQL) · E8 Aurora Global

---

## 4. 차원별 결정 룰

> 룰 우선순위: **SLA 충족 > compliance 충족 > 비용·운영 부담**.
> SLA·compliance 침해 가능성이 있는 결정은 항상 *강제 강화 룰*로 작동한다. 보조1(비용 절감)에서도 SLA 침해 시 변형 적용 안 함.

---

### 4.1 지역 결정 룰

> AZ 수는 서비스 가용성 목표가 요구하는 최소 인프라 이중화 단위다.
> Tier 1 서비스가 하나라도 있으면 BU 전체가 해당 AZ 수를 기준으로 설계되어야 하며, AZ를 서비스마다 다르게 쓰는 것은 운영 복잡도만 높이므로 지양한다.

- **리전**: `data_residency` 강제 시 → 그 국가 리전 / 그 외 → `primary_region` 그대로
- **AZ 수**:
  - service_tier ≤ 1 AND availability ≥ 99.95% → AZ = 3 (R3 강제)
  - service_tier ≤ 1 AND availability ≥ 99.9% → AZ ≥ 2 (R2 이상)
  - `failover_required=true` → AZ ≥ 2
  - 그 외 (tier 2~3 + availability < 99.9%) → AZ = 1 가능
- **Multi-Region**: MVP 미지원. 필요 시 Phase 2.

---

### 4.2 네트워크 결정 룰

> 네트워크는 "열어야 할 최소한만 열고, 나머지는 닫는다"는 원칙으로 설계한다.
> 외부 노출 범위가 좁을수록 공격 표면이 줄어든다. compliance 강 케이스에서는 WAF, Tier별 SG 분리, VPC Endpoint 세트 확장이 표준이다.

- **CDN / 정적 리소스**:
  - service_type=web AND 정적 리소스(이미지·CSS·JS) 있음 → S3 + CloudFront 추가
  - CloudFront는 글로벌 엣지 캐싱뿐 아니라 DDoS 방어(AWS Shield Standard) 효과도 있어 web 서비스의 표준 앞단 구성임

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

- **LLM Provider 연결**:
  - LLM Provider = AWS Bedrock (또는 SageMaker 등 AWS 네이티브) → VPC Endpoint (`com.amazonaws.{region}.bedrock-runtime`) 사용. 트래픽이 인터넷을 경유하지 않아 보안·지연 개선.
  - LLM Provider = OpenAI / 기타 외부 SaaS → NAT Gateway 경유 아웃바운드. 외부 LLM이 fallback으로 존재하는 경우 Primary가 VPC Endpoint여도 NAT Gateway는 유지해야 함.

- **관리자 접근**:
  - `admin_access_method=vpn_sso` → VPN Gateway + Client VPN
  - OS 직접 접근 불필요 → SSM Session Manager

- **VPC Endpoint 세트**:
  - 기본: S3 + CloudWatch
  - `container_deployable=true` → + ECR (컨테이너 이미지 풀)
  - `compliance_strength=강` → + STS + KMS
  - `data_residency` 강제 AND DB 사용 → + RDS Endpoint
  - LLM Provider = AWS Bedrock → + Bedrock Runtime

- **Security Group**:
  - `service_tier=0` 또는 `compliance_strength=강` → Tier별 SG 분리 (ALB-SG / App-SG / DB-SG / Cache-SG)
  - 그 외 → 기본 단일 SG

---

### 4.3 컴퓨팅 결정 룰

> 컴퓨팅 선택은 두 단계로 판단한다.
> 1단계: 워크로드 특성으로 C3(Lambda) → C4(EKS) → C2(ECS) → C1(EC2) 순으로 필터링.
> 2단계: BU 내에 C4가 결정된 서비스가 있으면 나머지 컨테이너 서비스를 동일 EKS 클러스터로 통합.
>
> ECS vs EKS 판단 기준: ECS는 "단일 컨테이너, stateless, 간단한 스케일링"에 적합하고, EKS는 "멀티 컨테이너 포드, stateful 볼륨, AI/ML 사이드카, KEDA 이벤트 스케일링"이 필요할 때 적합하다.

서비스별로 적용 (BU 안 N개 서비스 각각).

**1단계: 서비스별 컴퓨팅 결정**

- `workload_type=batch` AND 실행 < 15분 AND stateless → C3 Lambda
- `workload_type=batch` AND (긴 실행 OR stateful OR checkpoint 필요) AND `container_deployable=true` → C4 EKS Job
  - Spark Job, 대용량 데이터 처리, checkpoint 재시작이 필요한 배치는 EKS Job(Kubernetes Job/CronJob)이 표준
- `workload_type=batch` AND (긴 실행 OR stateful) AND `container_deployable=false` → C1 EC2 ASG
- `service_type=ai` 또는 `workload_type=ai_inference` → C4 EKS
  - AI 추론 서비스는 LLM Gateway·RAG 엔진·세션 관리 등 멀티 컴포넌트가 공존하며, GPU 노드 필요 시 EKS+Karpenter가 표준
- `container_deployable=true` AND `stateful=true` → C4 EKS
  - ECS Fargate는 StatefulSet과 PersistentVolume을 지원하지 않으므로 stateful 컨테이너 워크로드는 EKS로 강제
- `container_deployable=true` AND 단일 서비스 내 컴포넌트 수 ≥ 3 → C4 EKS
  - 멀티 컴포넌트 서비스는 pod 간 통신과 사이드카 관리에서 ECS보다 EKS의 운영 효율이 높음
- `container_deployable=true` (위 조건 해당 없음) → C2 ECS Fargate
- `container_deployable=false` → C1 EC2 ASG

**2단계: BU 클러스터 통합**

- BU 내 C4(EKS)가 결정된 서비스가 1개 이상 존재 AND 다른 서비스가 C2(ECS Fargate)로 결정됨
  → 해당 C2 서비스를 C4 EKS로 통합 검토 (운영팀 단일 클러스터 운영이 ECS+EKS 혼용보다 효율적)
  → 단, 비용우선안(보조1)에서는 통합 없이 ECS Fargate 유지 가능

**HPA/ASG 설정** (모든 컴퓨팅 공통):
- `traffic_pattern` ∈ {event_spike · business_hours_peak} → HPA/ASG 적극 활용. C4 EKS의 경우 KEDA(Kubernetes Event-Driven Autoscaling) 병행 권장
- `traffic_pattern=uniform` → 고정 capacity + 20% 여유
- Min = `ceil(avg_rps / 노드 처리량) × 1.2`
- Max = `ceil(peak_rps / 노드 처리량) × 1.5`

**Spot 활용**:
- `spot_instance_allowed=true` AND `service_tier ≥ 2` → 50%까지 혼용
- `service_tier=0` → 비추천 (Spot 중단 시 SLA 위반 위험)
- C4 EKS + Spot → Karpenter 또는 관리형 노드 그룹의 Spot 인스턴스 혼용으로 구현

---

### 4.4 DB 결정 룰

> DB 결정은 두 단계다. 가용성 패턴(D)으로 구성을 결정하고, 엔진(E)으로 어떤 DB를 쓸지 결정한다.
> 두 결정은 독립적이다: D4(Multi-AZ+Read Replica) + E3(Aurora PostgreSQL) 조합도 가능하다.

**가용성 패턴 (D) 결정**:
- `db_required=false` → DB 차원 제외
- `managed_db=ec2_direct` → D1 (tier 2~3만 가능)
- SLA availability ≥ 99.95% OR `multi_az_required=true` → D3 강제
- SLA RTO ≤ 30분 → D3 강제 (Multi-AZ 없으면 AZ 장애 시 수동 복구로 RTO 초과)
- `read_write_ratio.read ≥ 70%` AND peak_rps ≥ 100 → D4 권장
- peak_rps ≥ 1,000 → D4 강제 (Read Replica 없이는 DB가 병목)

**엔진 (E) 결정**:
- `service_type=ai` AND 지식베이스·벡터 검색 필요 AND 벡터 차원 ≤ 2,000 AND 데이터 ≤ 100GB → E4 pgvector on RDS
- `service_type=ai` AND (벡터 차원 > 2,000 OR 지식베이스 > 100GB OR 전문 검색 필요) → E5 OpenSearch Service
- D4 결정 AND `read_write_ratio.read ≥ 70%` AND peak_rps ≥ 1,000 → E3 Aurora PostgreSQL 권장 (Read Replica 처리량 극대화)
- strong consistency 필요 (결제·정산) → E1 RDS PostgreSQL (기본) 또는 E3 Aurora PostgreSQL
- 그 외 관계형 → E1 RDS PostgreSQL

**캐시 레이어 (K) 결정 (§4.5에서 상세 결정)**:
- DB 결정 이후 peak_rps·read_ratio 기준으로 캐시 레이어 추가 여부 결정

---

### 4.5 캐시 레이어 결정 룰 — 신규

> 캐시는 DB의 보조 수단이지 대체 수단이 아니다. 캐시를 추가하면 캐시 무효화(Cache Invalidation) 정책도 함께 설계해야 한다.
> TTL 기반 무효화가 단순하고 안전하다. 쓰기 이벤트 기반 무효화는 성능이 좋지만 구현 복잡도가 높아진다.
> 세션 스토어는 서버를 stateless로 만드는 핵심 패턴이다. Auto Scaling 환경에서 특정 서버에 세션이 고정되는 Sticky Session은 장애 시 세션 유실 위험이 있으므로 Redis 세션 스토어가 표준이다.

- peak_rps ≥ 500 AND `read_write_ratio.read ≥ 60%` → K1 (읽기 캐시)
  - 캐시 히트율 목표: 70% 이상. 히트율이 낮으면 캐시가 오히려 부하 가중
- `stateful=true` AND `container_deployable=true` (서버가 stateless가 되어야 Auto Scaling 가능) → K2 (세션 스토어)
- K1·K2 조건 모두 해당 → K3 (읽기 캐시 + 세션 스토어)
- 그 외 → K0 (캐시 없음)

**Multi-AZ 구성**:
- `multi_az_required=true` OR service_tier ≤ 1 → ElastiCache Redis를 Multi-AZ 클러스터 모드로 구성 (Primary + Replica AZ 분리)
- 그 외 → Single-AZ 또는 클러스터 없이 단순 구성

---

### 4.6 데이터 영속성 결정 룰

> RPO는 백업 주기가 결정한다. PITR(P3)은 최소 복구 시점이 5분이므로 RPO ≤ 5분 요건은 P3 + CDC를 병행해야 진정한 보장이 된다.
> Billing Batch처럼 S3 checkpoint가 있는 배치 워크로드는 S3 Versioning + Lifecycle Policy가 별도 영속성 계층으로 작동한다.

- `backup_required=false` AND SLA RPO 없음 → 영속성 차원 제외
- SLA RPO ≤ 5분 → P3 강제 (PITR) + CDC(Change Data Capture) 구성 검토
  - RDS의 PITR은 5분 단위가 최소 복구 시점이므로, RPO ≤ 5분 요건에서는 DMS/Debezium 등 CDC를 병행하는 것이 전문가 관행
- SLA RPO ≤ 1시간 → P3 권장
- SLA RPO ≤ 24시간 → P1 또는 P2
- 규제 (ISMS-P · PCI-DSS) 강 → Phase 2 (P4 · P5). MVP는 P3 + audit log 보존으로 대체
- `workload_type=batch` AND S3 checkpoint 사용 → S3 Versioning 활성화 + Lifecycle Policy 설정 (checkpoint 보존 기간 관리)

---

## 5. 컨셉별 입력 변형 룰

> 세 컨셉(main · 보조1 · 보조2)에 대해 *SLA Bundle을 변형해서* 결정 룰을 재실행한다.
> LLM 변형이 아니라 *결정론 규칙이 다른 입력을 받아 다른 결과를 내는* 형태다.

### 5.1 main (균형)

입력 변형 없음. SLA Bundle 그대로 결정 룰 적용. ZeuX 기본 추천.

### 5.2 보조1 (비용 절감)

**입력 변형**:
- `cost.cost_priority` → `cost_first` 덮어쓰기
- `cost.spot_instance_allowed` → `true` 덮어쓰기 (원래 false였던 경우만)

**결정 차이 예시**:
- 네트워크: NAT Gateway → NAT Instance
- 컴퓨팅: C4 EKS로 통합된 서비스 중 단순 web/api는 C2 ECS Fargate로 분리 허용 (BU 클러스터 통합 2단계 적용 안 함)
- 컴퓨팅: 인스턴스 사이즈 한 단계 축소 (LLM 세부 사양 조정 영역)
- Spot: 50% 혼용 (tier ≥ 2)
- DB: D3 → D2 검토 (SLA availability·RTO 충족 한도 내. 침해 시 적용 안 함)
- 영속성: P3 → P1 검토 (SLA RPO 충족 한도 내)
- 캐시: K3 → K1 또는 K0 검토 (세션 스토어는 stateless 운영에 필수이므로 K2는 유지)

**제약**: 어떤 변형도 SLA·compliance 충족 *보장 유지*. 침해 시 해당 변형만 미적용.

### 5.3 보조2 (안정성 강화)

**입력 변형**: SLA 한 단계 강화
- `availability` +0.05~0.1%p (한 등급 위)
- `multi_az_required` → `true`
- `failover_required` → `true` (이미 true면 변형 없음)

**결정 차이 예시**:
- 지역: AZ 수 +1 (R2 → R3)
- DB: D3 → D4 (Read Replica 추가), E1 → E3 Aurora 검토 (자동 장애 전환 속도 개선)
- 영속성: P1 → P3 (PITR)
- 캐시: K1 → K3 (세션 스토어 추가, Multi-AZ 클러스터 강제)
- 컴퓨팅: ASG/HPA max replicas +50% (피크 여유 확대)

**제약**: 월 예산 초과 시 LLM 조정(인스턴스 사이즈·관리형 정책)으로 절약 가능한 부분만 절약 후 산출.
그래도 초과 시 *예산 초과 표시*하되 안 자체는 산출.

---

## 6. 모니터링 컴포넌트 부착 룰

> ZeuX는 고객사 인프라 → 본사 모니터링 백엔드 송출 시스템이다.
> 인프라 띄울 때 송출 컴포넌트가 함께 박혀야 한다 (FR-iac-008 명세).
> 모든 컴퓨팅 패턴에서 수집하는 signal은 동일하다 (metrics + logs + traces). 부착 방식만 다르다.

### 6.1 컴퓨팅 노드 부착

| 컴퓨팅 옵션 | 부착 컴포넌트 | 부착 방식 | 수집 signal |
|---|---|---|---|
| C1 EC2 ASG | ADOT Collector | user_data로 daemon 설치, systemd 자동 시작 | metric (hostmetrics) + log (filelog) + trace (OTLP) |
| C2 ECS Fargate | ADOT Collector | task definition에 sidecar container 추가 | 동일 3 signal |
| C3 Lambda | ADOT Lambda Layer | function configuration에 layer attach | metric (function metrics) + trace (X-Ray 호환) |
| C4 EKS | ADOT Collector DaemonSet | Helm chart (`aws-otel-helm-charts`)로 클러스터 전체 배포. 노드당 1개 Pod로 실행. | metric (kubelet·cAdvisor·node-exporter) + log (Fluent Bit) + trace (OTLP) |

### 6.2 AWS Native 리소스

> AWS 관리형 서비스는 CloudWatch에 메트릭을 자동 송출한다. 별도 에이전트 불필요.
> CloudFront, ElastiCache, OpenSearch도 동일하게 CloudWatch Metrics를 자동 제공한다.

| 리소스 | 송출 방식 |
|---|---|
| ALB · NLB | CloudWatch Metrics (default, LB가 자동 송출) |
| RDS / Aurora | CloudWatch Metrics (default) + Enhanced Monitoring 활성화 |
| ElastiCache Redis | CloudWatch Metrics (default) — 캐시 히트율·메모리 사용량·커넥션 수 포함 |
| OpenSearch Service | CloudWatch Metrics (default) — 클러스터 상태·검색 지연 포함 |
| CloudFront | CloudWatch Metrics (default) — 요청 수·오리진 지연·캐시 히트율 포함 |
| NAT Gateway | CloudWatch Metrics (default) |
| VPC Endpoint | CloudWatch Metrics (default) |

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

각 토폴로지 안(main · 보조1 · 보조2) 1개 JSON.

**최상위 필드**:
- `metadata` — id, sla_bundle_version, concept, generated_at
- `dimensions` — region · network · compute · database · cache · persistence 각각의 결정 객체
- `services_compute_mapping` — 서비스별 컴퓨팅 패턴 매핑
- `monitoring_attachment` — 부착 컴포넌트 목록 + 송출 경로
- `expected_sla_achievement` — 서비스별 SLA 항목 충족 수치
- `expected_monthly_cost` — 카테고리별 min~max
- `diagram` — 구조화 노드·엣지 JSON

### 7.2 SLA 충족 수치 산출 공식

**가용성**:
```
expected_availability = R_avail × N_avail × C_avail × D_avail
```
- R_avail: §3.1 지역 옵션 이론 가용성
- N_avail: 99.99% (보통 무시 가능)
- C_avail: Multi-AZ ASG/EKS 99.99% / Single AZ 99.5%
- D_avail: §3.3 DB 옵션 이론 가용성

### 7.3 비용 산출 카테고리

| 카테고리 | 구성 요소 |
|---|---|
| 컴퓨팅 | ECS Fargate vCPU·메모리 시간 / EC2 ASG 인스턴스 시간 / Lambda 호출 / EKS 노드 시간 + 클러스터 관리 비용 |
| DB | RDS/Aurora 인스턴스 시간 + 스토리지 GB + IOPS / OpenSearch 인스턴스 시간 |
| 캐시 | ElastiCache Redis 노드 시간 |
| 네트워크 | ALB 시간 + LCU / CloudFront 요청 + 전송 / NAT Gateway·Instance 시간 + 데이터 처리 |
| 영속성 | RDS 백업 스토리지 + S3 스토리지 |
| 데이터 전송 | 인터넷 outbound + AZ 간 통신 |
| 모니터링 | CloudWatch Metric Streams 데이터량 + ADOT outbound 데이터량 |

---

## Phase 2 항목 일괄 (참조용)

- **컴퓨팅**: EKS Fargate Profile (C5) — Serverless EKS 노드
- **지역**: Multi-Region (R4 · R5 · R6)
- **DB**: Aurora MySQL (E6) · DynamoDB (E7) · Aurora Global (E8) · Cross-Region Read Replica (D5) · Aurora Global (D7)
- **영속성**: Cross-Region Snapshot (P4) · Glacier 장기 보존 (P5)
- **카탈로그 자체**: 매칭 알고리즘 (base 여러 개 등재 시) · base-002 이후 시나리오 등재
