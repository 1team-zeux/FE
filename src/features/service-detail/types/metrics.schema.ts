import { z } from 'zod';
export const SliSchema = z.object({ id: z.string(), name: z.string(), unit: z.string(), series: z.array(z.number()), target: z.number().optional(), targetLabel: z.string().optional(), domain: z.tuple([z.number(), z.number()]), state: z.enum(['violation', 'warning', 'met']), sla: z.string(), breachFrom: z.number().optional(), });
export const AlarmSchema = z.object({ id: z.string(), t: z.string(), idx: z.number(), sev: z.enum(['critical', 'warning']), title: z.string(), desc: z.string(), sla: z.string(), });
export const ServiceDetailSchema = z.object({ serviceId: z.string(), serviceName: z.string(), window: z.string(), times: z.array(z.string()), slis: z.array(SliSchema), budget: z.object({ name: z.string(), unit: z.string(), series: z.array(z.number()), domain: z.tuple([z.number(), z.number()]), }), alarms: z.array(AlarmSchema), });
export type Sli = z.infer<typeof SliSchema>;
export type Alarm = z.infer<typeof AlarmSchema>;
export type ServiceDetail = z.infer<typeof ServiceDetailSchema>;
