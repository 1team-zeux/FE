import type { Incident } from '../types/incident.schema';

type RcaHint = {
  cause_type?: string;
  confidence?: number;
  rationale?: string;
  evidence_refs?: Array<{ type?: string; ref?: string }>;
  blocks_auto_recovery?: boolean;
};

type RcaApiResult = {
  root_cause_type?: string | null;
  root_cause_summary?: string | null;
  confidence_score?: number;
  recommendation?: string | null;
  hints?: RcaHint[];
  evidences?: Array<{
    evidence_type?: string;
    evidence_summary?: string;
  }>;
};

type RcaApiPayload = {
  incident_id?: string | null;
  service_id?: string;
  count?: number;
  results?: RcaApiResult[];
};

const CAUSE_LABELS: Record<string, string> = {
  db_saturation: 'DB 포화 / RDS 부하',
  error_burst: '에러 급증 (5xx burst)',
  api_dependency_slowdown: 'API 의존 지연',
  memory_pressure: '메모리 압박',
  network_latency: '네트워크 지연',
  pod_restart_storm: 'Pod 재시작 급증',
  cpu_saturation: 'CPU 포화',
  unknown: '원인 불명',
};

function hintProbability(hint: RcaHint): number {
  const raw = hint.confidence ?? 0;
  return Math.round(Math.min(100, raw <= 1 ? raw * 100 : raw));
}

function hintEvidenceLines(hint: RcaHint): string[] {
  const lines: string[] = [];
  if (hint.rationale) lines.push(hint.rationale);
  for (const ref of hint.evidence_refs ?? []) {
    if (ref.ref) lines.push(`${ref.type ?? 'evidence'}: ${ref.ref}`);
  }
  return lines.length ? lines : ['근거 데이터 없음'];
}

function extractHints(result: RcaApiResult): RcaHint[] {
  if (result.hints?.length) return result.hints;

  const fromEvidences: RcaHint[] = [];
  for (const ev of result.evidences ?? []) {
    if (ev.evidence_type !== 'rca_hint' || !ev.evidence_summary) continue;
    try {
      const parsed = JSON.parse(ev.evidence_summary) as RcaHint;
      if (parsed.cause_type) fromEvidences.push(parsed);
    } catch {
      // ignore
    }
  }
  if (fromEvidences.length) return fromEvidences;

  return [
    {
      cause_type: result.root_cause_type ?? 'unknown',
      confidence: (result.confidence_score ?? 0) / 100,
      rationale: result.root_cause_summary ?? undefined,
    },
  ];
}

function buildSummary(result: RcaApiResult | undefined, sorted: RcaHint[], svcId: string): string {
  if (!result) return '';

  const topCause = sorted[0];
  const causeLabel = topCause ? (CAUSE_LABELS[topCause.cause_type ?? ''] ?? topCause.cause_type ?? '알 수 없는 원인') : '알 수 없는 원인';
  const confidence = topCause ? hintProbability(topCause) : 0;

  const lines: string[] = [];

  // 1. 상황 요약
  if (result.root_cause_summary) {
    lines.push(result.root_cause_summary);
  } else {
    lines.push(`${svcId} 서비스에서 이상 징후가 감지되었습니다. AI 분석 결과 주요 원인은 **${causeLabel}** (신뢰도 ${confidence}%)으로 판단됩니다.`);
  }

  // 2. 핵심 근거
  const evidenceLines = topCause ? hintEvidenceLines(topCause) : [];
  if (evidenceLines.length && evidenceLines[0] !== '근거 데이터 없음') {
    lines.push(`\n근거: ${evidenceLines.slice(0, 2).join(' / ')}`);
  }

  // 3. 권고 조치
  if (result.recommendation) {
    lines.push(`\n권고 조치: ${result.recommendation}`);
  } else if (topCause?.rationale && topCause.rationale !== result.root_cause_summary) {
    lines.push(`\n권고 조치: ${topCause.rationale}`);
  }

  return lines.join('');
}

export function mapRcaApiToIncident(payload: RcaApiPayload, svcId: string): Incident {
  const result = payload.results?.[0];
  const hints = result ? extractHints(result) : [];
  const sorted = [...hints].sort((a, b) => hintProbability(b) - hintProbability(a));

  return {
    incidentId: payload.incident_id ?? `RCA-${svcId}`,
    title: `${svcId} — AI Root Cause Analysis`,
    severity: sorted[0] && hintProbability(sorted[0]) >= 70 ? 'critical' : 'warning',
    detectedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    resolvedAt: null,
    symptoms: [],
    relatedAlarms: [],
    candidates: sorted.map((hint, idx) => ({
      rank: idx + 1,
      description: CAUSE_LABELS[hint.cause_type ?? ''] ?? hint.cause_type ?? 'unknown',
      probability: hintProbability(hint),
      evidence: hintEvidenceLines(hint),
      recommendedActions: hint.rationale ? [hint.rationale] : [],
    })),
    timeline: [
      { ts: '—', event: 'RCA zeux persist 결과 로드', type: 'rca' as const },
    ],
    summary: buildSummary(result, sorted, svcId),
  };
}
