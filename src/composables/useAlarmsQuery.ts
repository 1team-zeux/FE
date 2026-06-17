import { useQuery } from '@tanstack/vue-query';
import { api } from '@/services/api';

export interface AlarmItem {
  id: string;
  service_name: string;
  title: string;
  body: string;
  severity: 'critical' | 'warning';
  time_ago: string;
  nav_service: string;
  nav_tab: string;
  read: boolean;
}

export function useAlarmsQuery(tenantId: string) {
  return useQuery({
    queryKey: ['alarms', tenantId],
    queryFn: async () => {
      const res = await api.get(`/monitoring/api/v1/tenants/${encodeURIComponent(tenantId)}/alarms`);
      return (res.data.alarms ?? []) as AlarmItem[];
    },
    enabled: !!tenantId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}
