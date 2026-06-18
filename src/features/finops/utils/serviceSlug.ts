/** Match sla-agent `services/zeux_finops_data._slug` for FinOps service_id. */
export function toFinOpsServiceSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
