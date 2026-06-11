import { useQuery } from '@tanstack/vue-query';
import { ServiceSchema } from '../types/sla.schema';
import { api } from '@/services/api';

function statusNorm(s: string): 'critical' | 'warning' | 'healthy' {
  const l = s.toLowerCase();
  if (l === 'critical') return 'critical';
  if (l === 'warning') return 'warning';
  return 'healthy';
}

function slaState(s: string): 'violation' | 'warning' | 'met' {
  const l = s.toLowerCase();
  if (l === 'critical') return 'violation';
  if (l === 'warning') return 'warning';
  return 'met';
}

export const useSlaStatusQuery = (buId: string) => {
  return useQuery({
    queryKey: ['sla-status', buId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/tenants/${buId}/services`);
      const cards: any[] = res.data.services ?? [];
      return cards.map((card) => {
        const slo = card.current_slo ?? 0;
        const avail_tgt = card.availability_target ?? 99.9;
        const lat_cur = card.current_latency_p99_ms ?? 0;
        const lat_tgt = card.latency_target_ms ?? 500;
        const burn = card.error_budget_burn ?? 0;
        const status = statusNorm(card.status);
        const allowed = 100 - avail_tgt;
        const consumed = 100 - slo;
        const budgetRemaining = allowed > 0 ? Math.max(0, Math.round((allowed - consumed) / allowed * 100)) : 100;

        return ServiceSchema.parse({
          id: card.service_name,
          name: card.service_name,
          tier: 'Tier 1',
          status,
          burn: burn > 3 ? 'Fast' : burn > 1 ? 'Slow' : null,
          budgetConsumed: 100 - budgetRemaining,
          budgetRemaining,
          alertStage: status === 'critical' ? 2 : status === 'warning' ? 1 : 0,
          drillable: true,
          slas: [
            {
              name: 'Availability',
              cur: `${slo.toFixed(2)}%`,
              tgt: `${avail_tgt}%`,
              state: slaState(card.status),
              label: card.status,
            },
            {
              name: 'Latency p99',
              cur: `${lat_cur}ms`,
              tgt: `${lat_tgt}ms`,
              state: lat_cur > lat_tgt ? 'warning' : 'met',
              label: lat_cur > lat_tgt ? 'Warning' : 'Met',
            },
          ],
          endpoints: [],
          availability: slo,
          latencyP95: lat_cur,
          apiEndpoints: 0,
        });
      });
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};
