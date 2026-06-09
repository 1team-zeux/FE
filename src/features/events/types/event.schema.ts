import { z } from 'zod';

export const EventSchema = z.object({
  id: z.string(),
  ts: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  incidentId: z.string(),
  title: z.string(),
  severity: z.enum(['critical', 'warning']),
});

export type AppEvent = z.infer<typeof EventSchema>;
