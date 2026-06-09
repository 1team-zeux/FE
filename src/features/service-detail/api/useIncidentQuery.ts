import { useQuery } from '@tanstack/vue-query';
import { IncidentSchema } from '../types/incident.schema';
import { rcaMockData } from '@/services/mocks/data';

export const useIncidentQuery = (svcId: string) => {
  return useQuery({
    queryKey: ['incident', svcId],
    queryFn: async () => {
      const data = rcaMockData[svcId] ?? rcaMockData['subscription'];
      return IncidentSchema.parse(data);
    },
  });
};
