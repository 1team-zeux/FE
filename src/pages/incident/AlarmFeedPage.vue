<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAlarmFeedQuery } from '@/features/incident';
import { DEMO_FEED_GROUPS } from '@/features/incident/fixtures';
import AlarmGroupRow from '@/features/incident/components/AlarmGroupRow.vue';
import type { AlarmGroup } from '@/features/incident';

const router = useRouter();
const { data: feedData, isLoading } = useAlarmFeedQuery();

// API가 평면 알람 배열을 반환하면 correlationGroupId 기준으로 그룹화한다
// API 데이터 없거나 비어있으면 데모 그룹 사용
const groups = computed<AlarmGroup[]>(() => {
  if (!feedData.value || feedData.value.length === 0) {
    return DEMO_FEED_GROUPS;
  }
  // 평면 배열 → group으로 묶기
  const byGroup = new Map<string, AlarmGroup>();
  for (const alarm of feedData.value) {
    const gid = alarm.correlationGroupId ?? alarm.id;
    if (!byGroup.has(gid)) {
      byGroup.set(gid, {
        ...alarm,
        alarms: [],
        alarmCount: 0,
      } as AlarmGroup);
    }
    const group = byGroup.get(gid)!;
    if (alarm.status !== 'merged') {
      // 대표 알람의 메타 (status, priority)는 첫 non-merged로
      Object.assign(group, {
        status: alarm.status,
        triage_priority: alarm.triage_priority,
        severity: alarm.severity,
        ts: alarm.ts,
      });
    }
    group.alarms.push(alarm);
    group.alarmCount = group.alarms.length;
  }
  return Array.from(byGroup.values());
});
</script>

<template>
  <div class="py-8 px-8">
    <!-- 헤더 -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <div class="text-xs font-bold text-brand uppercase tracking-widest mb-1">장애 대응 · Page 1</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">알람 피드</h1>
        <p class="text-gray-500 mt-1 text-sm">실시간 알람 수신 및 Triage 처리 상태 — 1행 = 1 correlation group</p>
      </div>
      <div class="flex flex-col items-end gap-2 shrink-0">
        <div class="flex items-center gap-2 text-xs text-gray-400">
          <span class="w-2 h-2 rounded-full bg-brand animate-pulse inline-block"></span>
          5초마다 자동 갱신
        </div>
        <button
          class="text-xs text-gray-500 hover:text-brand hover:underline"
          @click="router.push({ name: 'incident-compare-demo' })"
        >
          데모 시나리오 비교 보기 →
        </button>
      </div>
    </div>

    <!-- 안내 배너 -->
    <div class="bg-brand/5 border border-brand/20 rounded-lg px-4 py-3 mb-5 flex items-center gap-3">
      <svg class="w-4 h-4 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p class="text-xs text-gray-600">
        같은 서비스에서 동시에 발생한 알람들은 자동으로 하나의 그룹으로 묶입니다.
        행을 클릭하면 그룹 내 알람 전체(metric · log · trace)가 펼쳐지고,
        서비스명을 클릭하면 해당 incident의 Triage 결과로 이동합니다.
      </p>
    </div>

    <div v-if="isLoading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-14 bg-gray-100 animate-pulse rounded-lg"></div>
    </div>

    <div v-else class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <!-- 컬럼 헤더 -->
      <div class="bg-gray-50 border-b border-border px-4 py-3 flex items-center gap-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <span class="w-3.5 shrink-0"></span>
        <span class="w-20 shrink-0">시각</span>
        <span class="flex-1 min-w-0">서비스 · 그룹</span>
        <span class="shrink-0">Severity</span>
        <span class="shrink-0">알람 수</span>
        <span class="w-28 text-right shrink-0">상태</span>
        <span class="w-20 text-center shrink-0">우선순위</span>
      </div>

      <!-- 그룹 행 -->
      <AlarmGroupRow
        v-for="g in groups"
        :key="g.id"
        :group="g"
      />

      <div v-if="groups.length === 0" class="px-4 py-12 text-center text-sm text-gray-400">
        수신된 알람 없음
      </div>
    </div>
  </div>
</template>
