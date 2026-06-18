<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useIncidentHistoryQuery } from '@/features/incident';
import { DEMO_INCIDENTS } from '@/features/incident/fixtures';
import type { IncidentSummary } from '@/features/incident';

const router = useRouter();
const severityFilter = ref('');
const expandedId = ref<string | null>(null);

const { data: incidents, isLoading } = useIncidentHistoryQuery({ limit: 20 });

// API 데이터 없으면 fixtures 사용
const list = computed<IncidentSummary[]>(() => {
  if (incidents.value && incidents.value.length > 0) return incidents.value;
  return DEMO_INCIDENTS.filter(i => !severityFilter.value || i.severity === severityFilter.value);
});

// Incident 클릭 → Triage 결과 페이지로
const goToTriage = (id: string) => {
  router.push({ name: 'incident-triage', params: { incidentId: id } });
};

// 행 확장 토글
const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id;
};

const severityBadge = (sev: string | undefined | null) => ({
  critical: 'bg-status-critical/10 text-status-critical border-status-critical/30',
  warning:  'bg-status-warning/10 text-status-warning border-status-warning/30',
}[sev ?? ''] ?? 'bg-gray-100 text-gray-500 border-border');

const priorityBadge = (p: string | null | undefined) => ({
  Critical: 'bg-status-critical/10 text-status-critical',
  High:     'bg-orange-50 text-orange-600',
  Medium:   'bg-status-warning/10 text-status-warning',
  Low:      'bg-emerald-50 text-emerald-700',
}[p ?? ''] ?? 'bg-gray-100 text-gray-500');

const statusDisplay = (status: string) => ({
  open:     { text: '진행 중', cls: 'text-status-warning font-semibold' },
  resolved: { text: '해결됨',  cls: 'text-status-ok' },
  closed:   { text: '종료됨',  cls: 'text-gray-400' },
}[status] ?? { text: status, cls: 'text-gray-400' });

// 날짜 포맷
const fmtDate = (s: string | undefined | null) =>
  s ? new Date(s).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

// 소요 시간
const duration = (started?: string | null, resolved?: string | null) => {
  if (!started || !resolved) return null;
  const ms = new Date(resolved).getTime() - new Date(started).getTime();
  const min = Math.round(ms / 60000);
  return min < 60 ? `${min}분` : `${Math.round(min / 60)}시간 ${min % 60}분`;
};

// 타임라인 스텝
const TIMELINE_STEPS = [
  { label: '알람 수신',   key: 'alarm',    offset: 0 },
  { label: 'Triage 완료', key: 'triage',   offset: 38 },
  { label: 'RCA 완료',    key: 'rca',      offset: 240 },
  { label: '복구 승인',   key: 'approval', offset: 480 },
  { label: '복구 완료',   key: 'resolved', offset: 5580 },
];

const timelineForIncident = (inc: IncidentSummary) =>
  TIMELINE_STEPS.map(step => ({
    ...step,
    ts: inc.startedAt
      ? new Date(new Date(inc.startedAt).getTime() + step.offset * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '—',
    done: inc.status === 'resolved',
  }));
</script>

<template>
  <div class="py-8 px-8 max-w-7xl mx-auto">
    <!-- 헤더 -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <div class="text-xs font-bold text-brand uppercase tracking-widest mb-1">장애 대응 · Page 5</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">Incident 이력</h1>
        <p class="text-gray-500 mt-1 text-sm">탐지부터 복구까지 전체 처리 흐름</p>
      </div>
      <div class="text-xs text-gray-400">30초마다 자동 갱신</div>
    </div>

    <!-- 필터 -->
    <div class="flex gap-2 mb-5">
      <button v-for="f in [['','전체'],['critical','위험'],['warning','경고']]" :key="f[0]"
        class="px-3 py-1.5 text-xs font-bold rounded-md transition-colors"
        :class="severityFilter === f[0] ? 'bg-brand text-white' : 'bg-bg-card border border-border text-gray-500 hover:border-brand'"
        @click="severityFilter = f[0]"
      >{{ f[1] }}</button>
    </div>

    <div v-if="isLoading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-14 bg-gray-100 animate-pulse rounded-lg"></div>
    </div>

    <div v-else class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 border-b border-border">
            <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">탐지 시각</th>
            <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">서비스</th>
            <th class="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">제목</th>
            <th class="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">심각도</th>
            <th class="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">우선순위</th>
            <th class="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">상태</th>
            <th class="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">처리 시간</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="inc in list" :key="inc.id">
            <tr class="border-b border-border hover:bg-gray-50 transition-colors cursor-pointer" @click="toggleExpand(inc.id)">
              <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ fmtDate(inc.startedAt) }}</td>
              <td class="px-4 py-3 text-sm text-text-secondary">{{ inc.serviceName }}</td>
              <td class="px-4 py-3">
                <div class="text-sm font-semibold text-text-primary">{{ inc.title }}</div>
                <div class="text-xs font-mono text-gray-400 mt-0.5">{{ inc.id }}</div>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border" :class="severityBadge(inc.severity)">
                  {{ (inc.severity ?? '').toUpperCase() }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span v-if="inc.triagePriority" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold" :class="priorityBadge(inc.triagePriority)">
                  {{ inc.triagePriority }}
                </span>
                <span v-else class="text-gray-300 text-xs">—</span>
              </td>
              <td class="px-4 py-3 text-center text-xs" :class="statusDisplay(inc.status).cls">
                {{ statusDisplay(inc.status).text }}
              </td>
              <td class="px-4 py-3 text-right font-mono text-xs text-gray-500">
                {{ duration(inc.startedAt, inc.resolvedAt) ?? (inc.status === 'open' ? '진행 중' : '—') }}
              </td>
              <td class="px-4 py-3 text-right">
                <button class="text-xs text-brand font-bold hover:underline" @click.stop="goToTriage(inc.id)">Triage →</button>
              </td>
            </tr>
            <!-- 타임라인 확장 행 -->
            <tr v-if="expandedId === inc.id" class="bg-gray-50 border-b border-border">
              <td colspan="8" class="px-6 py-4">
                <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">처리 타임라인</div>
                <div class="flex items-center gap-0">
                  <template v-for="(step, i) in timelineForIncident(inc)" :key="step.key">
                    <div class="flex flex-col items-center min-w-0">
                      <div class="w-3 h-3 rounded-full border-2" :class="step.done ? 'bg-brand border-brand' : 'border-gray-300 bg-white'"></div>
                      <div class="text-xs font-semibold text-text-primary mt-1 text-center">{{ step.label }}</div>
                      <div class="font-mono text-xs text-gray-400">{{ step.ts }}</div>
                    </div>
                    <div v-if="i < timelineForIncident(inc).length - 1" class="flex-1 h-px bg-border mx-1"></div>
                  </template>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
