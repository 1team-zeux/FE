import { type Ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { ServiceDetailSchema } from '../types/metrics.schema';
import { serviceDetailMockData } from '@/services/mocks/data';
import type { TimeRange } from '@/components/shared/TimeRangePicker.vue';

export type { TimeRange };

export const useServiceMetricsQuery = (svcId: string, range?: Ref<TimeRange>) => {
  return useQuery({
    queryKey: ['service-metrics', svcId, range ?? '1h'],
    queryFn: async () => {
      const data = serviceDetailMockData[svcId as keyof typeof serviceDetailMockData];
      if (!data) throw new Error('Service detail not found');
      return ServiceDetailSchema.parse(data);
    },
  });
};
