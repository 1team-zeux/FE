import { useQuery } from '@tanstack/vue-query';
import { BUSchema } from '../types/portfolio.schema';
import { api } from '@/services/api';

function statusNorm(s: string): 'critical' | 'warning' | 'healthy' {
  const l = s.toLowerCase();
  if (l === 'critical') return 'critical';
  if (l === 'warning') return 'warning';
  return 'healthy';
}

function tierMap(t: string): 'Enterprise' | 'Business' | 'Starter' {
  if (t === 'Enterprise') return 'Enterprise';
  if (t === 'Starter') return 'Starter';
  return 'Business';
}

export const usePortfolioQuery = () => {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const res = await api.get('/api/v1/global/dashboard');
      const tenants: any[] = res.data.tenants ?? [];
      return tenants.map((card) =>
        BUSchema.parse({
          id: card.tenant_id,
          customer: card.display_name,
          bu: card.display_name,
          platform: `${card.display_name} Platform`,
          status: statusNorm(card.sla_status),
          serviceCount: card.service_count ?? 0,
          riskCount: card.active_incidents ?? 0,
          lowestBudget: Math.round(card.error_budget_remaining ?? 100),
          burn: (card.active_incidents ?? 0) > 0 ? 'Fast' : null,
          drillable: (card.service_count ?? 0) > 0,
          note:
            card.sla_status === 'Critical'
              ? 'SLA Violation detected'
              : card.sla_status === 'Warning'
                ? 'SLA Warning'
                : 'All services meet SLA',
          riskScore: Math.round(100 - (card.error_budget_remaining ?? 100)),
          tier: tierMap(card.tier),
          activeEvents: card.active_incidents ?? 0,
        }),
      );
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};
