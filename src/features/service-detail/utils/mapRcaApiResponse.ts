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
  };
}
