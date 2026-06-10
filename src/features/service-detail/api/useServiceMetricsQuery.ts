import { type Ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { ServiceDetailSchema } from '../types/metrics.schema';
import { api } from '@/services/api';
import type { TimeRange } from '@/components/shared/TimeRangePicker.vue';

export type { TimeRange };

export const useServiceMetricsQuery = (svcId: string, tenantId: string, range?: Ref<TimeRange>) => {
  return useQuery({
    queryKey: ['service-metrics', svcId, tenantId, range],
    queryFn: async () => {
      const r = range?.value ?? '1h';
      const res = await api.get(
        `/monitoring/api/v1/services/${encodeURIComponent(svcId)}/sli-metrics`,
        { params: { tenant_id: tenantId, range: r } },
      );
      return ServiceDetailSchema.parse(res.data);
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
};
