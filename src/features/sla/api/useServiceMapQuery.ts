import { useQuery } from '@tanstack/vue-query';
import { z } from 'zod';
import { serviceMapMockData } from '@/services/mocks/data';

const ServiceMapSchema = z.object({
  nodes: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), x: z.number(), y: z.number() })),
  edges: z.array(z.object({ from: z.string(), to: z.string() })),
});
export type ServiceMap = z.infer<typeof ServiceMapSchema>;

export const useServiceMapQuery = (customerId: string) => {
  return useQuery({
    queryKey: ['service-map', customerId],
    queryFn: async () => {
      const data = serviceMapMockData[customerId] ?? serviceMapMockData['skt-digital'];
      return ServiceMapSchema.parse(data);
    },
  });
};
