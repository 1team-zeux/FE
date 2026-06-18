import { useQuery } from '@tanstack/vue-query';
import { z } from 'zod';
import { api } from '@/services/api';

const ServiceMapSchema = z.object({
  nodes: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), x: z.number(), y: z.number() })),
  edges: z.array(z.object({ from: z.string(), to: z.string() })),
});
export type ServiceMap = z.infer<typeof ServiceMapSchema>;

// SKT T-Universe 서비스 의존성 맵 mock
const MOCK_MAP: ServiceMap = {
  nodes: [
    { id: 'portal',       name: 'Customer Portal', status: 'healthy',  x: 20,  y: 165 },
    { id: 'sub-api',      name: 'Subscription API', status: 'warning',  x: 210, y: 55  },
    { id: 'chatbot',      name: 'AI Chatbot',       status: 'critical', x: 210, y: 165 },
    { id: 'billing',      name: 'Billing Batch',    status: 'healthy',  x: 210, y: 275 },
    { id: 'mariadb',      name: 'MariaDB',          status: 'warning',  x: 400, y: 55  },
    { id: 'redis',        name: 'Redis Cache',      status: 'healthy',  x: 400, y: 165 },
    { id: 'llm-backend',  name: 'LLM Backend',      status: 'critical', x: 400, y: 275 },
  ],
  edges: [
    { from: 'portal',  to: 'sub-api'     },
    { from: 'portal',  to: 'chatbot'     },
    { from: 'portal',  to: 'billing'     },
    { from: 'sub-api', to: 'mariadb'     },
    { from: 'sub-api', to: 'redis'       },
    { from: 'chatbot', to: 'redis'       },
    { from: 'chatbot', to: 'llm-backend' },
    { from: 'billing', to: 'mariadb'     },
  ],
};

export const useServiceMapQuery = (customerId: string) => {
  return useQuery({
    queryKey: ['service-map', customerId],
    queryFn: async () => {
      try {
        const res = await api.get(`/service-map/${customerId}`);
        const parsed = ServiceMapSchema.parse(res.data);
        if (parsed.nodes.length > 0) return parsed;
      } catch { /* API 실패 시 mock fallback */ }
      return MOCK_MAP;
    },
  });
};
