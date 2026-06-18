import { useQuery } from '@tanstack/vue-query';
import { TriageAssessmentSchema } from '../types/incident.schema';
import { api } from '@/services/api';
import type { Ref } from 'vue';

// 특정 Incident의 SLA Impact Assessment를 조회한다
export const useTriageAssessmentQuery = (incidentId: Ref<string> | string) => {
  const id = typeof incidentId === 'string' ? incidentId : incidentId;
  return useQuery({
    queryKey: ['incident', 'assessment', id],
    queryFn: async () => {
      const resolvedId = typeof id === 'string' ? id : (id as Ref<string>).value;
      const res = await api.get(`/api/triage/incidents/${resolvedId}/assessment`);
      return TriageAssessmentSchema.parse(res.data);
    },
    retry: 1,
  });
};
