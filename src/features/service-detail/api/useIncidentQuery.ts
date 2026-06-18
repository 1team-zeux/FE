import { useQuery } from '@tanstack/vue-query';
import { IncidentSchema, type Incident } from '../types/incident.schema';
import { api } from '@/services/api';
import { mapRcaApiToIncident } from '../utils/mapRcaApiResponse';

// AI Chatbot LLM 타임아웃 장애 시나리오 mock RCA 데이터
const MOCK_INCIDENT: Incident = {
  incidentId: 'INC-2026-001',
  title: 'AI Chatbot 응답 실패율 급증 — LLM API 타임아웃',
  severity: 'critical',
  detectedAt: '2026-06-16T13:00:00Z',
  resolvedAt: null,
  symptoms: [
    { metric: 'ASR (Answer Success Rate)', from: '96.8%', to: '58.3%' },
    { metric: 'TTFT p95', from: '1,840ms', to: '12,400ms' },
    { metric: 'Availability', from: '99.97%', to: '99.88%' },
  ],
  relatedAlarms: ['ALM-20260616-001', 'ALM-20260616-002'],
  candidates: [
    {
      rank: 1,
      description: 'LLM 외부 API 타임아웃',
      probability: 92,
      evidence: [
        'llm-backend-svc timeout_rate 43.2% (정상 0.1% 미만)',
        'TTFT p95 12,400ms → LLM 응답 지연 직접 연관',
        'Circuit Breaker 미설정 → 타임아웃 누적',
      ],
      recommendedActions: [
        'Circuit Breaker 활성화 (llm-backend-svc)',
        'LLM API 공급자 Failover 구성 (Primary → Secondary)',
        'TTFT timeout 임계값 하향 조정 (30s → 8s)',
      ],
    },
    {
      rank: 2,
      description: 'Fallback 응답 모드 미구성',
      probability: 76,
      evidence: [
        'LLM 실패 시 fallback response 없음 → ASR 직접 하락',
        'Retry 로직 없이 즉시 실패 반환',
      ],
      recommendedActions: [
        'Fallback 응답 모드 구현 (캐시 기반 답변 제공)',
        'Retry with exponential backoff 적용',
      ],
    },
  ],
  timeline: [
    { ts: '2026-06-16T13:00:00Z', event: '이상 탐지: TTFT p95 급등 감지', type: 'detection' },
    { ts: '2026-06-16T13:05:00Z', event: 'ASR 86.7% → SLA 임계값(95%) 위반', type: 'metric' },
    { ts: '2026-06-16T13:12:00Z', event: 'Fast Burn Rate 8.73× 감지 → P1 인시던트 발급', type: 'rca' },
    { ts: '2026-06-16T13:15:00Z', event: 'RCA 분석 완료: LLM API 타임아웃 87% 신뢰도', type: 'rca' },
    { ts: '2026-06-16T13:18:00Z', event: 'HITL 승인 요청: Circuit Breaker 활성화', type: 'action' },
  ],
  summary: 'LLM 외부 API 타임아웃으로 Circuit Breaker 미작동 → ASR 58.3%, TTFT 12,400ms로 SLA 전면 위반. 즉각적인 Circuit Breaker 활성화 및 LLM Failover 구성 필요.',
};

export const useIncidentQuery = (svcId: string, tenantId?: string) => {
  return useQuery({
    queryKey: ['incident', svcId, tenantId],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          tenant_id: tenantId || 'demo-tenant',
          team_id: tenantId ? `${tenantId}-team` : 'demo-team',
        });
        const res = await api.get(`/rca/services/${encodeURIComponent(svcId)}/results?${params.toString()}`);
        if (res.data && (res.data.count ?? 0) > 0) {
          return IncidentSchema.parse(mapRcaApiToIncident(res.data, svcId));
        }
      } catch {
        // API 실패 시 mock fallback 반환
      }
      return MOCK_INCIDENT;
    },
  });
};
