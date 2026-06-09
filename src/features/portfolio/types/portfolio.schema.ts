import { z } from 'zod';
export const BUSchema = z.object({
  id: z.string(), customer: z.string(), bu: z.string(), platform: z.string(), status: z.enum(['critical', 'warning', 'healthy']),
  serviceCount: z.number(), riskCount: z.number(), lowestBudget: z.number(), burn: z.string().nullable(), drillable: z.boolean(), note: z.string(),
  riskScore: z.number().default(0),
  tier: z.enum(['Enterprise', 'Business', 'Starter']).default('Business'),
  activeEvents: z.number().default(0),
});
export type BU = z.infer<typeof BUSchema>;
