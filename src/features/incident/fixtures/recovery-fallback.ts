import type { RecoveryAction } from '../types/incident.schema';

// Subscription POST /subscriptions DB pool 고갈 복구 조치 (Critical 시나리오)
export const DEMO_SUBSCRIPTION_RECOVERY_ACTIONS: RecoveryAction[] = [
  {
    id: 'rec-sub-001',
    actionType: 'immediate',
    title: 'HikariPool Reset (api-2 / api-3)',
    description: '현재 포화 상태인 HikariPool을 워커별로 초기화하고 wait queue(27)를 비워 신규 가입 요청을 즉시 받아냅니다.',
    rationale: 'RCA 가설(db_connection_pool_exhaustion) 확정. wait queue 누적이 5xx burst의 직접 원인.',
    expectedEffect: 'POST /subscriptions 5xx 즉시 감소, p95 30초 내 정상화',
    riskLevel: 'Low',
    expectedSlaImprovementPct: 75,
    status: 'pending',
  },
  {
    id: 'rec-sub-002',
    actionType: 'immediate',
    title: 'ECS Service Scale-out (3 → 5)',
    description: 'Subscription API ECS task를 3대 → 5대로 일시 확장해 connection demand를 분산합니다.',
    rationale: '현재 task당 pool 점유가 한계 근접 — 수평 확장으로 단기 압력 해소.',
    expectedEffect: '신규 가입 throughput 30% 증가 · pool 점유율 80% 이하 유지',
    riskLevel: 'Low',
    expectedSlaImprovementPct: 70,
    status: 'pending',
  },
  {
    id: 'rec-sub-003',
    actionType: 'iac_change',
    title: 'HikariPool maximumPoolSize 50 → 100',
    description: 'application.yml의 HikariPool maximumPoolSize와 RDS max_connections를 동시에 상향합니다.',
    rationale: '과거 3건 동일 패턴 재발 방지. 프로모션/이벤트 시 connection 수요 2× 이상 증가 확인.',
    expectedEffect: '피크 시 pool 포화 방지 · POST /subscriptions 안정성 향상',
    riskLevel: 'Medium',
    expectedSlaImprovementPct: 95,
    status: 'pending',
  },
  {
    id: 'rec-sub-004',
    actionType: 'iac_change',
    title: 'RDS instance class up (r6g.large → r6g.xlarge)',
    description: 'connection 100개 수용을 위해 RDS 인스턴스를 한 단계 상향합니다.',
    rationale: 'max_connections 상향만으로는 메모리 부족 위험. 인스턴스 클래스 동반 상향 필요.',
    expectedEffect: 'connection 100개 안정 수용 · CPU/메모리 여유 확보',
    riskLevel: 'High',
    expectedSlaImprovementPct: 90,
    status: 'pending',
  },
];

// Billing Low 시나리오 — 별도 복구 조치 없음 (자율 모니터링)
export const DEMO_BILLING_RECOVERY_NONE: RecoveryAction[] = [
  {
    id: 'rec-bill-001',
    actionType: 'immediate',
    title: '관찰 유지 — Low 우선순위 (조치 불필요)',
    description: 'CPU spike는 배치 정렬 단계 정상 패턴. SLA 영향 없음 · 06:00 마감까지 3h 13m 여유. 자율 모니터링만 유지.',
    rationale: '유사 사태 4건 모두 자동 회복 — 조치 시 오히려 배치 재실행 리스크.',
    expectedEffect: '02:48 KST 정상 완료 예상',
    riskLevel: 'Low',
    expectedSlaImprovementPct: 0,
    status: 'pending',
  },
];

// Backward-compat — Subscription 시나리오를 기본으로 노출
export const DEMO_RECOVERY_ACTIONS = DEMO_SUBSCRIPTION_RECOVERY_ACTIONS;

// incidentId 로 시나리오별 fallback 복구 조치 선택
export function selectDemoRecoveryActions(incidentId: string): RecoveryAction[] {
  if (incidentId.startsWith('inc-demo-billing')) return DEMO_BILLING_RECOVERY_NONE;
  return DEMO_SUBSCRIPTION_RECOVERY_ACTIONS;
}

// Subscription Critical 시나리오용 복구 리포트
export const DEMO_SUBSCRIPTION_RECOVERY_REPORT = `## 권장 해결 방안 — POST /subscriptions DB pool 고갈

### 즉시 조치 (지금 당장)
1. **HikariPool Reset (api-2 / api-3)** — pool 강제 초기화 + wait queue 비우기
   - 예상 효과: 5xx 즉시 감소 · p95 30초 내 정상화
   - 위험도: Low

2. **ECS Service Scale-out (3 → 5)** — task 확장으로 connection demand 분산
   - 예상 효과: 신규 가입 throughput 30% 증가
   - 위험도: Low

### 구조적 개선 (오늘 내)
3. **HikariPool maximumPoolSize 50 → 100**
   - RDS max_connections 동시 상향 필요
   - IaC PR → ArgoCD 배포 → 30분 내 적용
   - 과거 3건 동일 패턴 재발 방지

4. **RDS instance class up (r6g.large → r6g.xlarge)**
   - max_connections 100 수용을 위한 메모리 확보
   - 다운타임 없음 (read replica 활용)

### 재발 방지
- POST /subscriptions Error Budget burn 알람 임계값 70% → 50%로 하향
- 프로모션 사전 캘린더 등록 시 자동 pool 사전 확장
- 과거 3건 패턴 → Triage Vector DB 가중치 부여`;

// Billing Low 시나리오용 리포트
export const DEMO_BILLING_RECOVERY_REPORT = `## SLA 영향 없음 — 조치 불필요

### 현재 판단
- **위험도**: Low
- **사유**: CPU spike는 배치 정렬 단계 정상 패턴 (유사 4건 모두 자동 회복)
- **SLA**: Correctness 99.99% · Budget 잔량 98.5% · normal burn 0.1×
- **마감 여유**: 06:00 KST까지 3h 13m

### 후속 액션
- 자율 모니터링 유지 — 다음 폴링 사이클까지 추가 조치 보류
- 02:48 KST 정상 완료 예상`;

// Backward-compat
export const DEMO_RECOVERY_REPORT = DEMO_SUBSCRIPTION_RECOVERY_REPORT;

// incidentId 로 시나리오별 fallback 리포트 선택
export function selectDemoRecoveryReport(incidentId: string): string {
  if (incidentId.startsWith('inc-demo-billing')) return DEMO_BILLING_RECOVERY_REPORT;
  return DEMO_SUBSCRIPTION_RECOVERY_REPORT;
}
