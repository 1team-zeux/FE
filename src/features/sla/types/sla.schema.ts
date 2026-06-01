import { z } from 'zod';
export const SlaItemSchema = z.object({ name: z.string(), cur: z.string(), tgt: z.string().optional(), state: z.enum(['violation', 'warning', 'met', 'reference']), label: z.string(), });
export const EndpointSchema = z.object({ method: z.string(), path: z.string(), state: z.enum(['highlight', 'muted', 'normal']), sla: SlaItemSchema.optional(), });
export const ServiceSchema = z.object({ id: z.string(), name: z.string(), tier: z.string(), status: z.enum(['critical', 'warning', 'healthy']), burn: z.string().nullable(), budgetConsumed: z.number(), budgetRemaining: z.number(), alertStage: z.number(), drillable: z.boolean(), slas: z.array(SlaItemSchema), endpoints: z.array(EndpointSchema), endpointNote: z.string().optional(), });
export type SlaItem = z.infer<typeof SlaItemSchema>;
export type Endpoint = z.infer<typeof EndpointSchema>;
export type Service = z.infer<typeof ServiceSchema>;
