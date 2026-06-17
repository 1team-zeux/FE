import { z } from 'zod';

export const TimelineEventSchema = z.object({
  ts: z.string(),
  event: z.string(),
  type: z.enum(['detection', 'metric', 'trace', 'rca', 'action']),
});

export const RcaCandidateSchema = z.object({
  rank: z.number(),
  description: z.string(),
  probability: z.number(),
  evidence: z.array(z.string()),
  recommendedActions: z.array(z.string()),
});

export const IncidentSchema = z.object({
  incidentId: z.string(),
  title: z.string(),
  severity: z.enum(['critical', 'warning']),
  detectedAt: z.string(),
  resolvedAt: z.string().nullable(),
  symptoms: z.array(z.object({ metric: z.string(), from: z.string(), to: z.string() })),
  relatedAlarms: z.array(z.string()),
  candidates: z.array(RcaCandidateSchema),
  timeline: z.array(TimelineEventSchema),
  summary: z.string().optional(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type RcaCandidate = z.infer<typeof RcaCandidateSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
