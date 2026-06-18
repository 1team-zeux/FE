import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { z } from 'zod';
import { RecoveryActionSchema } from '../types/incident.schema';
import { api } from '@/services/api';

const RecoveryResponseSchema = z.object({
  incident_id: z.string(),
  actions: z.array(RecoveryActionSchema),
  report: z.string().optional(),
});

// Incident의 복구 추천 조치 조회 — 백엔드가 RCA 결과 기반으로 생성
export const useRecoveryActionsQuery = (incidentId: string) => {
  return useQuery({
    queryKey: ['incident', 'recovery', incidentId],
    queryFn: async () => {
      const res = await api.get(`/api/triage/incidents/${incidentId}/recovery-actions`);
      return RecoveryResponseSchema.parse(res.data);
    },
    retry: 1,
  });
};

// 조치 승인/반려 → action_histories에 적재
export interface ApproveActionPayload {
  incidentId: string;
  actionId: string;
  decision: 'approve' | 'reject';
  reason?: string;
}

export const useApproveActionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApproveActionPayload) => {
      const res = await api.post(
        `/api/triage/incidents/${payload.incidentId}/actions/${payload.actionId}/${payload.decision}`,
        { reason: payload.reason ?? '' },
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      // 캐시 무효화 → 상태 재조회
      qc.invalidateQueries({ queryKey: ['incident', 'recovery', variables.incidentId] });
    },
  });
};
