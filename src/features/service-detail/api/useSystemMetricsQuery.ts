import { type Ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { SystemMetricsSchema } from '../types/metrics.schema';
import { systemMetricsMockData } from '@/services/mocks/data';
import type { TimeRange } from '@/components/shared/TimeRangePicker.vue';

export const useSystemMetricsQuery = (svcId: string, range?: Ref<TimeRange>) => {
  return useQuery({
    queryKey: ['system-metrics', svcId, range ?? '1h'],
    queryFn: async () => {
      const data = systemMetricsMockData[svcId] ?? systemMetricsMockData['subscription'];
      return SystemMetricsSchema.parse(data);
    },
  });
};
