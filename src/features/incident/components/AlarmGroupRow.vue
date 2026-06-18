<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { AlarmGroup } from '../types/incident.schema';
import AlarmDetailItem from './AlarmDetailItem.vue';

// AlarmGroup + cap 정책 메타 (선택)
type AlarmGroupWithCap = AlarmGroup & {
  totalReceived?: number;
  groupedCount?: number;
  overflowCount?: number;
  capApplied?: boolean;
};

const props = defineProps<{
  group: AlarmGroupWithCap;
  /** 기본 펼침 여부 (TriagePage에서 펼친 상태로 사용) */
  defaultOpen?: boolean;
}>();

const router = useRouter();

// 그룹명 클릭 → Triage 페이지로 이동 (details 토글 막기)
const goToTriage = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
  router.push({
    name: 'incident-triage',
    params: { incidentId: props.group.correlationGroupId ?? props.group.id },
  });
};

// severity 배지
const severityBadge = (sev: string) => ({
  critical: 'bg-status-critical/10 text-status-critical border-status-critical/30',
  warning:  'bg-status-warning/10 text-status-warning border-status-warning/30',
  info:     'bg-gray-100 text-gray-500 border-border',
}[sev] ?? 'bg-gray-100 text-gray-500 border-border');

// priority 배지
const priorityBadge = (p: string | null | undefined) => ({
  Critical: 'bg-status-critical/10 text-status-critical border-status-critical/30',
  High:     'bg-orange-50 text-orange-600 border-orange-300',
  Medium:   'bg-status-warning/10 text-status-warning border-status-warning/30',
  Low:      'bg-emerald-50 text-emerald-700 border-emerald-200',
}[p ?? ''] ?? '');

// 상태 → 표시 텍스트
const statusDisplay = (status: string) => ({
  receiving:      { text: '● 수신됨',         cls: 'text-gray-500' },
  grouping:       { text: '● 그룹핑 중',      cls: 'text-status-warning animate-pulse' },
  triage_running: { text: '⟳ Triage 진행 중', cls: 'text-brand animate-pulse' },
  triage_done:    { text: '✓ Triage 완료',    cls: 'text-status-ok font-semibold' },
  rca_started:    { text: 'RCA 진입됨',       cls: 'text-brand font-bold' },
  noise:          { text: '— 노이즈',          cls: 'text-gray-400 line-through' },
}[status] ?? { text: '● 수신됨', cls: 'text-gray-500' });
</script>

<template>
  <details
    :open="defaultOpen"
    class="border-b border-border last:border-b-0 group"
  >
    <!-- 요약 줄 (접힌 상태에서 보이는 헤더) -->
    <summary class="cursor-pointer select-none px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3">
      <!-- 화살표 (custom: details의 기본 ▶ 숨기고 SVG로 표시) -->
      <svg class="w-3.5 h-3.5 text-gray-400 transition-transform group-open:rotate-90 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
      </svg>

      <!-- 시각 -->
      <span class="font-mono text-xs text-gray-500 w-20 shrink-0">{{ group.ts }}</span>

      <!-- 서비스명 (클릭 → Triage 페이지로 이동) -->
      <button
        class="text-sm font-bold text-text-primary hover:text-brand text-left flex-1 min-w-0 truncate"
        @click="goToTriage"
      >
        {{ group.serviceName }}
      </button>

      <!-- severity 배지 -->
      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border shrink-0" :class="severityBadge(group.severity)">
        {{ group.severity.toUpperCase() }}
      </span>

      <!-- 알람 개수 (목록은 단순 표시 — cap 메타는 펼친 본문에서만) -->
      <span class="text-xs text-gray-500 shrink-0">
        알람 <span class="font-bold text-text-primary">{{ group.alarmCount ?? group.alarms.length }}</span>개
      </span>

      <!-- 상태 -->
      <span class="text-xs w-28 shrink-0 text-right" :class="statusDisplay(group.status).cls">
        {{ statusDisplay(group.status).text }}
      </span>

      <!-- triage priority 배지 -->
      <span
        v-if="group.triage_priority"
        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border w-20 justify-center shrink-0"
        :class="priorityBadge(group.triage_priority)"
      >
        {{ group.triage_priority }}
      </span>
      <span v-else class="text-xs text-gray-300 w-20 text-center shrink-0">—</span>
    </summary>

    <!-- 펼친 상태에서 보이는 알람 상세 목록 -->
    <div class="bg-bg-muted pl-12 pr-4 pb-3">
      <div class="text-xs text-gray-500 px-4 pt-3 pb-1 font-semibold uppercase tracking-wider">
        이 그룹에 묶인 알람 — 노출 {{ group.alarms.length }}건<span v-if="group.capApplied"> / 그룹 묶음 {{ group.groupedCount }}건 / overflow {{ group.overflowCount }}건</span>
      </div>
      <AlarmDetailItem v-for="alarm in group.alarms" :key="alarm.id" :alarm="alarm" />

      <!-- cap 정책 안내 박스 -->
      <div v-if="group.capApplied" class="mx-4 my-3 border-2 border-amber-300 bg-amber-50 rounded p-3">
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2 py-0.5 text-xs font-bold rounded bg-amber-600 text-white">100건 CAP</span>
          <span class="text-sm font-bold text-amber-800">알람 폭증 안전장치</span>
        </div>
        <div class="text-xs text-gray-700">
          외 {{ Math.max(0, (group.groupedCount ?? 0) - group.alarms.length) }}건 그룹 합류 + {{ group.overflowCount }}건 cap overflow (카운트만 누적, 본문 폐기) — 분석 비용 일정 유지.
        </div>
      </div>

      <div class="mt-3 px-4">
        <button
          class="text-xs font-bold text-brand hover:underline"
          @click="goToTriage"
        >
          이 incident의 Triage 결과 보기 →
        </button>
      </div>
    </div>
  </details>
</template>

<style scoped>
/* details 기본 ▶ 마커 제거 */
details > summary::-webkit-details-marker { display: none; }
details > summary { list-style: none; }
</style>
