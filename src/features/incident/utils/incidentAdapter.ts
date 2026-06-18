// TriageAssessment → Incident 변환 (RcaPanel 입력용)
import type { Incident } from '@/features/service-detail/types/incident.schema';
import type { TriageAssessment } from '../types/incident.schema';

// 가설 → 자연어 설명 매핑
const CAUSE_DESCRIPTIONS: Record<string, string> = {
  db_connection_saturation:        'DB 연결 풀 포화 — HikariPool maxPoolSize 도달, 신규 트랜잭션이 connection을 획득하지 못해 timeout 발생',
  db_connection_pool_exhaustion:   'DB 연결 풀 고갈 — POST /subscriptions 처리에 필요한 HikariPool 활성 connection 96% 도달, wait queue 누적으로 5xx burst 발생',
  traffic_spike:                   '일시적 트래픽 스파이크 — 평소 대비 RPS 증가로 응답 시간 분포 우측 꼬리가 길어짐',
  spot_interruption:                'EC2 Spot 인스턴스 중단 — AWS Spot 종료 신호로 ASG 인스턴스 수 일시 감소, 남은 인스턴스에 부하 집중',
  rds_cpu_saturation:               'RDS CPU 포화 — 슬로우 쿼리 누적으로 CPU 사용률 임계 도달',
  batch_cpu_normal_pattern:         '정상 배치 정렬 단계 CPU spike — 야간 정산 정렬 단계 특유의 CPU 상승 패턴으로 SLA 영향 없음',
  batch_sort_phase_cpu_normal:      '정상 배치 정렬 단계 CPU spike — 야간 정산 정렬 단계 특유의 CPU 상승 패턴으로 SLA 영향 없음',
};

// 가설 → 권장 조치 매핑
const CAUSE_ACTIONS: Record<string, string[]> = {
  db_connection_saturation: [
    'HikariPool 강제 reset으로 stuck connection 해소 (즉시)',
    'RDS max_connections 200 → 250 상향 (IaC 변경 필요)',
    '배치 워커 Pod 재시작으로 connection leak 정리',
    'Connection pool monitoring 알람 임계값 80% → 70%로 하향',
  ],
  db_connection_pool_exhaustion: [
    'HikariPool Reset 으로 wait queue 즉시 비우기',
    'ECS Service Scale-out (3 → 5) 으로 connection demand 분산',
    'HikariPool maximumPoolSize 50 → 100 상향 (IaC 변경 필요)',
    'RDS instance class 한 단계 상향 (메모리 확보)',
  ],
  traffic_spike: [
    '자동 스케일링 정책 확인 (현재 정상 회복 중)',
    '캐시 hit ratio 모니터링 — degrade 시 캐시 워밍 트리거',
  ],
  spot_interruption: [
    '핵심 배치 워크로드를 On-Demand로 전환',
    'ASG mixed instances policy 가중치 조정 (On-Demand 50% 이상)',
  ],
  batch_cpu_normal_pattern: [
    '추가 조치 불필요 — 자율 모니터링 유지',
    '02:48 KST 정상 완료 ETA 모니터링',
  ],
  batch_sort_phase_cpu_normal: [
    '추가 조치 불필요 — 자율 모니터링 유지',
    '02:48 KST 정상 완료 ETA 모니터링',
  ],
};

const DEFAULT_DESCRIPTION = '원인 미상 — 운영자 추가 분석 필요';
const DEFAULT_ACTIONS = ['로그/트레이스 추가 수집 후 재분석 필요'];

// triage_priority → severity
const priorityToSeverity = (p: string): 'critical' | 'warning' =>
  ['Critical', 'High'].includes(p) ? 'critical' : 'warning';

// 메트릭 deviation → from/to 문자열
const formatSymptom = (m: { name: string; current: number; baseline: number; unit?: string }) => {
  const unit = m.unit && m.unit !== 'ratio' ? m.unit : '';
  return {
    metric: m.name,
    from: `${m.baseline}${unit}`,
    to:   `${m.current}${unit} (${(m.current / m.baseline).toFixed(1)}×)`,
  };
};

// 위반까지 시간을 사람이 읽기 좋게
const formatViolation = (minutes: number | null | undefined): string => {
  if (minutes == null) return '—';
  if (minutes < 1)    return `약 ${Math.round(minutes * 60)}초`;
  if (minutes < 60)   return `약 ${Math.round(minutes)}분`;
  if (minutes < 1440) return `약 ${Math.round(minutes / 60)}시간`;
  return `약 ${Math.round(minutes / 1440)}일`;
};

// TriageAssessment + serviceName → Incident
export function assessmentToIncident(
  assessment: TriageAssessment,
  serviceName: string,
): Incident {
  const metrics = assessment.current_state?.prometheus_snapshot?.metrics ?? [];
  const symptoms = metrics
    .filter(m => m.deviation_ratio >= 2)
    .map(formatSymptom);

  const sla = assessment.sla_impact.affected_items[0];
  const hint = assessment.vector_db_hints;

  // AI 발생 원인 요약 — 가설 + 영향 + 위반 시간 조합
  const violation = formatViolation(assessment.sla_impact.earliest_violation_minutes);
  const summary = hint?.top_cause_hypothesis
    ? `${CAUSE_DESCRIPTIONS[hint.top_cause_hypothesis] ?? hint.top_cause_hypothesis}. ` +
      `${hint.hypothesis_basis ?? ''} ` +
      `Error Budget 잔량 ${sla?.budget_remaining_pct ?? '?'}%이며 ${sla?.burn_rate_state ?? 'normal'} burn 상태로 ` +
      `현재 추세 유지 시 SLA 위반까지 ${violation} 예상.`
    : `${assessment.sla_impact.user_impact_estimate ?? '서비스 영향 분석 중'}`;

  // 원인 후보 — vector hint similar incidents를 후보로 변환
  const similar = hint?.similar_incidents ?? [];
  const candidates = similar.map((s, i) => ({
    rank: i + 1,
    description: CAUSE_DESCRIPTIONS[s.confirmed_cause] ?? s.confirmed_cause,
    probability: Math.round(s.similarity * 100),
    evidence: [
      `${s.occurred_at.slice(0, 10)} 발생 — ${s.time_context ?? '시간 컨텍스트 미상'}`,
      `과거 해결책: ${s.resolution ?? 'unknown'}`,
      `유사도 ${(s.similarity * 100).toFixed(0)}% (incident_id: ${s.incident_id})`,
    ],
    recommendedActions: CAUSE_ACTIONS[s.confirmed_cause] ?? DEFAULT_ACTIONS,
  }));

  // 후보가 없으면 placeholder 1개
  if (candidates.length === 0) {
    candidates.push({
      rank: 1,
      description: DEFAULT_DESCRIPTION,
      probability: 0,
      evidence: ['Vector DB 유사 사태 없음 — 신규 패턴 가능성'],
      recommendedActions: DEFAULT_ACTIONS,
    });
  }

  // 타임라인
  const created = assessment.created_at ?? new Date().toISOString();
  const triageMs = assessment.triage_latency_ms ?? 3800;
  const triageDone = new Date(new Date(created).getTime() + triageMs).toISOString();

  return {
    incidentId: assessment.incident_id,
    title: hint?.top_cause_hypothesis
      ? `${CAUSE_DESCRIPTIONS[hint.top_cause_hypothesis]?.split(' — ')[0] ?? hint.top_cause_hypothesis} (${serviceName})`
      : `${serviceName} — Triage Assessment`,
    severity: priorityToSeverity(assessment.triage_priority),
    detectedAt: created.replace('T', ' ').slice(0, 19) + ' KST',
    resolvedAt: null,
    symptoms,
    relatedAlarms: (assessment.triggered_alarms ?? []).map(a => (a as { alarm_id?: string }).alarm_id ?? ''),
    candidates,
    timeline: [
      { ts: created.slice(11, 19),   event: `알람 ${assessment.triggered_alarms?.length ?? 0}개 동시 수신 → correlation group 확정`, type: 'detection' },
      { ts: triageDone.slice(11, 19), event: `Triage Agent 완료 (${(triageMs / 1000).toFixed(1)}s) — 우선순위 ${assessment.triage_priority}`, type: 'metric' },
      ...(assessment.handoff?.to_rca
        ? [{ ts: triageDone.slice(11, 19), event: `RCA 자동 진입 (${assessment.handoff.rca_entry_mode ?? 'open_search'} 모드)`, type: 'rca' as const }]
        : []),
    ],
    summary,
  };
}
