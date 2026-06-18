import { useQuery } from '@tanstack/vue-query';
import { RootCauseDataSchema, type RootCauseData } from '../types/root-cause.schema';
import { api } from '@/services/api';

// 두 진입 경로 모두 지원: alarm trace 모드 (기존) + incident 모드 (장애 대응)
export interface UseRootCauseQueryOptions {
  alarmId?: string;
  incidentId?: string;
}

// 백엔드 rca_results 형식 → RootCauseData 변환 (incident 모드)
function rcaResultsToCards(payload: { incident_id: string; results?: Array<Record<string, unknown>> }): RootCauseData {
  const results = payload.results ?? [];
  const cards = results.map((r, i) => {
    const causeType = String(r.root_cause_type ?? `cause-${i}`);
    const confidence = Number(r.confidence_score ?? 0);
    return {
      id: String(r.id ?? `rca-${i}`),
      type: causeType.toUpperCase().slice(0, 20),
      kind: 'resource' as const,
      name: causeType,
      spec: String(r.root_cause_summary ?? '근본 원인 후보'),
      status: confidence >= 0.7 ? 'critical' as const : confidence >= 0.4 ? 'warning' as const : 'healthy' as const,
      headline: `confidence ${(confidence * 100).toFixed(0)}%`,
      primary: {
        label: 'confidence',
        value: `${(confidence * 100).toFixed(0)}%`,
        state: (confidence >= 0.7 ? 'critical' : confidence >= 0.4 ? 'warning' : 'healthy') as 'critical' | 'warning' | 'healthy',
      },
      metrics: [
        { label: 'rank',     value: `#${i + 1}`,                 state: 'normal' as const },
        { label: 'evidence', value: String((r.evidences as unknown[] | undefined)?.length ?? 0), state: 'normal' as const },
        { label: 'type',     value: causeType.split('_')[0],     state: 'normal' as const },
      ],
      link: String(r.recommendation ?? '운영자 검토 필요'),
    };
  });

  return {
    enteredFrom: `Incident ${payload.incident_id}`,
    cards: cards.length > 0 ? cards : [{
      id: 'no-rca',
      type: 'PENDING',
      kind: 'resource' as const,
      name: 'RCA 결과 대기 중',
      spec: '아직 RCA Agent 분석이 완료되지 않았습니다.',
      status: 'warning' as const,
      headline: 'pending',
      primary: { label: 'state', value: 'PENDING', state: 'warning' as const },
      metrics: [],
      link: 'Triage가 RCA를 자동 진입 시켰다면 잠시 후 결과가 갱신됩니다.',
    }],
  };
}

export const useRootCauseQuery = (opts: string | UseRootCauseQueryOptions) => {
  // backward compat: 문자열이면 alarmId
  const options: UseRootCauseQueryOptions = typeof opts === 'string'
    ? { alarmId: opts }
    : opts;

  const key = options.incidentId
    ? ['root-cause', 'incident', options.incidentId]
    : ['root-cause', 'alarm', options.alarmId];

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      // incident 모드: 백엔드 rca_router를 통해 진짜 rca_results 조회
      if (options.incidentId) {
        const res = await api.get(`/api/rca/incidents/${options.incidentId}/results`);
        return rcaResultsToCards(res.data);
      }
      // alarm 모드 (기존): trace mock 데이터
      const res = await api.get(`/root-cause/${options.alarmId}`);
      if (!res.data) throw new Error('Root cause data not found');
      return RootCauseDataSchema.parse(res.data);
    },
    retry: 1,
  });
};
