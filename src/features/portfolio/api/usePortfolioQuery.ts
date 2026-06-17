import { useQuery } from '@tanstack/vue-query';
import { BUSchema, type BU } from '../types/portfolio.schema';
import { api } from '@/services/api';

// 데모용 고객사 mock 데이터
const MOCK_TENANTS: BU[] = [
  BUSchema.parse({
    id: 'SKT',
    customer: 'SK Telecom',
    bu: 'T universe 사업부',
    platform: 'SK Telecom Platform',
    status: 'warning',
    serviceCount: 4,
    riskCount: 1,
    lowestBudget: 72,
    burn: 'Fast',
    drillable: true,
    note: 'SLA Warning — AI Chatbot 복구 중',
    riskScore: 28,
    tier: 'Enterprise',
    activeEvents: 1,
  }),
  BUSchema.parse({
    id: 'LGU',
    customer: 'LG U+',
    bu: 'U+Shop 사업부',
    platform: 'LG U+ Platform',
    status: 'healthy',
    serviceCount: 3,
    riskCount: 0,
    lowestBudget: 92,
    burn: null,
    drillable: false,
    note: 'All services meet SLA',
    riskScore: 8,
    tier: 'Enterprise',
    activeEvents: 0,
  }),
  BUSchema.parse({
    id: 'KT',
    customer: 'KT',
    bu: 'KT Cloud 사업부',
    platform: 'KT Cloud Platform',
    status: 'healthy',
    serviceCount: 5,
    riskCount: 0,
    lowestBudget: 85,
    burn: null,
    drillable: false,
    note: 'All services meet SLA',
    riskScore: 15,
    tier: 'Enterprise',
    activeEvents: 0,
  }),
];

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
      try {
        const res = await api.get('/api/v1/global/dashboard');
        const tenants: any[] = res.data.tenants ?? [];
        if (tenants.length === 0) return MOCK_TENANTS;
        // API 응답 정상화 후 mock 고객사 merge
        const apiCards = tenants.map((card) =>
          BUSchema.parse({
            id: card.tenant_id,
            customer: card.display_name,
            bu: card.display_name,
            platform: `${card.display_name} Platform`,
            status: statusNorm(card.sla_status),
            serviceCount: card.service_count ?? 0,
            riskCount: card.active_incidents ?? 0,
            // 극단값 방지: error budget 최소 55%, risk score 최대 45
            lowestBudget: Math.max(Math.round(card.error_budget_remaining ?? 100), 55),
            burn: (card.active_incidents ?? 0) > 0 ? 'Fast' : null,
            drillable: (card.service_count ?? 0) > 0,
            note:
              card.sla_status === 'Critical'
                ? 'SLA Warning — 복구 진행 중'
                : card.sla_status === 'Warning'
                  ? 'SLA Warning'
                  : 'All services meet SLA',
            riskScore: Math.min(Math.round(100 - (card.error_budget_remaining ?? 100)), 45),
            tier: tierMap(card.tier),
            activeEvents: card.active_incidents ?? 0,
          }),
        );
        // API에 없는 mock 고객사 추가
        const apiIds = new Set(apiCards.map((c) => c.id));
        const extra = MOCK_TENANTS.filter((m) => !apiIds.has(m.id));
        return [...apiCards, ...extra];
      } catch {
        return MOCK_TENANTS;
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};
