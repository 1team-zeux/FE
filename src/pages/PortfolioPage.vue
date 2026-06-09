<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePortfolioQuery, PortfolioCard } from '@/features/portfolio';
import { useRouter } from 'vue-router';

const { data: bus, isLoading, isError } = usePortfolioQuery();
const router = useRouter();

type FilterStatus = 'all' | 'healthy' | 'warning' | 'critical';
type SortKey = 'risk' | 'budget' | 'events';

const filter = ref<FilterStatus>('all');
const sort = ref<SortKey>('risk');

const kpi = computed(() => {
  const all = bus.value ?? [];
  return {
    total: all.length,
    healthy: all.filter(b => b.status === 'healthy').length,
    warning: all.filter(b => b.status === 'warning').length,
    critical: all.filter(b => b.status === 'critical').length,
  };
});

const filtered = computed(() => {
  const all = bus.value ?? [];
  const f = filter.value === 'all' ? all : all.filter(b => b.status === filter.value);
  return [...f].sort((a, b) => {
    if (sort.value === 'risk') return b.riskScore - a.riskScore;
    if (sort.value === 'budget') return a.lowestBudget - b.lowestBudget;
    return b.activeEvents - a.activeEvents;
  });
});

const filterTabs: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'healthy', label: '정상' },
  { key: 'warning', label: '경고' },
  { key: 'critical', label: '장애' },
];

const handleDrilldown = (buId: string, drillable: boolean) => {
  if (drillable) router.push(`/dashboard/bu/${buId}`);
};
</script>
<template>
  <div class="py-8 px-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-text-primary tracking-tight">고객사 현황</h1>
    </div>

    <!-- KPI Bar -->
    <div v-if="!isLoading && !isError" class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-bg-card border border-border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-text-primary">{{ kpi.total }}</div>
        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">전체</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-status-ok">{{ kpi.healthy }}</div>
        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">정상</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-status-warning">{{ kpi.warning }}</div>
        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">경고</div>
      </div>
      <div class="bg-bg-card border border-border rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-status-critical">{{ kpi.critical }}</div>
        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">장애</div>
      </div>
    </div>

    <!-- Filter + Sort -->
    <div v-if="!isLoading && !isError" class="flex items-center justify-between mb-5">
      <div class="flex gap-1">
        <button
          v-for="tab in filterTabs" :key="tab.key"
          class="px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors"
          :class="filter === tab.key ? 'bg-brand text-white' : 'bg-bg-card border border-border text-gray-500 hover:border-brand hover:text-brand'"
          @click="filter = tab.key"
        >{{ tab.label }}</button>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-gray-400">정렬:</span>
        <select v-model="sort" class="text-[12px] border border-border rounded-md px-2 py-1.5 bg-bg-card text-text-primary font-bold cursor-pointer focus:outline-none focus:border-brand">
          <option value="risk">위험도순</option>
          <option value="budget">Error Budget 소진순</option>
          <option value="events">최근 이벤트순</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 4" :key="i" class="h-[240px] bg-gray-100 animate-pulse rounded-lg"></div>
    </div>
    <!-- Error -->
    <div v-else-if="isError" class="p-12 text-center bg-status-critical/5 rounded-lg border border-status-critical/20">
      <div class="text-status-critical font-bold">Failed to load portfolio data</div>
    </div>
    <!-- Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <PortfolioCard v-for="bu in filtered" :key="bu.id" :bu="bu" @click="handleDrilldown(bu.id, bu.drillable)" />
      <div v-if="filtered.length === 0" class="col-span-3 p-12 text-center text-gray-400 text-sm">해당 조건의 고객사 없음</div>
    </div>
  </div>
</template>
