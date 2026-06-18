import { useQuery } from '@tanstack/vue-query';
import { z } from 'zod';
import { IncidentSummarySchema } from '../types/incident.schema';
import { api } from '@/services/api';

interface IncidentFilters {
  serviceId?: string;
  severity?: string;
  limit?: number;
}

// Incident 이력 목록을 조회한다
export const useIncidentHistoryQuery = (filters?: IncidentFilters) => {
  return useQuery({
    queryKey: ['incident', 'history', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters?.serviceId) params.service_id = filters.serviceId;
      if (filters?.severity)  params.severity = filters.severity;
      if (filters?.limit)     params.limit = filters.limit;

      const res = await api.get('/api/triage/incidents', { params });
      const incidents = res.data?.incidents ?? [];
      return z.array(IncidentSummarySchema).parse(incidents);
    },
    refetchInterval: 30_000,
  });
};
