import { z } from 'zod'

export const ConfidenceLevelSchema = z.enum(['확실', '모호', '추정', '확정'])
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>

export const ActivationStatusSchema = z.enum(['active', 'inactive'])
export type ActivationStatus = z.infer<typeof ActivationStatusSchema>

export const SourceTypeSchema = z.enum([
  'doc1_contract',
  'doc2_infra',
  'system_default',
  'system_rule',
  'llm_recommendation',
])
export type SourceType = z.infer<typeof SourceTypeSchema>

export const ReviewStatusSchema = z.enum(['pending', 'approved', 'modified', 'rejected', 'not_applicable'])
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>

export const ServiceTypeSchema = z.enum(['web', 'api', 'batch'])
export type ServiceType = z.infer<typeof ServiceTypeSchema>

export const SLACategorySchema = z.enum(['availability', 'latency', 'rto', 'rpo'])
export type SLACategory = z.infer<typeof SLACategorySchema>

export const SLALevelSchema = z.enum(['L2_service', 'L3_endpoint'])
export type SLALevel = z.infer<typeof SLALevelSchema>

export const PhaseScopeSchema = z.enum(['mvp', 'phase2_candidate'])
export type PhaseScope = z.infer<typeof PhaseScopeSchema>

export const EvidenceSchema = z.object({
  documentId: z.string().optional(),
  page: z.number().optional(),
  snippet: z.string().optional(),
  ruleId: z.string().optional(),
})
export type Evidence = z.infer<typeof EvidenceSchema>

// Service metadata (3 services: Customer Portal Web, Subscription API, Billing Batch)
export const ServiceSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string(),
  serviceType: ServiceTypeSchema,
  workloadType: z.string().optional(),
  serviceTier: z.string().optional(),
  userTarget: z.string().optional(),
  description: z.string().optional(),
})
export type Service = z.infer<typeof ServiceSchema>

export const AiSuggestionSchema = z.object({
  value: z.string(),
  reason: z.string(),
})
export type AiSuggestion = z.infer<typeof AiSuggestionSchema>

// SLA review item linked to a service (availability/latency/rto/rpo per service)
export const SLAItemSchema = z.object({
  slaItemId: z.string(),
  serviceId: z.string(),
  category: SLACategorySchema,
  slaLevel: SLALevelSchema.optional(),
  label: z.string(),
  targetValue: z.union([z.string(), z.number(), z.null()]),
  unit: z.string().optional(),
  measurementFilter: z.string().optional(),
  measurementWindow: z.string().optional(),
  exclusionConditions: z.string().optional(),
  phaseScope: PhaseScopeSchema.optional(),
  confidence: ConfidenceLevelSchema,
  source: SourceTypeSchema.optional(),
  reviewStatus: ReviewStatusSchema.optional(),
  activationStatus: ActivationStatusSchema.optional(),
  evidence: EvidenceSchema.optional(),
  required: z.boolean(),
  description: z.string().optional(),
  suggestions: z.array(AiSuggestionSchema).optional(),
}).passthrough()
export type SLAItem = z.infer<typeof SLAItemSchema>

// Bundle-level form fields for non-SLA sections (infra, cost, compliance, db, basic info, performance)
export const BundleFieldSchema = z.object({
  fieldId: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number(), z.null()]),
  confidence: ConfidenceLevelSchema,
  sectionId: z.string(),
  required: z.boolean(),
  unit: z.string().optional(),
  description: z.string().optional(),
  activationStatus: ActivationStatusSchema.optional(),
  source: SourceTypeSchema.optional(),
  reviewStatus: ReviewStatusSchema.optional(),
  evidence: EvidenceSchema.optional(),
}).passthrough()
export type BundleField = z.infer<typeof BundleFieldSchema>

export const BundleStatusSchema = z.enum(['draft', 'confirmed', 'saved'])
export type BundleStatus = z.infer<typeof BundleStatusSchema>

export const SLABundleSchema = z.object({
  bundleId: z.string(),
  uploadSessionId: z.string(),
  services: z.array(ServiceSchema),
  slaItems: z.array(SLAItemSchema),
  bundleFields: z.array(BundleFieldSchema),
  confirmedCount: z.number().int().nonnegative(),
  totalRequiredCount: z.number().int().positive(),
  status: BundleStatusSchema,
}).passthrough()
export type SLABundle = z.infer<typeof SLABundleSchema>

// SLA section schema kept for topology / screen 3 usage
export const SLASectionSchema = z.object({
  sectionId: z.string(),
  label: z.string(),
  ambiguousCount: z.number().int().nonnegative(),
  estimatedCount: z.number().int().nonnegative(),
})
export type SLASection = z.infer<typeof SLASectionSchema>
