import { useMutation } from '@tanstack/vue-query';
import { TriageAssessmentSchema } from '../types/incident.schema';
import { api } from '@/services/api';

// 데모 시나리오로 Triage Agent를 즉시 실행한다
export const useDemoTriageMutation = () => {
  return useMutation({
    mutationFn: async (scenario: 'billing_batch_critical' | 'subscription_warning') => {
      const res = await api.post('/api/triage/demo/run', { scenario });
      return TriageAssessmentSchema.parse(res.data);
    },
  });
};
