import { z } from 'zod';
export const MetricStatSchema = z.object({ label: z.string(), value: z.string(), state: z.enum(['critical', 'warning', 'healthy', 'normal']), });
export const ResourceCardSchema = z.object({ id: z.string(), type: z.string(), kind: z.enum(['resource', 'endpoint']), name: z.string(), spec: z.string(), status: z.enum(['critical', 'warning', 'healthy']), headline: z.string(), primary: MetricStatSchema, metrics: z.array(MetricStatSchema), link: z.string(), });
export const RootCauseDataSchema = z.object({ enteredFrom: z.string(), cards: z.array(ResourceCardSchema), });
export type MetricStat = z.infer<typeof MetricStatSchema>;
export type ResourceCardData = z.infer<typeof ResourceCardSchema>;
export type RootCauseData = z.infer<typeof RootCauseDataSchema>;
