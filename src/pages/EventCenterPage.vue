<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useEventsQuery } from '@/features/events';

const router = useRouter();

type SevFilter = 'all' | 'critical' | 'warning';
const sevFilter = ref<SevFilter>('all');
const customerFilter = ref('');

const { data: events, isLoading, isError } = useEventsQuery();

const filtered = computed(() => {
  return (events.value ?? []).filter(e => {
    const matchSev = sevFilter.value === 'all' || e.severity === sevFilter.value;
    const matchCustomer = !customerFilter.value || e.customerId === customerFilter.value;
    return matchSev && matchCustomer;
  });
});

const customers = computed(() => {
  const all = events.value ?? [];
  const unique = [...new Set(all.map(e => ({ id: e.customerId, name: e.customerName })).map(c => JSON.stringify(c)))].map(s => JSON.parse(s));
  return unique;
});

const goToRca = (serviceId: string) => {
  router.push({ path: `/dashboard/service/${serviceId}`, query: { tab: 'rca' } });
};

const severityBadge = (sev: string) => ({
  critical: 'bg-status-critical/10 text-status-critical border-status-critical/20',
  warning:  'bg-status-warning/10 text-status-warning border-status-warning/20',
}[sev] ?? 'bg-gray-100 text-gray-500 border-border');

const severityDot = (sev: string) => ({
  critical: 'bg-status-critical animate-pulse',
  warning:  'bg-status-warning',
}[sev] ?? 'bg-gray-300');

const severityLabel = (sev: string) => ({ critical: '위험', warning: '경고' }[sev] ?? sev);
</script>
<template>
  <div class="py-8 px-8">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">Event Center</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">전사 이벤트</h1>
        <p class="text-gray-500 mt-1 text-sm">지금 어느 고객사·서비스에서 무슨 일이?</p>
      </div>
      <div class="text-[10px] text-gray-400">30초마다 자동 갱신</div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <div class="flex gap-1">
        <button v-for="f in [['all','전체'],['critical','위험'],['warning','경고']] as const" :key="f[0]"
          class="px-3 py-1.5 text-[12px] font-bold rounded-md transition-colors"
          :class="sevFilter === f[0] ? 'bg-brand text-white' : 'bg-bg-card border border-border text-gray-500 hover:border-brand'"
          @click="sevFilter = f[0]"
        >{{ f[1] }}</button>
      </div>
      <select v-model="customerFilter" class="text-[12px] border border-border rounded-md px-3 py-1.5 bg-bg-card text-text-primary font-bold cursor-pointer focus:outline-none focus:border-brand">
        <option value="">모든 고객사</option>
        <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-14 bg-gray-100 animate-pulse rounded-lg"></div>
    </div>
    <div v-else-if="isError" class="p-12 text-center bg-status-critical/5 rounded-lg border border-status-critical/20">
      <div class="text-status-critical font-bold">이벤트 로드 실패</div>
    </div>
    <div v-else-if="filtered.length === 0" class="p-12 text-center text-gray-400 bg-bg-card border border-border rounded-lg">
      해당 조건의 이벤트 없음
    </div>
    <div v-else class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 border-b border-border">
            <th class="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">시각</th>
            <th class="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">고객사</th>
            <th class="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">서비스</th>
            <th class="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">인시던트</th>
            <th class="text-center px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">심각도</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="evt in filtered" :key="evt.id"
            class="border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
            @click="goToRca(evt.serviceId)"
          >
            <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ evt.ts }}</td>
            <td class="px-4 py-3">
              <span class="font-bold text-text-primary text-xs">{{ evt.customerName }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs text-text-secondary">{{ evt.serviceName }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="text-xs font-bold text-text-primary">{{ evt.title }}</div>
              <div class="text-[10px] text-gray-400 font-mono mt-0.5">{{ evt.incidentId }}</div>
            </td>
            <td class="px-4 py-3 text-center">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border" :class="severityBadge(evt.severity)">
                <span class="w-1.5 h-1.5 rounded-full" :class="severityDot(evt.severity)"></span>
                {{ severityLabel(evt.severity) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <span class="text-[11px] text-brand font-bold">RCA 분석 →</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
