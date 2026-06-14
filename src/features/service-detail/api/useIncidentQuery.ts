import { useQuery } from '@tanstack/vue-query';
import { IncidentSchema } from '../types/incident.schema';
import { api } from '@/services/api';
import { mapRcaApiToIncident } from '../utils/mapRcaApiResponse';

export const useIncidentQuery = (svcId: string, tenantId?: string) => {
  return useQuery({
    queryKey: ['incident', svcId, tenantId],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenant_id: tenantId || 'demo-tenant',
        team_id: tenantId ? `${tenantId}-team` : 'demo-team',
      });

      const res = await api.get(`/rca/services/${encodeURIComponent(svcId)}/results?${params.toString()}`);
      if (res.data && (res.data.count ?? 0) > 0) {
        return IncidentSchema.parse(mapRcaApiToIncident(res.data, svcId));
      }
      
      throw new Error('No incident data found');
    },
  });
};
