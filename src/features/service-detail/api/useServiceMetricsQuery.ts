import { useQuery } from '@tanstack/vue-query';
import { ServiceDetailSchema } from '../types/metrics.schema';
import { serviceDetailMockData } from '@/services/mocks/data';
export const useServiceMetricsQuery = (svcId: string) => {
  return useQuery({
    queryKey: ['service-metrics', svcId],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = serviceDetailMockData[svcId as keyof typeof serviceDetailMockData];
      if (!data) throw new Error('Service detail not found');
      return ServiceDetailSchema.parse(data);
    },
  });
};
