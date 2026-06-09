<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import {
  useServiceMetricsQuery, useSystemMetricsQuery, useIncidentQuery,
  RcaPanel, TracePanel, LogPanel, ActionPanel,
  GoldenSignalCards, HostLayerSection,
} from '@/features/service-detail';
import TimeRangePicker from '@/components/shared/TimeRangePicker.vue';
import type { TimeRange } from '@/components/shared/TimeRangePicker.vue';
import LineChart from '@/components/shared/LineChart.vue';
import type { Alarm } from '@/features/service-detail';

const route  = useRoute();
const router = useRouter();
const svcId  = route.params.svcId as string;
const queryClient = useQueryClient();

// ── Global Controller ──────────────────────────────────────────────
type RefreshInterval = 'off' | '30s' | '1m' | '5m';

const selectedRange   = ref<TimeRange>('1h');
const refreshInterval = ref<RefreshInterval>('off');

const REFRESH_OPTIONS: { value: RefreshInterval; label: string }[] = [
  { value: 'off', label: 'Off'  },
  { value: '30s', label: '30s'  },
  { value: '1m',  label: '1m'   },
  { value: '5m',  label: '5m'   },
];

watch(refreshInterval, (val, _old, onCleanup) => {
  if (val === 'off') return;
  const ms = ({ '30s': 30_000, '1m': 60_000, '5m': 300_000 } as Record<string, number>)[val];
  const timer = setInterval(() => {
    queryClient.invalidateQueries({ queryKey: ['service-metrics', svcId] });
    queryClient.invalidateQueries({ queryKey: ['system-metrics', svcId] });
  }, ms);
  onCleanup(() => clearInterval(timer));
});

// ── Queries ────────────────────────────────────────────────────────
const { data: detail, isLoading, isError } = useServiceMetricsQuery(svcId, selectedRange);
const { data: systemMetrics } = useSystemMetricsQuery(svcId, selectedRange);
const { data: incident } = useIncidentQuery(svcId);

// ── SLI Chip Filter ────────────────────────────────────────────────
const selectedSliIds = ref<string[]>([]);

watch(() => detail.value, (d) => {
  if (d && selectedSliIds.value.length === 0)
    selectedSliIds.value = d.slis.map(s => s.id);
}, { immediate: true });

const filteredSlis = computed(() =>
  detail.value?.slis.filter(s => selectedSliIds.value.includes(s.id)) ?? []
);

function toggleSli(id: string) {
  const isActive = selectedSliIds.value.includes(id);
  if (isActive && selectedSliIds.value.length === 1) return; // 마지막 칩 → 무시
  selectedSliIds.value = isActive
    ? selectedSliIds.value.filter(x => x !== id)
    : [...selectedSliIds.value, id];
}

// ── Tabs ───────────────────────────────────────────────────────────
type Tab = 'metrics' | 'trace' | 'log' | 'rca' | 'action';
const activeTab = ref<Tab>((route.query.tab as Tab) ?? 'metrics');

const tabs: { key: Tab; label: string; desc?: string }[] = [
  { key: 'metrics', label: 'Metrics' },
  { key: 'trace',   label: '분산 추적', desc: '느린 요청 · 에러 요청의 span waterfall 분석' },
  { key: 'log',     label: '에러 로그', desc: '컨테이너별 ERROR / WARN 로그 조회' },
  { key: 'rca',     label: 'RCA',      desc: '인시던트 선택 → AI 원인 분석' },
  { key: 'action',  label: '대응 조치', desc: 'Slack 알림 · Jira 티켓 · Runbook 실행' },
];

// ── Alarm & Hover ──────────────────────────────────────────────────
const activeAlarm = ref<Alarm | null>(null);
const hoverIdx    = ref<number | null>(null);

const handleAlarmClick = (alarm: Alarm) => { activeAlarm.value = alarm; };
const handleTrace = () => { if (activeAlarm.value) router.push(`/dashboard/trace/${activeAlarm.value.id}`); };

watch(activeTab, (tab) => {
  if (tab === 'rca' && !activeAlarm.value && detail.value)
    activeAlarm.value = detail.value.alarms.find(a => a.sev === 'critical') ?? detail.value.alarms[0] ?? null;
});
</script>

<template>
  <div class="py-8 px-8">
    <div v-if="isLoading" class="p-12 text-center">Loading service metrics...</div>
    <div v-else-if="isError" class="p-12 text-center text-status-critical">Error loading metrics</div>
    <template v-else-if="detail">

      <!-- Header -->
      <div class="mb-5 flex items-center justify-between">
        <div>
          <div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">Level 3 · 서비스 상세</div>
          <h1 class="text-3xl font-bold text-text-primary tracking-tight">{{ detail.serviceName }}</h1>
          <p class="text-gray-500 mt-1 text-sm">이 서비스는 왜 위험한가?</p>
        </div>
        <!-- Global Controller -->
        <div class="flex items-center gap-2">
          <TimeRangePicker v-model="selectedRange" />
          <div class="flex items-center gap-1 px-2 py-1.5 border border-border rounded-md bg-white text-xs">
            <span class="text-gray-400 font-medium">Auto</span>
            <select
              v-model="refreshInterval"
              class="bg-transparent font-bold text-text-primary focus:outline-none cursor-pointer"
            >
              <option v-for="o in REFRESH_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <button class="px-4 py-2 border border-border rounded-md text-sm font-bold hover:bg-gray-50 transition-colors" @click="router.back()">← 목록</button>
        </div>
      </div>

      <!-- Golden Signals -->
      <GoldenSignalCards :slis="detail.slis" />

      <!-- Tabs -->
      <div class="flex gap-1 mb-5 border-b border-border">
        <button
          v-for="tab in tabs" :key="tab.key"
          class="px-4 py-2.5 text-sm font-bold transition-colors relative"
          :class="activeTab === tab.key ? 'text-brand border-b-2 border-brand -mb-px' : 'text-gray-400 hover:text-text-primary'"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

      <!-- Tab: Metrics -->
      <div v-if="activeTab === 'metrics'">

        <!-- Application Layer -->
        <div class="mb-10 border-l-4 border-brand pl-5">
          <!-- Section Header (clean) -->
          <div class="flex items-center gap-3 mb-3 -ml-5 pl-4 py-2.5 bg-brand/5 rounded-r-lg border-b border-brand/10">
            <span class="text-[11px] font-bold text-brand uppercase tracking-widest">Application Layer</span>
            <span class="text-[10px] text-gray-400">SLI · Error Budget · 이상 알람</span>
          </div>

          <!-- SLI Chip Filter (dedicated row) -->
          <div class="flex flex-wrap gap-2 mb-4">
            <span class="text-[10px] font-bold text-gray-400 self-center mr-1">지표 필터</span>
            <button
              v-for="sli in detail.slis" :key="sli.id"
              class="px-3 py-1 text-[11px] font-bold rounded-full border transition-all"
              :class="selectedSliIds.includes(sli.id)
                ? 'bg-brand/10 border-brand text-brand'
                : 'bg-white border-border text-gray-400 hover:border-gray-300'"
              :disabled="selectedSliIds.includes(sli.id) && selectedSliIds.length === 1"
              :title="selectedSliIds.includes(sli.id) && selectedSliIds.length === 1 ? '최소 1개 이상 선택 필요' : ''"
              @click="toggleSli(sli.id)"
            >{{ sli.sla }}</button>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">

            <!-- Timeline -->
            <div class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div class="bg-gray-50 border-b border-border p-3 flex justify-between items-center text-xs">
                <span class="font-bold">Integrated Timeline</span>
                <div class="flex gap-4 text-gray-400">
                  <span class="flex items-center gap-1"><span class="text-status-critical">◆</span> Critical</span>
                  <span class="flex items-center gap-1"><span class="text-status-warning">◆</span> Warning</span>
                  <span class="font-mono">{{ detail.window }}</span>
                </div>
              </div>
              <div v-for="sli in filteredSlis" :key="sli.id" class="border-b border-border last:border-b-0">
                <div class="p-3 flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-sm" :class="{ 'bg-status-critical': sli.state === 'violation', 'bg-status-warning': sli.state === 'warning', 'bg-brand': sli.state === 'met' }" />
                    <span class="text-sm font-bold">{{ sli.name }}</span>
                    <span class="px-1.5 py-0.5 bg-gray-100 text-[10px] font-bold rounded text-gray-500">→ {{ sli.sla }} SLA</span>
                  </div>
                  <div class="font-mono text-sm font-bold">{{ sli.series.at(-1) }}{{ sli.unit }}<span class="text-[10px] text-gray-400 font-normal ml-1">Current</span></div>
                </div>
                <LineChart
                  :series="sli.series" :domain="sli.domain" :target="sli.target" :target-label="sli.targetLabel"
                  :color="sli.state === 'violation' ? 'var(--color-status-critical)' : sli.state === 'warning' ? 'var(--color-status-warning)' : 'var(--color-brand)'"
                  :alarms="detail.alarms" :breach-from="sli.breachFrom" :active-idx="activeAlarm?.idx"
                  :hover-idx="hoverIdx"
                  @alarm-click="handleAlarmClick"
                  @hover="hoverIdx = $event"
                />
              </div>
              <div class="bg-gray-50/30">
                <div class="p-3 flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-sm bg-gray-400" />
                    <span class="text-sm font-bold text-gray-500">{{ detail.budget.name }}</span>
                  </div>
                  <div class="font-mono text-sm font-bold text-status-critical">{{ detail.budget.series.at(-1) }}%<span class="text-[10px] text-gray-400 font-normal ml-1">Remaining</span></div>
                </div>
                <LineChart :series="detail.budget.series" :domain="detail.budget.domain" color="var(--color-text-muted)" :height="80" :alarms="detail.alarms" :active-idx="activeAlarm?.idx" :hover-idx="hoverIdx" @alarm-click="handleAlarmClick" @hover="hoverIdx = $event" />
              </div>
              <div class="flex justify-between px-3 py-2 text-[10px] font-mono text-gray-400 border-t border-border">
                <span v-for="(t, i) in detail.times" :key="i" v-show="i % 2 === 0">{{ t }}</span>
              </div>
            </div>

            <!-- Alarm List Panel -->
            <div class="sticky top-20 space-y-3">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">이상 이벤트</div>
              <div
                v-for="a in detail.alarms" :key="a.id"
                class="bg-bg-card border rounded-lg cursor-pointer transition-all overflow-hidden"
                :class="{
                  'border-status-critical shadow-sm': activeAlarm?.id === a.id && a.sev === 'critical',
                  'border-status-warning shadow-sm':  activeAlarm?.id === a.id && a.sev === 'warning',
                  'border-border hover:border-gray-300': activeAlarm?.id !== a.id,
                }"
                @click="handleAlarmClick(a)"
              >
                <div class="flex items-center gap-2 px-3 py-2.5">
                  <span class="shrink-0" :class="a.sev === 'critical' ? 'text-status-critical' : 'text-status-warning'">◆</span>
                  <span class="font-mono text-[11px] font-bold text-gray-500 shrink-0">{{ a.t }}</span>
                  <span class="text-[11px] font-bold flex-1 truncate" :class="a.sev === 'critical' ? 'text-status-critical' : 'text-status-warning'">{{ a.title }}</span>
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" :class="a.sev === 'critical' ? 'bg-status-critical/10 text-status-critical' : 'bg-status-warning/10 text-status-warning'">
                    {{ a.sev === 'critical' ? 'CRIT' : 'WARN' }}
                  </span>
                </div>
                <div v-if="activeAlarm?.id === a.id" class="px-3 pb-3 border-t border-border/50 pt-2.5">
                  <p class="text-[11px] text-gray-500 leading-relaxed mb-3">{{ a.desc }}</p>
                  <div class="flex gap-2">
                    <button class="flex-1 py-1.5 bg-brand text-white text-[11px] font-bold rounded-md hover:brightness-110 transition-all" @click.stop="handleTrace">Trace →</button>
                    <button class="px-3 py-1.5 border border-brand text-brand text-[11px] font-bold rounded-md hover:bg-brand/5 transition-all" @click.stop="activeTab = 'rca'">RCA →</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Host Layer -->
        <div v-if="systemMetrics" class="border-l-4 border-amber-400 pl-5">
          <div class="flex items-center gap-3 mb-4 -ml-5 pl-4 py-2.5 bg-amber-50/50 rounded-r-lg border-b border-amber-200/50">
            <span class="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Host Layer</span>
            <span class="text-[10px] text-gray-400">CPU · Memory · Disk · Network</span>
          </div>
          <HostLayerSection :metrics="systemMetrics" :hover-idx="hoverIdx" @hover="hoverIdx = $event" />
        </div>

      </div>

      <!-- Tab: Trace -->
      <div v-else-if="activeTab === 'trace'">
        <div class="mb-4 px-4 py-2.5 bg-gray-50 border border-border rounded-lg text-xs text-gray-500">
          {{ tabs.find(t => t.key === 'trace')?.desc }}
        </div>
        <TracePanel :svc-id="svcId" />
      </div>

      <!-- Tab: Log -->
      <div v-else-if="activeTab === 'log'">
        <div class="mb-4 px-4 py-2.5 bg-gray-50 border border-border rounded-lg text-xs text-gray-500">
          {{ tabs.find(t => t.key === 'log')?.desc }}
        </div>
        <LogPanel :svc-id="svcId" />
      </div>

      <!-- Tab: RCA -->
      <div v-else-if="activeTab === 'rca'">
        <div class="mb-4 px-4 py-2.5 bg-gray-50 border border-border rounded-lg text-xs text-gray-500">
          {{ tabs.find(t => t.key === 'rca')?.desc }}
        </div>
        <div class="flex flex-wrap gap-2 mb-6">
          <button
            v-for="a in detail.alarms" :key="a.id"
            class="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-[11px] font-bold transition-all"
            :class="{
              'bg-status-critical/10 border-status-critical text-status-critical shadow-sm': activeAlarm?.id === a.id && a.sev === 'critical',
              'bg-status-warning/10 border-status-warning text-status-warning shadow-sm': activeAlarm?.id === a.id && a.sev === 'warning',
              'bg-white border-border text-gray-500 hover:border-gray-300': activeAlarm?.id !== a.id,
            }"
            @click="handleAlarmClick(a)"
          >
            <span :class="a.sev === 'critical' ? 'text-status-critical' : 'text-status-warning'">◆</span>
            <span class="font-mono">{{ a.t }}</span>
            <span class="max-w-48 truncate">{{ a.title }}</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded border font-bold" :class="a.sev === 'critical' ? 'bg-status-critical/10 border-status-critical/30 text-status-critical' : 'bg-status-warning/10 border-status-warning/30 text-status-warning'">
              {{ a.sev.toUpperCase() }}
            </span>
          </button>
        </div>
        <div v-if="!incident" class="p-8 text-center text-gray-400">RCA 데이터 로드 중...</div>
        <RcaPanel v-else :incident="incident" />
      </div>

      <!-- Tab: Action -->
      <div v-else-if="activeTab === 'action'">
        <div class="mb-4 px-4 py-2.5 bg-gray-50 border border-border rounded-lg text-xs text-gray-500">
          {{ tabs.find(t => t.key === 'action')?.desc }}
        </div>
        <ActionPanel />
      </div>

    </template>
  </div>
</template>
