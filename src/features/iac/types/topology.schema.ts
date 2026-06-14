import { z } from 'zod'

export const NodeTypeSchema = z.enum([
  'vpc', 'subnet', 'ec2', 'rds', 'elb', 'nat', 'igw',
  'lambda', 'ecs', 'eks', 'cloudwatch', 'route53', 'apigw', 's3',
  'elasticache', 'vpn', 'kms', 'eventbridge', 'external-api',
])
export type NodeType = z.infer<typeof NodeTypeSchema>

export const TopologyNodeSchema = z.object({
  nodeId: z.string(),
  type: NodeTypeSchema,
  label: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  parentGroupId: z.string().optional(),
  catalogRule: z.string().optional(),
  applyCondition: z.string().optional(),
  layer_id: z.string().optional(),
  az: z.string().optional(),
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

export const GroupTypeSchema = z.enum(['vpc', 'public-subnet', 'private-subnet', 'db-subnet', 'asg'])
export type GroupType = z.infer<typeof GroupTypeSchema>

export const TopologyGroupSchema = z.object({
  groupId: z.string(),
  label: z.string(),
  type: GroupTypeSchema,
  parentGroupId: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})
export type TopologyGroup = z.infer<typeof TopologyGroupSchema>

export const TopologyDraftSchema = z.object({
  topologyId: z.string(),
  label: z.string(),
  summary: z.string(),
  estimatedMonthlyCost: z.number().nonnegative(),
  slaSatisfaction: z.record(z.string()),
  rationale: z.array(z.string()),
  conceptNote: z.string().optional(),
  nodes: z.array(TopologyNodeSchema),
  edges: z.array(TopologyEdgeSchema),
  groups: z.array(TopologyGroupSchema).optional(),
})
export type TopologyDraft = z.infer<typeof TopologyDraftSchema>

export const ApproveTopologyResponseSchema = z.object({
  topologyId: z.string(),
  approved: z.literal(true),
})
export type ApproveTopologyResponse = z.infer<typeof ApproveTopologyResponseSchema>
