**T-Care Connect Platform 인프라 추가 정보 문서**
**고객사: SK Telecom — Digital Service BU**

*ZeuX 프로젝트 시연용 가상 인프라 정보 문서. SLA 계약서와 함께 ZeuX에 업로드되는 입력 문서.*

---

### 1. 서비스 프로파일

| 항목 | 내용 |
|---|---|
| 고객사 | SK Telecom |
| 사업부 (BU) | Digital Service BU |
| 애플리케이션명 | T-Care Connect Platform |
| 애플리케이션 구성 | 1개 애플리케이션, 3개 서비스 |
| 운영 환경 | Production |
| 사용 희망 CSP | AWS |
| 운영 목적 | 고객 셀프 서비스 포털 운영, 구독 트랜잭션 처리, 월말 정산 배치 안정 운영 |

**서비스 상세**

| 서비스명 | 서비스 유형 | 사용자 대상 | 중요도 | 설명 |
|---|---|---|---|---|
| Customer Portal Web | web | external_customer (외부 고객) | Tier 1 | T 멤버십 가입자 셀프 서비스 포털 — 요금제 변경·청구 조회·계정 관리 |
| Subscription API | api | internal_system + partner_channel | Tier 1 | 구독 신청·해지·변경 트랜잭션 API. 제휴 채널에서도 호출 |
| Billing Settlement Batch | batch | internal_system | Tier 2 | 월말 정산 배치 — 청구 데이터 집계·정합성 검증·결과 산출 |

---

### 2. 애플리케이션 구조

| 서비스 | 구조 유형 | 주요 컴포넌트 | 상태 저장 | 세션 관리 | 컨테이너 배포 |
|---|---|---|---|---|---|
| Customer Portal Web | web_frontend_backend | frontend (React), backend API, Redis 캐시 | transactional | JWT | 가능 (EKS) |
| Subscription API | api_worker | API gateway, business logic, async worker | transactional | service_token | 가능 (EKS) |
| Billing Settlement Batch | batch_job | Spark job, checkpoint manager, validation engine | checkpoint | 없음 | 가능 (EKS Job) |

**서비스 간 호출 관계**

- Customer Portal Web → Subscription API (구독 변경 요청 시, 동기)
- Customer Portal Web → Billing Settlement Batch 결과 조회 (청구 내역, 동기)
- Subscription API → 외부 결제 게이트웨이 (PG사 API, 동기)
- Subscription API → 외부 인증 시스템 (SKT SSO, 동기)
- Billing Settlement Batch → S3 (checkpoint 저장, 비동기)
- Billing Settlement Batch → RDS (정합성 검증 후 결과 저장, 동기)

**외부 API 호출**

- 결제 게이트웨이: KCP·NICE Payments (구독 결제 트랜잭션)
- SKT SSO: 통합 인증
- 제휴 채널 API: 외부 마케팅 파트너 (구독 의뢰 수신)

**파일/오브젝트 저장 필요**

- Customer Portal Web: 정적 리소스 (이미지·CSS·JS) — S3 + CloudFront
- Billing Settlement Batch: checkpoint·중간 결과 — S3

---

### 3. 트래픽 정보

| 서비스 | 평균 RPS/TPS | 피크 RPS/TPS | 최대 동시 사용자 | 트래픽 패턴 | 피크 쓰기 |
|---|---|---|---|---|---|
| Customer Portal Web | 200 RPS | 1,500 RPS (월말 청구 기간) | 30,000명 | event_spike (월말 청구 조회 폭증) | - |
| Subscription API | 100 TPS | 800 TPS (프로모션 기간) | - | business_hours_peak (업무 시간 집중) | 200 TPS |
| Billing Settlement Batch | - | - | 동시 Job 5개 | night_batch (00:00 ~ 04:00 KST) | - |

**사용자 지역 분포**: 한국 98% / 해외 로밍 사용자 2%

**데이터 증가량**: 월 평균 150GB (청구 이력 + 트랜잭션 로그)

---

### 4. 지역 가용성

| 항목 | 내용 |
|---|---|
| 희망 리전 | ap-northeast-2 (서울) |
| Multi-AZ 필요 여부 | 필요 (Tier 1 서비스 기준) |
| Multi-Region 필요 여부 | MVP 범위에선 불필요. Phase 2 검토 |
| Failover 필요 여부 | Tier 1 서비스에 한해 필요 (SLA RTO 기반 자동 도출) |
| 데이터 저장 지역 제한 | 한국 리전 내 저장 (개인정보보호법) |
| 사용자 주요 접속 지역 | 대한민국 |

---

### 5. 비용 정보

| 항목 | 내용 |
|---|---|
| 월간 인프라 예산 | 3,500만 원 |
| 비용 우선순위 | balanced (안정성과 비용의 균형) |
| 관리형 서비스 사용 범위 | 핵심 DB (RDS), Kubernetes (EKS) 운영에 관리형 허용 |
| Spot Instance 사용 | Billing Settlement Batch worker에 한해 허용 |
| 비용 초과 경고 기준 | 80% 소진 1차 경고, 100% 도달 2차 경고 |
| SLA 위반 손실 한도 | 월 최대 1.5억 원 (Phase 2 본격 적용) |

---

### 6. 컴플라이언스 및 보안

| 항목 | 내용 |
|---|---|
| 개인정보 처리 여부 | 있음 (가입자 정보·요금제 정보) |
| 민감정보 처리 여부 | 있음 (청구 정보 일부) |
| 결제정보 처리 여부 | 있음 (PG사 연동) |
| 적용 규제·정책 | 개인정보보호법, ISMS-P, SKT 내부 보안 정책 |
| 데이터 암호화 | 저장 시 KMS 암호화, 전송 시 TLS 1.3 |
| 로그 보존 기간 | 서비스 로그 90일, 감사 로그 1년 |
| 감사 로그 필요 여부 | 필요 (CloudTrail + ZeuX Audit Log) |
| 관리자 접근 방식 | VPN + SSO (SKT 통합 인증) |
| 외부 인터넷 노출 범위 | user_entry_only (사용자 진입점만 허용 — ALB·CloudFront) |
| 허용 IP/CIDR | SKT 사내망 (10.10.0.0/16), 운영망 (10.20.0.0/16), VPN 대역 (10.100.0.0/24) |
| 권한 원칙 | 최소 권한 (least privilege) |

---

### 7. CSP 네트워크

| 항목 | 내용 |
|---|---|
| 사용 CSP | AWS |
| 신규 VPC 필요 여부 | 신규 VPC 생성 필요 |
| 기존 네트워크 연동 | SKT 사내망 연동 필요 |
| 외부 사용자 접속 | 필요 (Customer Portal Web 사용자 진입) |
| 내부 서비스 외부 직접 노출 | 불허 (Private subnet 배치) |
| VPN/전용선 | VPN 필요 (사내망 연동). 전용선은 Phase 2 검토 |

---

### 8. DB 및 데이터 요구사항

**전체 서비스 공통 DB 요구사항**

| 항목 | 내용 |
|---|---|
| DB 저장 필요 여부 | 필요 |
| 데이터 유형 | 관계형 (Customer·Subscription·Billing 트랜잭션 데이터) + 오브젝트 스토리지 (정적 리소스·checkpoint) |
| 정합성 중요도 | strong (결제·정산 트랜잭션) |
| 초기 데이터 용량 | 800GB |
| 월간 데이터 증가량 | 150GB |
| 읽기/쓰기 비율 | 70:30 (조회 위주, 트랜잭션 시점에 쓰기 집중) |
| 백업 필요 여부 | 필요 (RPO 기준 RDS backup·replication) |
| DB 외부 접근 | 불허 (Private subnet, 애플리케이션 경유만) |

---

*문서 끝. 본 문서의 변경은 인프라 운영팀과 SK Telecom 담당자 합의 후 ZeuX에 재업로드한다.*
