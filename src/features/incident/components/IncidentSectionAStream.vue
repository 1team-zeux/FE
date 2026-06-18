<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { ArrivingAlarm, ServiceMapData, TriggerAlarm } from '../fixtures/triage-blueprints';
import ServiceMap from '@/features/sla/components/ServiceMap.vue';

const props = defineProps<{
  trigger: TriggerAlarm;
  /** 실제 webhook 도착 시각 (있으면 fixture trigger.ts 대신 사용 + arrivals 도 sync) */
  overrideTriggerTs?: string;
  severityStrategy: string;
  windowDurationLabel: string;
  arrivingAlarms: ArrivingAlarm[];
  representativeSeverity: 'critical' | 'warning' | 'info';
  groupConfirmed: boolean;
  elapsedDisplayMs: number;
  step1DisplayMs: number;
  isActive: boolean;
  serviceMap: ServiceMapData;
  totalReceived: number;
  groupedCount: number;
  overflowCount: number;
  capApplied: boolean;
  /** TRIGGER 외 대표 알람으로 강조할 alertName 목록 */
  representativeAlertNames?: string[];
}>();

// 표시할 트리거 시각 — override 있으면 그것, 없으면 fixture
const triggerDisplayTs = computed(() => props.overrideTriggerTs ?? props.trigger.ts);

// arriving 알람 ts 표시 — live override 시 trigger 시점에서 1초 간격으로 계산
const arrivingDisplayTs = (idx: number, fixtureTs: string): string => {
  if (!props.overrideTriggerTs) return fixtureTs;
  // overrideTriggerTs = HH:MM:SS — i+1 초 더해 표시
  const parts = props.overrideTriggerTs.split(':').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return fixtureTs;
  let [h, m, s] = parts;
  s += idx + 1;
  m += Math.floor(s / 60); s %= 60;
  h += Math.floor(m / 60); m %= 60;
  h %= 24;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// 누적 윈도우 표시 시간
const cappedElapsedMs = computed(() => Math.min(props.elapsedDisplayMs, props.step1DisplayMs));
const formatMs = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}초`;
  return `${min}분 ${sec}초`;
};
const elapsedLabel = computed(() => formatMs(cappedElapsedMs.value));
const progress = computed(() => Math.min(1, cappedElapsedMs.value / Math.max(1, props.step1DisplayMs)));

// severity 배지 — 위험도 축 3단계 (critical / warning / neutral)
const severityBadge = (sev: 'critical' | 'warning' | 'info'): string => {
  if (sev === 'critical') return 'bg-status-critical text-white border-status-critical';
  if (sev === 'warning')  return 'bg-status-warning text-white border-status-warning';
  return 'bg-gray-500 text-white border-gray-500';
};
const severityLabel = (sev: 'critical' | 'warning' | 'info'): string =>
  sev === 'critical' ? 'CRITICAL' : sev === 'warning' ? 'WARNING' : 'INFO';

const repSeverityLabel = computed(() => severityLabel(props.representativeSeverity));

// 알람 카테고리 분류 — alertName prefix 기반
const categorize = (alertName: string): string => {
  if (alertName.startsWith('HighCPU')) return 'CPU';
  if (alertName.startsWith('HighMemory')) return 'Memory';
  if (alertName.startsWith('HighLatency')) return 'Latency';
  if (alertName.startsWith('ALB')) return 'ALB';
  if (alertName.startsWith('HighRequestRate')) return 'Traffic';
  if (alertName.startsWith('ErrorRate')) return 'Error';
  if (alertName.startsWith('QueueDepth')) return 'Queue';
  if (alertName.includes('Spot')) return 'CPU';
  if (alertName.includes('Gc')) return 'Latency';
  if (alertName.includes('Heap')) return 'Memory';
  return '기타';
};

// 대표 / 나머지 분리
const representativeArrivings = computed<ArrivingAlarm[]>(() => {
  const names = props.representativeAlertNames ?? [];
  if (names.length === 0) return [];
  return props.arrivingAlarms.filter(a => names.includes(a.alertName));
});
const otherArrivings = computed<ArrivingAlarm[]>(() => {
  const names = props.representativeAlertNames ?? [];
  if (names.length === 0) return props.arrivingAlarms;
  return props.arrivingAlarms.filter(a => !names.includes(a.alertName));
});

// 나머지 알람 메트릭별 집계
const otherSummary = computed<Array<{ category: string; count: number }>>(() => {
  const map = new Map<string, number>();
  for (const a of otherArrivings.value) {
    const cat = categorize(a.alertName);
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([category, count]) => ({ category, count }));
});

// 자동 스크롤 — 전체 토글 펼친 상태에서 새 알람 시
const scrollEl = ref<HTMLElement | null>(null);
watch(
  () => props.arrivingAlarms.length,
  async () => {
    await nextTick();
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
  },
);
</script>

<template>
  <div class="rounded-xl border border-border bg-bg-elev shadow-sm overflow-hidden">
    <!-- 헤더 — 진행 + 윈도우 누적 -->
    <div class="px-5 py-3 border-b border-border bg-bg-card">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="isActive ? 'bg-brand animate-pulse' : groupConfirmed ? 'bg-status-ok' : 'bg-gray-300'"
          />
          <span class="text-sm font-semibold text-text-primary">
            {{ isActive ? '알람 수신 & 그룹화 중' : groupConfirmed ? '그룹 확정' : '대기' }}
          </span>
        </div>
        <div class="text-xs text-text-secondary flex items-center gap-2">
          <span>윈도우</span>
          <span class="font-mono font-bold text-text-primary text-sm">{{ elapsedLabel }}</span>
        </div>
      </div>

      <!-- 진행 바 -->
      <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full bg-brand transition-all duration-200" :style="{ width: `${progress * 100}%` }" />
      </div>
    </div>

    <!-- 본문 — 2열 (좌: 그룹화 흐름 / 우: 서비스 맵) -->
    <div class="px-5 py-5 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-bg-card/30">
      <!-- 좌측: 알람 그룹화 흐름 (여백 위주, 강조는 TRIGGER 하나만) -->
      <div class="space-y-6">
        <!-- TRIGGER 알람 박스 (이 화면의 유일한 강조) -->
        <div class="border-2 rounded-lg p-4 bg-status-critical/5 border-status-critical/40">
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <span class="px-2 py-0.5 text-xs font-bold rounded bg-status-critical text-white">TRIGGER</span>
            <span class="px-2 py-0.5 text-xs font-bold rounded border" :class="severityBadge(trigger.severity)">
              {{ severityLabel(trigger.severity) }}
            </span>
            <span class="font-mono text-xs text-text-secondary">{{ triggerDisplayTs }}</span>
            <span class="font-mono text-xs font-bold text-text-primary bg-white border border-border rounded px-2 py-0.5">{{ trigger.alertName }}</span>
          </div>
          <div class="text-sm font-semibold text-text-primary mb-1">{{ trigger.serviceName }}</div>
          <div class="text-sm text-text-primary mb-2">{{ trigger.message }}</div>
          <div v-if="trigger.metric" class="text-xs font-mono text-text-secondary bg-white/60 border border-border rounded px-2 py-1">
            <span>metric</span>=<span class="text-text-primary font-bold">{{ trigger.metric }}</span>
            <span v-if="trigger.threshold != null"> · threshold=<span class="text-text-primary font-bold">{{ trigger.threshold }}{{ trigger.unit ?? '' }}</span></span>
            <span v-if="trigger.currentValue != null"> · current=<span class="text-status-critical font-bold">{{ trigger.currentValue }}{{ trigger.unit ?? '' }}</span></span>
          </div>
        </div>

        <!-- 윈도우 설명 (작은 회색 1줄) -->
        <div class="text-xs text-text-secondary">
          <span class="font-bold text-text-primary">{{ windowDurationLabel }}</span>
          <span> · 같은 서비스 알람을 같은 그룹으로 합치는 중</span>
        </div>

        <!-- CAP 한 줄 배너 (회색, 테두리 X, capApplied 시만) -->
        <div v-if="capApplied" class="flex items-start gap-2 text-xs text-text-secondary">
          <span class="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 shrink-0" />
          <span>
            수신 <span class="font-bold text-text-primary">{{ totalReceived }}건</span>
            → 분석 <span class="font-bold text-text-primary">{{ groupedCount }}건 묶음</span>
            · overflow <span class="font-bold text-text-primary">{{ overflowCount }}건</span>
            (카운트만 집계, 분석 비용 일정 유지)
          </span>
        </div>

        <!-- 대표 알람 카드 (TRIGGER 외 추가 강조 — 작은 톤) -->
        <div v-if="representativeArrivings.length > 0" class="space-y-2">
          <div class="text-xs font-bold uppercase tracking-wider text-text-secondary">대표 알람</div>
          <div
            v-for="(a, i) in representativeArrivings"
            :key="`rep-${a.ts}-${i}`"
            class="border border-border rounded-md p-3 bg-white"
          >
            <div class="flex items-center gap-2 flex-wrap mb-1.5">
              <span class="px-2 py-0.5 text-xs font-bold rounded border" :class="severityBadge(a.severity)">{{ severityLabel(a.severity) }}</span>
              <span class="font-mono text-xs text-text-secondary">{{ arrivingDisplayTs(arrivingAlarms.indexOf(a), a.ts) }}</span>
              <span class="font-mono text-xs font-bold text-text-primary bg-bg-elev border border-border rounded px-1.5 py-0.5">{{ a.alertName }}</span>
            </div>
            <div class="text-sm text-text-primary mb-1">{{ a.message }}</div>
            <div v-if="a.metric" class="text-xs font-mono text-text-secondary">
              <span>metric</span>=<span class="text-text-primary">{{ a.metric }}</span>
              <span v-if="a.threshold != null"> · threshold=<span class="text-text-primary">{{ a.threshold }}{{ a.unit ?? '' }}</span></span>
              <span v-if="a.currentValue != null"> · current=<span class="text-status-critical font-bold">{{ a.currentValue }}{{ a.unit ?? '' }}</span></span>
            </div>
          </div>
        </div>

        <!-- 나머지 알람 메트릭별 집계 (1줄) -->
        <div v-if="otherSummary.length > 0" class="text-xs text-text-secondary">
          그 외 <span class="font-bold text-text-primary">{{ otherArrivings.length }}건</span> —
          <span v-for="(s, i) in otherSummary" :key="s.category">
            <span>{{ s.category }} <span class="font-bold text-text-primary">{{ s.count }}</span></span>
            <span v-if="i < otherSummary.length - 1"> · </span>
          </span>
        </div>

        <!-- 전체 알람 펼치기 토글 -->
        <details v-if="arrivingAlarms.length > 0" class="group">
          <summary class="cursor-pointer text-xs font-bold text-text-secondary hover:text-text-primary select-none">
            <span class="group-open:hidden">▶ 전체 {{ arrivingAlarms.length }}건 펼치기</span>
            <span class="hidden group-open:inline">▼ 전체 {{ arrivingAlarms.length }}건 접기</span>
          </summary>
          <div ref="scrollEl" class="mt-3 max-h-80 overflow-y-auto space-y-2 pl-3 border-l border-border">
            <div
              v-for="(a, i) in arrivingAlarms"
              :key="`all-${a.ts}-${i}`"
              class="border border-border rounded-md p-2 bg-white"
            >
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span class="px-2 py-0.5 text-xs font-bold rounded border" :class="severityBadge(a.severity)">{{ severityLabel(a.severity) }}</span>
                <span class="font-mono text-xs text-text-secondary">{{ arrivingDisplayTs(i, a.ts) }}</span>
                <span class="font-mono text-xs text-text-primary bg-bg-elev border border-border rounded px-1.5 py-0.5 font-bold">{{ a.alertName }}</span>
              </div>
              <div class="text-sm text-text-primary mb-1">{{ a.message }}</div>
              <div v-if="a.metric" class="text-xs font-mono text-text-secondary">
                metric=<span class="text-text-primary">{{ a.metric }}</span>
                <span v-if="a.threshold != null"> · threshold=<span class="text-text-primary">{{ a.threshold }}{{ a.unit ?? '' }}</span></span>
                <span v-if="a.currentValue != null"> · current=<span class="text-status-critical font-bold">{{ a.currentValue }}{{ a.unit ?? '' }}</span></span>
              </div>
            </div>
            <div v-if="isActive && arrivingAlarms.length > 0" class="flex items-center gap-2 text-xs text-text-secondary pt-1">
              <span class="inline-block w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
              다음 알람 대기 중…
            </div>
          </div>
        </details>

        <!-- 그룹 확정 1줄 (회색) -->
        <div v-if="groupConfirmed" class="flex items-center gap-2 text-xs text-text-secondary">
          <span class="text-status-ok font-bold">✓</span>
          <span>
            <span class="font-bold text-text-primary">{{ groupedCount }}건 그룹 확정</span>
            · 대표 severity <span class="font-bold text-text-primary">{{ repSeverityLabel }}</span>
            <span v-if="overflowCount > 0"> · overflow <span class="font-bold text-text-primary">{{ overflowCount }}</span></span>
          </span>
        </div>
      </div>

      <!-- 우측: 영향 인프라 서비스 맵 -->
      <div>
        <ServiceMap :map="serviceMap" />
      </div>
    </div>
  </div>
</template>
