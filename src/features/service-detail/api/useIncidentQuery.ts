import { useQuery } from '@tanstack/vue-query';
import { IncidentSchema } from '../types/incident.schema';
import { rcaMockData } from '@/services/mocks/data';
import { mapRcaApiToIncident } from '../utils/mapRcaApiResponse';

export const useIncidentQuery = (svcId: string, tenantId?: string) => {
  return useQuery({
    queryKey: ['incident', svcId, tenantId],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenant_id: tenantId || 'demo-tenant',
        team_id: tenantId ? `${tenantId}-team` : 'demo-team',
      });

      try {
        const res = await fetch(
          `/api/rca/services/${encodeURIComponent(svcId)}/results?${params.toString()}`,
        );
        if (res.ok) {
          const data = await res.json();
          if ((data.count ?? 0) > 0) {
            return IncidentSchema.parse(mapRcaApiToIncident(data, svcId));
          }
        }
      } catch {
        // MSW / offline → mock fallback
      }

      const mock = rcaMockData[svcId] ?? rcaMockData['subscription'];
      return IncidentSchema.parse(mock);
    },
  });
};
