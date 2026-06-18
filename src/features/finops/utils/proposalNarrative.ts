import type { BacklogItem, FinOpsFinding, OptimizationCategory, OptimizationProposal } from '../types/finops.schema'

const CATEGORY_LABELS: Record<OptimizationCategory, string> = {
  rightsizing: 'RightSizing',
  unused: '미사용 자원',
  scheduling: '파워 스케줄링',
  reserved: '예약 인스턴스',
}

const PATTERN_CATEGORY: Record<string, OptimizationCategory> = {
  idle_ec2_cpu: 'unused',
  overprovision_ec2: 'rightsizing',
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

function patternToCategory(patternId?: string, action?: string): OptimizationCategory {
  if (patternId && PATTERN_CATEGORY[patternId]) return PATTERN_CATEGORY[patternId]
  if (action && ACTION_CATEGORY[action]) return ACTION_CATEGORY[action]
  return 'rightsizing'
}

function formatKrwCompact(value: number): string {
  if (value >= 10_000) {
    const man = Math.round(value / 10_000)
    return `월 ${man.toLocaleString('ko-KR')}만원`
  }
  return `월 ₩${value.toLocaleString('ko-KR')}`
}

const PATTERN_LABELS: Record<string, string> = {
  idle_ec2_cpu: 'EC2 유휴',
  overprovision_ec2: 'EC2 과잉 프로비저닝',
  idle_ebs_unattached: '미연결 EBS',
  idle_nat_gateway: 'NAT 저트래픽',
  overprovision_rds: 'RDS 과잉 프로비저닝',
  k8s_overprovision: 'K8s 리소스 과다 요청',
}

const ACTION_LABELS: Record<string, string> = {
  stop: '중지',
  delete: '삭제',
  downsize: '다운사이즈',
  schedule: '스케줄 운영',
  resize: '용량 조정',
  optimize: '최적화',
}

const ACTION_DETAIL: Record<string, string> = {
  stop: '인스턴스를 중지해 컴퓨팅 비용을 없앱니다. 스토리지·연결 리소스 비용은 별도입니다.',
  delete: '미사용 리소스를 삭제해 관련 비용을 제거합니다.',
  downsize: '인스턴스 클래스·용량을 축소해 과잉 프로비저닝 비용을 줄입니다.',
  schedule: '업무 시간 외 중지·축소 스케줄을 적용해 운영 비용을 줄입니다.',
  resize: '실제 사용량에 맞게 용량을 재조정합니다.',
  optimize: '이용 패턴에 맞게 리소스를 최적화합니다.',
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  ec2: 'EC2 인스턴스',
  rds: 'RDS 데이터베이스',
  ebs: 'EBS 볼륨',
  nat: 'NAT Gateway',
  alb: 'Application Load Balancer',
  elb: '로드 밸런서',
  k8s: 'Kubernetes 워크로드',
}

export interface ProposalNarrative {
  resourceId: string
  resourceTypeLabel: string
  patternLabel: string | null
  categoryLabel: string
  actionLabel: string
  actionKey: string
  /** 카드 주제목 — 예: RDS 다운사이즈 */
  headline: string
  /** 한 문장 제안 요약 */
  summary: string
  /** 관측·탐지 근거 — 어떤 문제인지 */
  problemStatement: string
  /** 조치 시 기대 효과 */
  expectedOutcome: string
}

function inferResourceType(
  resourceId: string,
  resourceType?: string | null,
): string {
  const t = (resourceType ?? '').toLowerCase()
  if (t) return t
  const id = resourceId.toLowerCase()
  if (id.startsWith('i-')) return 'ec2'
  if (id.startsWith('db-') || id.includes('rds')) return 'rds'
  if (id.startsWith('vol-')) return 'ebs'
  if (id.includes('nat')) return 'nat'
  if (id.includes('alb') || id.includes('elb')) return 'alb'
  return 'resource'
}

export function resourceTypeLabel(resourceId: string, resourceType?: string | null): string {
  const key = inferResourceType(resourceId, resourceType)
  return RESOURCE_TYPE_LABELS[key] ?? key.toUpperCase()
}

export function actionLabel(action?: string | null): string {
  if (!action) return '최적화'
  return ACTION_LABELS[action.toLowerCase()] ?? action
}

export function patternLabel(patternId?: string | null): string | null {
  if (!patternId) return null
  return PATTERN_LABELS[patternId] ?? patternId.replace(/_/g, ' ')
}

/** BE 판정 문자열·evidence를 운영자가 읽을 수 있는 문장으로 변환 */
export function humanizeFindingReason(finding: FinOpsFinding): string | null {
  const fromReason = humanizeReasonString(finding.reason, finding)
  if (fromReason) return fromReason
  return formatEvidenceSentence(finding)
}

function humanizeReasonString(
  reason: string | null | undefined,
  finding: FinOpsFinding,
): string | null {
  if (!reason?.trim()) return null

  const r = reason.trim()
  const ev = finding.evidence ?? finding.utilization ?? {}
  const days =
    typeof ev.days_observed === 'number'
      ? ev.days_observed
      : r.match(/\((\d+)d\)/)?.[1] ?? 7

  let m = r.match(/RDS CPU avg ([\d.]+)%\s*<\s*([\d.]+)%/i)
  if (m) {
    const actual = parseFloat(m[1])
    const thr = parseFloat(m[2])
    return (
      `최근 ${days}일 동안 데이터베이스 CPU 사용률 평균이 ${actual.toFixed(1)}%에 그쳤습니다. ` +
      `일반적으로 ${thr}% 미만이면 인스턴스 스펙이 과하게 잡혀 있다는 뜻이며, ` +
      `더 작은 클래스로 줄여도 성능에 문제가 없을 가능성이 큽니다.`
    )
  }

  m = r.match(/CPU p95 ([\d.]+)%\s*<\s*([\d.]+)%/i)
  if (m) {
    const actual = parseFloat(m[1])
    const thr = parseFloat(m[2])
    return (
      `최근 ${days}일 동안 서버 CPU가 거의 사용되지 않았습니다 ` +
      `(대부분의 시간대 기준 ${actual.toFixed(1)}%, 유휴 판정 기준 ${thr}% 미만). ` +
      `유휴 인스턴스로 보이므로 중지를 검토할 수 있습니다.`
    )
  }

  if (/EBS 미연결/i.test(r) || r === 'EBS 미연결 상태') {
    return '디스크(EBS)가 어떤 서버에도 연결되어 있지 않습니다. 데이터가 없는 볼륨은 스토리지 비용만 발생하므로 삭제를 검토합니다.'
  }

  m = r.match(/NAT egress ([\d.]+)\s*GB\/day/i)
  if (m) {
    const gb = parseFloat(m[1])
    return (
      `NAT Gateway를 통한 하루 트래픽이 약 ${gb.toFixed(2)} GB에 불과합니다. ` +
      `시간당 고정 요금 대비 활용이 낮아 구조 변경 또는 삭제를 검토합니다.`
    )
  }

  if (/저트래픽/.test(r)) {
    return '네트워크 트래픽이 매우 적어 NAT Gateway 유지 비용 대비 효율이 낮습니다.'
  }

  // 이미 읽기 쉬운 한국어 문장이면 그대로 사용
  if (!/[<>]/.test(r) && !/\b(p95|avg|egress)\b/i.test(r)) return r

  return null
}

function formatEvidenceSentence(finding: FinOpsFinding): string | null {
  const ev = finding.evidence ?? finding.utilization
  if (!ev) return null

  const pid = finding.pattern_id ?? ''
  const cpuP95 = ev.cpu_p95 ?? ev.cpu_p95_pct
  const cpuAvg = ev.cpu_avg ?? ev.cpu_avg_pct
  const threshold = ev.threshold
  const attached = ev.attached
  const egress = ev.egress_gb_per_day

  if (pid === 'idle_ec2_cpu' && cpuP95 != null) {
    const thr = threshold ?? 5
    const val = Number(cpuP95).toFixed(1)
    return (
      `최근 관측 기간 동안 서버 CPU가 거의 사용되지 않았습니다 ` +
      `(대부분의 시간대 기준 ${val}%, 유휴 판정 기준 ${thr}% 미만).`
    )
  }
  if (pid === 'overprovision_rds' && cpuAvg != null) {
    const thr = threshold ?? 20
    const val = Number(cpuAvg).toFixed(1)
    return (
      `데이터베이스 CPU 사용률 평균이 ${val}%로 낮습니다. ` +
      `일반적으로 ${thr}% 미만이면 스펙이 과하게 잡혀 있다는 뜻입니다.`
    )
  }
  if (pid === 'idle_ebs_unattached' || attached === false) {
    return 'EBS 볼륨이 어떤 인스턴스에도 연결되어 있지 않아 스토리지 비용만 발생하고 있습니다.'
  }
  if (pid === 'idle_nat_gateway' && egress != null) {
    return `NAT Gateway 일일 송신량이 ${Number(egress).toFixed(2)} GB로 매우 낮아, 고정 요금 대비 비효율적입니다.`
  }
  if (pid === 'k8s_overprovision') {
    const ratio = ev.request_vs_usage_ratio
    if (ratio != null) {
      return `컨테이너에 예약해 둔 자원(request)이 실제 사용량의 ${Number(ratio).toFixed(1)}배로, 과다 설정되어 있습니다.`
    }
  }

  return null
}

function buildProblemFromPattern(finding: FinOpsFinding): string {
  const rid = finding.resource_id
  const typeLabel = resourceTypeLabel(rid, finding.resource_type)
  const pat = patternLabel(finding.pattern_id)
  const detail = humanizeFindingReason(finding)

  const intro = pat
    ? `${typeLabel} ${rid}에서 ${pat} 징후가 감지되었습니다.`
    : `${typeLabel} ${rid}에서 비용 낭비 징후가 감지되었습니다.`

  if (detail) return `${intro} ${detail}`
  return `${intro} 이용률·연결 상태를 분석한 결과 비용 절감 여지가 있습니다.`
}

export function plainProblemStatement(finding: FinOpsFinding | null, proposal: OptimizationProposal): string {
  if (finding) return problemStatementFromFinding(finding)
  const act = actionLabel(proposal.recommended_action)
  const rid = proposal.resource_id ?? proposal.service_name
  const typeLabel = resourceTypeLabel(rid)
  return `${typeLabel} \`${rid}\`에 대해 ${act} 조치를 검토할 수 있습니다.`
}

export function resolveProposalNarrative(
  finding: FinOpsFinding | null,
  proposal: OptimizationProposal,
): ProposalNarrative {
  const resourceId = finding?.resource_id ?? proposal.resource_id ?? proposal.service_name
  const resourceType = finding?.resource_type ?? proposal.category
  const actionKey = (finding?.recommended_action ?? proposal.recommended_action ?? 'optimize').toLowerCase()
  const actLabel = actionLabel(actionKey)
  const typeLabel = resourceTypeLabel(resourceId, resourceType)
  const patLabel = patternLabel(finding?.pattern_id)
  const category = patternToCategory(finding?.pattern_id, actionKey)
  const categoryLabel = CATEGORY_LABELS[category]
  const savings = formatKrwCompact(proposal.monthly_savings_krw)

  const headline = patLabel
    ? `${patLabel} · ${actLabel}`
    : `${categoryLabel} · ${actLabel}`

  const problemStatement = plainProblemStatement(finding, proposal)

  const actionDetail = ACTION_DETAIL[actionKey] ?? ACTION_DETAIL.optimize
  const expectedOutcome = `권장 조치 **${actLabel}** 적용 시 월 약 ${savings} 절감이 예상됩니다. ${actionDetail}`

  const summary = finding?.guard_status === 'blocked' || finding?.guard_status === 'defer'
    ? `${typeLabel} ${resourceId} — ${actLabel} 제안이 있으나 SLA·정책 검토가 필요합니다.`
    : `${typeLabel} ${resourceId}에 ${actLabel}을 적용하면 월 약 ${savings}을 절감할 수 있습니다. ${actionDetail}`

  return {
    resourceId,
    resourceTypeLabel: typeLabel,
    patternLabel: patLabel,
    categoryLabel,
    actionLabel: actLabel,
    actionKey,
    headline,
    summary: summary.replace(/\*\*/g, ''),
    problemStatement,
    expectedOutcome: expectedOutcome.replace(/\*\*/g, ''),
  }
}

export function proposalHeadlineFromFinding(finding: FinOpsFinding): string {
  const typeLabel = resourceTypeLabel(finding.resource_id, finding.resource_type)
  const actLabel = actionLabel(finding.recommended_action)
  const patLabel = patternLabel(finding.pattern_id)

  if (finding.guard_status === 'blocked' || finding.guard_status === 'defer') {
    const subject = patLabel ?? typeLabel
    return `${subject} · SLA 검토`
  }
  return patLabel ? `${patLabel} · ${actLabel}` : `${typeLabel} · ${actLabel}`
}

export function proposalHeadlineFromBacklog(item: BacklogItem): string {
  const typeLabel = resourceTypeLabel(item.resource_id, item.resource_type)
  const actLabel = actionLabel(item.recommended_action)
  const patLabel = patternLabel(item.pattern_id)
  return patLabel ? `${patLabel} · ${actLabel}` : `${typeLabel} · ${actLabel}`
}

export function proposalResourceId(
  finding: FinOpsFinding | null,
  proposal: OptimizationProposal,
): string {
  return finding?.resource_id ?? proposal.resource_id ?? proposal.service_name
}

/** 제안 목록·카드용 짧은 제목 (리소스 ID 제외) */
export function proposalTitleFromFinding(finding: FinOpsFinding): string {
  return proposalHeadlineFromFinding(finding)
}

export function problemStatementFromFinding(finding: FinOpsFinding): string {
  return buildProblemFromPattern(finding).replace(/\*\*/g, '')
}

/** 제안 목록·카드용 짧은 제목 (finding + proposal, 리소스 ID 제외) */
export function proposalDisplayTitle(
  finding: FinOpsFinding | null,
  proposal: OptimizationProposal,
): string {
  if (finding) return proposalHeadlineFromFinding(finding)
  return resolveProposalNarrative(finding, proposal).headline
}
