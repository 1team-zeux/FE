**서비스 수준 협약서 (Service Level Agreement)**
**SK Telecom — T-Care Connect Platform**

*본 문서는 ZeuX 프로젝트 시연용 가상의 SLA 계약서이며 실제 SK Telecom 계약 조건이 아닙니다.*

---

### 계약 개요

| 항목 | 내용 |
|---|---|
| 고객사 | SK Telecom (Digital Service BU) |
| 운영 제공자 | ZeuX 운영팀 (SK AX) |
| 대상 애플리케이션 | T-Care Connect Platform |
| 대상 서비스 | (3개) Customer Portal Web · Subscription API · Billing Settlement Batch |
| 계약 기간 | 2026-07-01 ~ 2027-06-30 |
| 측정 기준 시간대 | KST (Asia/Seoul) |
| 운영 환경 | Production |
| 리포트 주기 | 월간 정기 리포트, 중대 장애 발생 시 24시간 이내 인시던트 리포트 |
| 고객사 SLA Owner | 김상훈 (sanghoon.kim@sktelecom.com) |
| 운영자 담당 | 박지원 (jiwon.park@skax.com) |
| 문서 버전 | v1.0 (2026-06-15 합의) |

---

### 제1조 목적 및 적용 범위

본 협약은 SK Telecom의 T-Care Connect Platform에 대해 ZeuX가 클라우드 인프라 구축, 배포, 운영 모니터링, 장애 대응 보조 및 SLA 리포팅을 수행함에 있어 적용되는 서비스 수준 기준을 정의한다.

본 협약의 대상은 T-Care Connect Platform 하위 3개 서비스이며, 각 서비스의 SLA 항목은 서비스 성격에 따라 차등 적용된다.

| 서비스 | 서비스 유형 | 사용자 대상 | 중요도 (Tier) | Workload 유형 |
|---|---|---|---|---|
| Customer Portal Web | 웹 (web) | 외부 고객 | Tier 1 | web |
| Subscription API | API (api) | 내부 시스템 + 제휴 채널 | Tier 1 | api |
| Billing Settlement Batch | 배치 (batch) | 내부 정산 시스템 | Tier 2 | batch |

---

### 제2조 용어 정의

| 용어 | 정의 |
|---|---|
| 가용성 (Availability) | 월간 전체 요청 중 정상 응답(2xx/3xx)으로 처리된 요청의 비율. 본 문서의 제외 조건 시간은 산정에서 제외한다. |
| 지연시간 (Latency) | 서비스 요청에 대한 응답 시간. 본 협약에서는 p95 기준으로 측정한다. |
| RTO (Recovery Time Objective) | 장애 탐지 시점부터 서비스 복구 완료 시점까지의 목표 시간. |
| RPO (Recovery Point Objective) | 장애 시점 기준으로 허용 가능한 최대 데이터 손실 시간 간격. |
| Correctness | 배치 또는 정산 결과 데이터가 사전 정의된 검증 규칙을 만족하는 비율. 본 계약 Phase 2에서 SLA로 본격 적용 예정이며, Phase 1은 측정·참고만 수행. |
| Error Budget | SLA 목표에서 허용되는 실패량. ZeuX는 소진율을 모니터링하여 사전 경보를 제공한다. |

---

### 제3조 서비스별 SLA 기준

**Customer Portal Web (Tier 1 — 외부 고객 웹)**

| SLA 항목 | 목표값 | 측정 기간 | 측정 위치 | 계산식 | 주요 제외 조건 |
|---|---|---|---|---|---|
| Availability | 99.90% | 월간 (캘린더 월) | ALB access log + 외부 synthetic probe | 정상 응답(2xx/3xx) 요청 수 / 전체 요청 수 | 사전 공지 정기점검 (월 4시간 이내) |
| Latency | p95 ≤ 800ms | 5분 rolling | Ingress metric + ALB target response time | 5분 윈도우 내 응답시간 p95 산출 | 사전 합의된 이벤트 트래픽 초과 상황 |
| RTO | 30분 | 인시던트별 | ZeuX Incident Timeline | 장애 탐지 시각 ~ 복구 완료 시각 | 불가항력 (자연재해·국가 통신망 장애) |

**Subscription API (Tier 1 — 핵심 트랜잭션 API)**

| SLA 항목 | 목표값 | 측정 기간 | 측정 위치 | 계산식 | 주요 제외 조건 |
|---|---|---|---|---|---|
| Availability | 99.95% | 월간 (캘린더 월) | ALB access log + API Ingress metric | 정상 응답(2xx/3xx) 요청 수 / 전체 요청 수 | 사전 공지 정기점검 (월 2시간 이내) |
| Latency | p95 ≤ 500ms | 5분 rolling | OpenTelemetry trace + Ingress metric | 5분 윈도우 내 응답시간 p95 산출 | 외부 연동 시스템 장애 |
| RPO | 5분 | 인시던트별 | RDS backup·replication status | 마지막 백업·복제 시각과 장애 시각의 차이 | 고객 요청 수동 변경 |

**Subscription API — Critical Endpoint별 추가 SLA**

결제 등 비즈니스 critical 액션 endpoint는 서비스 단위 SLA(위 표) 위에 *별도 더 strict한 SLA*를 추가 적용한다.

| SLA 항목 | 대상 Endpoint | 목표값 | 측정 기간 | 측정 위치 | 측정 필터 | 계산식 |
|---|---|---|---|---|---|---|
| Availability (결제) | POST /subscriptions | 99.99% | 월간 (캘린더 월) | ALB access log | path=`/subscriptions`, method=`POST` | 필터 매칭 정상 응답(2xx/3xx) 수 / 필터 매칭 전체 요청 수 |

*제외 조건은 Subscription API 서비스 단위 SLA와 동일 (사전 공지 정기점검·외부 연동 시스템 장애).*

**Billing Settlement Batch (Tier 2 — 정산 배치)**

| SLA 항목 | 목표값 | 측정 기간 | 측정 위치 | 계산식 | 주요 제외 조건 |
|---|---|---|---|---|---|
| RTO | 2시간 | 실패 배치별 | Kubernetes Job status + ZeuX Timeline | 실패 시각 ~ 재실행 성공 시각 | 사전 공지 정기점검 (월 6시간 이내) |
| RPO | 15분 | 인시던트별 | S3 checkpoint + RDS replication | 마지막 checkpoint 시각과 장애 시각의 차이 | 원천 데이터 오류 |
| Correctness (참고) | 99.99% | 일간 | 배치 검증 테이블 + 감사 로그 | 검증 통과 레코드 수 / 전체 레코드 수 | 원천 시스템 오류 |

*참고: Correctness는 본 계약 Phase 2에서 SLA로 본격 적용 예정. Phase 1은 측정만 수행하며 위반 시 페널티 없음.*

---

### 제4조 측정 방식

각 SLA 항목은 서비스 유형·측정 위치·계산식·제외 조건에 따라 측정한다. 웹 및 API 서비스의 가용성은 요청 기반으로 산정하며, 배치 서비스는 실행 성공 여부와 결과 검증 기준을 함께 사용한다. ZeuX는 Prometheus, Loki, Tempo, OpenTelemetry Collector, CloudWatch 등 승인된 관측 도구로 수집한 데이터를 기준으로 1차 산정한다.

---

### 제5조 정기점검 및 제외 조건

사전 공지된 정기점검, 고객사 또는 외부 연동 시스템에서 발생한 장애, 천재지변·국가 통신망 장애·정부 조치 등 합리적 통제를 벗어난 불가항력은 SLA 산정에서 제외할 수 있다. 단, 제외 조건 적용 여부는 ZeuX SLA Analysis Agent의 1차 분석 후 운영자와 고객사 SLA Owner가 최종 확인한다.

전체 제외 조건 목록:

- 사전 공지 정기점검 (서비스별 한도 내)
- 고객사 측 원인 장애 (인증 시스템·외부 연동 등)
- 외부 시스템 장애 (제휴사 API·결제 게이트웨이 등)
- 불가항력 (자연재해·국가 통신망 장애·정부 조치)

---

### 제6조 Error Budget 및 사전 경보

Error Budget 산출 기준은 *월간*이며, 사전 경보 임계값은 다음과 같다.

| 서비스 | 산출 기준 | 1차 경고 | 2차 경고 | 긴급 경고 | 조치 원칙 |
|---|---|---|---|---|---|
| Customer Portal Web | 월간 Availability | 50% 소진 | 80% 소진 | 90% 이상 | HITL 승인 후 조치 |
| Subscription API | 월간 Availability | 40% 소진 | 70% 소진 | 85% 이상 | 저위험 자동, 중위험 이상 HITL |
| Billing Settlement Batch | Correctness/RTO 통합 | 50% 소진 | 80% 소진 | 90% 이상 | 재처리 전 HITL 승인 |

---

### 제7조 서비스 크레딧 (위반 시 보상)

SLA 목표 미달 시 서비스 크레딧을 적용한다. 정기점검 및 제외 조건에 해당하는 장애는 산정 대상에서 제외하며, 서비스 크레딧은 월 사용료 또는 월 운영 수수료를 기준으로 산정한다.

**Credit Ladder (서비스 공통)**

| 위반 강도 | 미달 정도 | 크레딧 |
|---|---|---|
| 경미 | 목표값 ~ 95% 달성 | 월 사용료의 5% |
| 보통 | 95% ~ 85% 달성 | 월 사용료의 15% |
| 중대 | 85% ~ 70% 달성 | 월 사용료의 25% |
| 심각 | 70% 미만 | 월 사용료의 50% (한도) |

---

### 제8조 장애 통보 및 리포트

- ZeuX는 SLA 위반 가능성이 높거나 Error Budget 경고 기준을 초과한 경우 고객사 SLA Owner에게 알림을 제공한다.
- 실제 SLA 위반 발생 시 1시간 이내 1차 통보한다.
- 중대 장애에 대해서는 24시간 이내 인시던트 리포트를 제출한다.
- 월간 정기 SLA 리포트는 익월 5영업일 이내 제공한다.

---

### 제9조 자동 조치와 승인 (HITL)

- 저위험 조치 (Pod 재시작, Replica 증설 등 사전 승인된 항목)는 ZeuX가 자동 실행할 수 있다.
- 중위험 이상 조치 (네트워크 변경, DB failover, 데이터 재처리, 보안 정책 변경 등)는 운영자 HITL 승인 후 실행한다.

---

### 제10조 감사 추적

모든 SLA 분석 결과, 예외 조건 적용, 운영자 승인·반려, 자동 조치 및 수동 조치는 ZeuX Audit Log에 저장한다. 감사 로그는 최소 1년간 보존한다.

---

### 부속서 A. 서비스별 SLA 요약

| 서비스 | 적용 SLA 지표 | 비고 |
|---|---|---|
| Customer Portal Web | Availability, Latency, RTO | 외부 고객 웹 — 사용자 체감 가용성·응답성 우선 |
| Subscription API | Availability, Latency, RPO | 핵심 트랜잭션 API — 가용성·지연시간·데이터 복구 우선 |
| Billing Settlement Batch | RTO, RPO, Correctness(참고) | 실시간 응답성보다 정산 완료·복구·정합성 우선 |

---

*문서 끝. 본 협약의 변경은 양측 합의에 의한 재서명으로만 효력을 가진다.*
