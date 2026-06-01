import { z } from 'zod'

export const NodeTypeSchema = z.enum([
  'vpc', 'subnet', 'ec2', 'rds', 'elb', 'nat', 'igw',
  'lambda', 'ecs', 'eks', 'cloudwatch', 'route53',
])
export type NodeType = z.infer<typeof NodeTypeSchema>

export const TopologyNodeSchema = z.object({
  nodeId: z.string(),
  type: NodeTypeSchema,
  label: z.string(),
  x: z.number(),
  y: z.number(),
  catalogRule: z.string().optional(),
  applyCondition: z.string().optional(),
})
export type TopologyNode = z.infer<typeof TopologyNodeSchema>

export const TopologyEdgeSchema = z.object({
  edgeId: z.string(),
  from: z.string(),
  to: z.string(),
  dashed: z.boolean().default(false),
  label: z.string().optional(),
})
export type TopologyEdge = z.infer<typeof TopologyEdgeSchema>

export const TopologyDraftSchema = z.object({
  topologyId: z.string(),
  label: z.string(),
  summary: z.string(),
  estimatedMonthlyCost: z.number().nonnegative(),
  slaSatisfaction: z.record(z.string()),
  rationale: z.array(z.string()),
  nodes: z.array(TopologyNodeSchema),
  edges: z.array(TopologyEdgeSchema),
})
export type TopologyDraft = z.infer<typeof TopologyDraftSchema>

export const ApproveTopologyResponseSchema = z.object({
  topologyId: z.string(),
  approved: z.literal(true),
})
