import { useQuery } from '@tanstack/vue-query';
import { ServiceSchema } from '../types/sla.schema';
import { servicesMockData } from '@/services/mocks/data';
export const useSlaStatusQuery = (buId: string) => {
  return useQuery({
    queryKey: ['sla-status', buId],
    queryFn: async () => {
      const data = servicesMockData[buId as keyof typeof servicesMockData] || [];
      return data.map((item) => ServiceSchema.parse(item));
    },
  });
};
