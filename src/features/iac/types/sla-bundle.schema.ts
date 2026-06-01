import { z } from 'zod'

export const ConfidenceLevelSchema = z.enum(['확실', '모호', '추정', '확정'])
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>

export const FieldActionSchema = z.enum(['accept', 'edit', 'direct'])
export type FieldAction = z.infer<typeof FieldActionSchema>

export const SLAItemSchema = z.object({
  fieldId: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number(), z.null()]),
  confidence: ConfidenceLevelSchema,
  sectionId: z.string(),
  required: z.boolean(),
  unit: z.string().optional(),
  description: z.string().optional(),
})
export type SLAItem = z.infer<typeof SLAItemSchema>

export const BundleStatusSchema = z.enum(['draft', 'confirmed', 'saved'])

export const SLABundleSchema = z.object({
  bundleId: z.string(),
  uploadSessionId: z.string(),
  items: z.array(SLAItemSchema),
  confirmedCount: z.number().int().nonnegative(),
  totalRequiredCount: z.number().int().positive(),
  status: BundleStatusSchema,
})
export type SLABundle = z.infer<typeof SLABundleSchema>

export const SLASectionSchema = z.object({
  sectionId: z.string(),
  label: z.string(),
  ambiguousCount: z.number().int().nonnegative(),
  estimatedCount: z.number().int().nonnegative(),
})
export type SLASection = z.infer<typeof SLASectionSchema>
