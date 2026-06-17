import type {
  BacklogItem,
  FinOpsFinding,
  FinOpsRun,
  OptimizationCategory,
  OptimizationProposal,
  OptimizationReport,
  SlaEvidence,
  TradeoffRow,
} from '../types/finops.schema'
import { resolveExecutiveReport } from './executiveReport'
import { findingToProposalMetrics } from './evidenceMetrics'
import { findingToTopologyMetrics } from './topologyMetrics'
import { humanizeFindingReason, proposalTitleFromFinding, resourceTypeLabel } from './proposalNarrative'

export const CATEGORY_LABELS: Record<OptimizationCategory, string> = {
  rightsizing: 'RightSizing',
  unused: '미사용 자원',
  scheduling: '파워 스케줄링',
  reserved: '예약 인스턴스',
}

const PATTERN_CATEGORY: Record<string, OptimizationCategory> = {
  idle_ec2_cpu: 'unused',
  idle_ebs_unattached: 'unused',
  idle_nat_gateway: 'unused',
  overprovision_rds: 'rightsizing',
  k8s_overprovision: 'rightsizing',
}

const ACTION_CATEGORY: Record<string, OptimizationCategory> = {
  downsize: 'rightsizing',
  stop: 'unused',
  delete: 'unused',
  schedule: 'scheduling',
}

export function patternToCategory(patternId?: string, action?: string): OptimizationCategory {
  if (patternId && PATTERN_CATEGORY[patternId]) return PATTERN_CATEGORY[patternId]
  if (action && ACTION_CATEGORY[action]) return ACTION_CATEGORY[action]
  return 'rightsizing'
}

function usdToKrw(usd: number): number {
  return Math.round(usd * 1350)
}

function findingToProposal(item: FinOpsFinding, index: number): OptimizationProposal {
  const category = patternToCategory(item.pattern_id, item.recommended_action)
  // blocked/defer: potential savings 표시, eligible: actual savings
  const savingsUsd = item.monthly_waste_usd ?? item.monthly_potential_waste_usd ?? 0
  const blocked = item.guard_status === 'blocked' || item.guard_status === 'defer'
  const action = item.recommended_action ?? 'optimize'
  const metrics = findingToProposalMetrics(item)
  const topo = findingToTopologyMetrics(item)

  return {
    id: `finding-${item.resource_id}-${index}`,
    category,
    service_name: item.resource_id,
    title: blocked
      ? `${resourceTypeLabel(item.resource_id, item.resource_type)} — ${item.guard_reason ?? 'SLA guard 검토 필요'}`
      : proposalTitleFromFinding(item),
    monthly_savings_krw: usdToKrw(savingsUsd),
    monthly_savings_usd: savingsUsd || undefined,
    priority_band: blocked ? 'P2' : undefined,
    sla_impact: blocked ? 'review' : 'low',
    sla_impact_detail: item.guard_reason ?? undefined,
    evidence_summary: humanizeFindingReason(item) ?? metrics.evidence_summary ?? item.guard_reason ?? item.data_source,
    cpu_utilization_trend: metrics.cpu_utilization_trend,
    metric_series_timestamps: metrics.metric_series_timestamps,
    metric_series_source: metrics.metric_series_source,
    metric_label: metrics.metric_label,
    metric_threshold: metrics.metric_threshold,
    promql: metrics.promql,
    grafana_url: metrics.grafana_url,
    loki_url: metrics.loki_url,
    logql: metrics.logql,
    log_samples: metrics.log_samples,
    confidence_score: metrics.confidence_score,
    utilization_source: metrics.utilization_source,
    evidence: metrics.evidence,
    utilization: metrics.utilization,
    topology_context: topo.topology_context,
    resource_id: item.resource_id,
    recommended_action: item.recommended_action,
    terraform_handoff: !blocked && ['downsize', 'stop', 'schedule'].includes(action),
  }
}

function backlogToProposal(item: BacklogItem, index: number): OptimizationProposal {
  const category = patternToCategory(item.pattern_id, item.recommended_action)
  const savingsUsd = item.monthly_waste_usd ?? 0
  const action = item.recommended_action ?? 'optimize'
  const title =
    category === 'rightsizing'
      ? `${item.resource_id}: 인스턴스 다운사이즈 (${action})`
      : category === 'unused'
        ? `${item.resource_id}: 미사용 자원 ${action}`
        : `${item.resource_id}: ${action}`

  return {
    id: `gen-${item.resource_id}-${index}`,
    category,
    service_name: item.resource_id,
    title,
    monthly_savings_krw: usdToKrw(savingsUsd),
    monthly_savings_usd: savingsUsd,
    priority_band: item.priority_band,
    sla_impact: 'review',
    sla_impact_detail: 'Error Budget 여유 확인 필요',
    evidence_summary: item.reason ?? undefined,
    confidence_score: item.confidence_score,
    resource_id: item.resource_id,
    recommended_action: item.recommended_action,
    terraform_handoff: ['downsize', 'stop', 'schedule'].includes(action),
    iac_change_label: action === 'downsize' ? '인스턴스 타입 변경' : undefined,
  }
}

function enrichProposalFromFinding(
  proposal: OptimizationProposal,
  findings: FinOpsFinding[],
): OptimizationProposal {
  const match = findings.find((f) => f.resource_id === proposal.resource_id)
  if (!match) return proposal
  const metrics = findingToProposalMetrics(match)
  const topo = findingToTopologyMetrics(match)
  return {
    ...proposal,
    evidence_summary: metrics.evidence_summary ?? proposal.evidence_summary,
    cpu_utilization_trend: metrics.cpu_utilization_trend ?? proposal.cpu_utilization_trend,
    metric_series_timestamps: metrics.metric_series_timestamps,
    metric_series_source: metrics.metric_series_source,
    metric_label: metrics.metric_label,
    metric_threshold: metrics.metric_threshold,
    promql: metrics.promql,
    grafana_url: metrics.grafana_url,
    loki_url: metrics.loki_url,
    logql: metrics.logql,
    log_samples: metrics.log_samples,
    confidence_score: metrics.confidence_score ?? proposal.confidence_score,
    utilization_source: metrics.utilization_source,
    evidence: metrics.evidence,
    utilization: metrics.utilization,
    topology_context: topo.topology_context ?? proposal.topology_context,
  }
}

const DEFAULT_SLA_EVIDENCE: SlaEvidence = {
  period_label: '2026년 6월',
  services: [
    { service_name: 'Customer Portal Web', availability_target: '99.90%', availability_actual: '99.94%', status: 'met' },
    { service_name: 'Subscription API', availability_target: '99.95%', availability_actual: '99.96%', status: 'met' },
    { service_name: 'POST /subscriptions', availability_target: '99.99%', availability_actual: '99.99%', status: 'met' },
  ],
  error_budget_trend: [
    { label: '3월', remaining_pct: 72 },
    { label: '4월', remaining_pct: 65 },
    { label: '5월', remaining_pct: 58 },
    { label: '6월', remaining_pct: 51 },
  ],
  incidents_summary:
    '이번 달 인시던트 1건 — 결제 API 타임아웃(⑤⑥ RCA 완료). Error Budget 소진 12%, 목표 대비 여유 충분.',
  executive_summary:
    '6월 SLA 목표 전 서비스 충족. Error Budget 잔여 51%로 절감 권유안 적용 시에도 가용성 목표 유지 가능.',
  recipient: 'sanghoon.kim@sktelecom.com',
  send_status: 'pending',
}

export function resolveOptimizationReport(run: FinOpsRun): OptimizationReport {
  const exec = resolveExecutiveReport(run)
  if (exec.optimization?.proposals?.length) {
    return exec.optimization
  }

  let proposals = (exec.prioritized_backlog ?? []).map(backlogToProposal)
  const findings = run.findings_snapshot?.findings ?? []
  if (proposals.length) {
    proposals = proposals.map((p) => enrichProposalFromFinding(p, findings))
  }
  if (!proposals.length) {
    const blocked = exec.blocked_defer ?? []
    const source = blocked.length ? blocked : findings
    proposals = source.map(findingToProposal)
  }
  const totalKrw = proposals.reduce((s, p) => s + p.monthly_savings_krw, 0)
  const eligible = run.eligible_count ?? run.findings_snapshot?.eligible_count ?? 0
  const lead =
    eligible > 0
      ? '장애가 없는 날에도 Agent는 일합니다. 축적된 실측 데이터를 기반으로 해당 고객사에 맞는 절감안을 상시 제안하며, 모든 제안에 SLA 영향 검증이 동반됩니다.'
      : '이번 주기 eligible 절감안은 없습니다. 아래는 SLA guard에 의해 보류·차단된 후보입니다 — zeux CMDB·비용 태그 시드 후 재분석하면 절감액이 산출됩니다.'

  return {
    lead_message: lead,
    proposals,
    tradeoff_rows: buildDefaultTradeoff(totalKrw),
    sla_evidence: DEFAULT_SLA_EVIDENCE,
  }
}

function buildDefaultTradeoff(totalKrw: number): TradeoffRow[] {
  return [
    {
      label: '현재 (Baseline)',
      monthly_cost_krw: 35_000_000,
      availability_forecast: '99.94% (Web)',
      notes: '실측 SLI 기준',
    },
    {
      label: '권유안 채택 (P0+P1)',
      monthly_cost_krw: 35_000_000 - totalKrw,
      availability_forecast: '99.92% (예상)',
      notes: 'Error Budget 여유 내',
      is_recommended: true,
    },
    {
      label: '+ 예약 인스턴스 (RI 1년)',
      monthly_cost_krw: 35_000_000 - totalKrw - 420_000,
      availability_forecast: '99.92% (동일)',
      notes: '추가 절감 시뮬레이션',
    },
  ]
}

export function totalSavingsKrw(proposals: OptimizationProposal[]): number {
  return proposals.reduce((s, p) => s + p.monthly_savings_krw, 0)
}

export function filterByCategory(
  proposals: OptimizationProposal[],
  category: OptimizationCategory | 'all',
): OptimizationProposal[] {
  if (category === 'all') return proposals
  return proposals.filter((p) => p.category === category)
}

export function sortBySavings(proposals: OptimizationProposal[]): OptimizationProposal[] {
  return [...proposals].sort((a, b) => b.monthly_savings_krw - a.monthly_savings_krw)
}

export function slaImpactLabel(impact?: string): string {
  if (impact === 'none') return '영향 없음'
  if (impact === 'low') return '영향 미미'
  return '검토 필요'
}

export function slaImpactClass(impact?: string): string {
  if (impact === 'none') return 'bg-status-ok/10 text-status-ok border-status-ok/30'
  if (impact === 'low') return 'bg-brand/10 text-brand border-brand/30'
  return 'bg-status-warning/10 text-status-warning border-status-warning/30'
}

export function formatKrwCompact(value: number): string {
  if (value >= 10_000) {
    const man = Math.round(value / 10_000)
    return `월 ${man.toLocaleString('ko-KR')}만원`
  }
  return `월 ₩${value.toLocaleString('ko-KR')}`
}
