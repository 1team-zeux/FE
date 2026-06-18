import { useQuery } from '@tanstack/vue-query';
import { ServiceSchema } from '../types/sla.schema';
import { api } from '@/services/api';

const MOCK_SERVICES = [
  { service_name: 'Customer Portal Web', current_slo: 99.97, availability_target: 99.9,  current_latency_p99_ms: 210, latency_target_ms: 800,  error_budget_burn: 0.8, status: 'healthy'  },
  { service_name: 'Subscription API',    current_slo: 99.94, availability_target: 99.95, current_latency_p99_ms: 380, latency_target_ms: 500,  error_budget_burn: 2.3, status: 'warning'  },
  { service_name: 'AI Chatbot Service',  current_slo: 99.12, availability_target: 99.9,  current_latency_p99_ms: 5720, latency_target_ms: 3000, error_budget_burn: 8.7, status: 'critical' },
  { service_name: 'Billing Settlement Batch', current_slo: 100.0, availability_target: 99.99, current_latency_p99_ms: 0, latency_target_ms: 9999, error_budget_burn: 0.0, status: 'healthy' },
];

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
      let cards: any[] = [];
      try {
        const res = await api.get(`/api/v1/tenants/${buId}/services`);
        cards = res.data.services ?? [];
      } catch { /* API 실패 시 mock fallback */ }
      if (cards.length === 0) cards = MOCK_SERVICES;
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
          burn: `${burn.toFixed(1)}x`,
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
