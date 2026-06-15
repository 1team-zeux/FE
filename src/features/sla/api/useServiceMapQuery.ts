import { useQuery } from '@tanstack/vue-query';
import { z } from 'zod';
import { api } from '@/services/api';

const ServiceMapSchema = z.object({
  nodes: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), x: z.number(), y: z.number() })),
  edges: z.array(z.object({ from: z.string(), to: z.string() })),
});
export type ServiceMap = z.infer<typeof ServiceMapSchema>;

export const useServiceMapQuery = (customerId: string) => {
  return useQuery({
    queryKey: ['service-map', customerId],
    queryFn: async () => {
      const res = await api.get(`/service-map/${customerId}`);
      return ServiceMapSchema.parse(res.data);
    },
  });
};
