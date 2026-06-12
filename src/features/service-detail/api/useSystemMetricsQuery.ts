import { type Ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { SystemMetricsSchema } from '../types/metrics.schema';
import { api } from '@/services/api';
import type { TimeRange } from '@/components/shared/TimeRangePicker.vue';

export const useSystemMetricsQuery = (svcId: string, tenantId: string, range?: Ref<TimeRange>) => {
  return useQuery({
    queryKey: ['system-metrics', svcId, tenantId, range],
    queryFn: async () => {
      const r = range?.value ?? '1h';
      const res = await api.get(
        `/monitoring/api/v1/services/${encodeURIComponent(svcId)}/system-metrics`,
        { params: { tenant_id: tenantId, range: r } },
      );
      return SystemMetricsSchema.parse(res.data);
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
};
