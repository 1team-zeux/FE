<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useSlaStatusQuery, useServiceMapQuery, ServiceMap } from '@/features/sla';

const route = useRoute();
const router = useRouter();
const buId = route.params.buId as string;
const { data: services, isLoading, isError } = useSlaStatusQuery(buId);
const { data: serviceMap } = useServiceMapQuery(buId);

const statusColor = (s: string) => ({
  critical: 'text-status-critical',
  warning: 'text-status-warning',
  healthy: 'text-status-ok',
}[s] ?? 'text-gray-400');

const statusDot = (s: string) => ({
  critical: 'bg-status-critical shadow-[0_0_6px_rgba(237,33,58,0.5)] animate-pulse',
  warning: 'bg-status-warning',
  healthy: 'bg-status-ok',
}[s] ?? 'bg-gray-300');

const statusLabel = (s: string) => ({ critical: '위험', warning: '경고', healthy: '정상' }[s] ?? s);

const availColor = (v: number) => {
  if (v >= 99.9) return 'text-status-ok';
  if (v >= 99.5) return 'text-status-warning';
  return 'text-status-critical';
};

const latencyColor = (ms: number) => {
  if (ms <= 300) return 'text-status-ok';
  if (ms <= 700) return 'text-status-warning';
  return 'text-status-critical';
};
</script>
<template>
  <div class="py-8 px-8">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">Level 2 · 서비스 대시보드</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">서비스 상태</h1>
        <p class="text-gray-500 mt-1 text-sm">어느 서비스가 문제인가?</p>
      </div>
      <button class="px-4 py-2 border border-border rounded-md text-sm font-bold hover:bg-gray-50 transition-colors" @click="router.push('/dashboard')">← 고객사</button>
    </div>

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-14 bg-gray-100 animate-pulse rounded-lg"></div>
    </div>
    <div v-else-if="isError" class="p-12 text-center bg-status-critical/5 rounded-lg border border-status-critical/20">
      <div class="text-status-critical font-bold">Failed to load service data</div>
    </div>
    <template v-else>
      <!-- Service Table -->
      <div class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm mb-8">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-border">
              <th class="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">서비스</th>
              <th class="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tier</th>
              <th class="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Availability</th>
              <th class="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">P95 Latency</th>
              <th class="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Burn Rate</th>
              <th class="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">API Endpoints</th>
              <th class="text-center px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">상태</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="svc in services" :key="svc.id"
              class="border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors"
              :class="{ 'border-l-4 border-l-status-critical': svc.status === 'critical' }"
            >
              <td class="px-4 py-3">
                <div class="font-bold text-text-primary">{{ svc.name }}</div>
                <div v-if="svc.burn" class="text-[10px] text-gray-400 mt-0.5">Burn: {{ svc.burn }}</div>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 bg-gray-100 text-[10px] font-bold rounded text-gray-500">{{ svc.tier }}</span>
              </td>
              <td class="px-4 py-3 text-right font-mono font-bold" :class="availColor(svc.availability)">
                {{ svc.availability > 0 ? svc.availability.toFixed(2) + '%' : '—' }}
              </td>
              <td class="px-4 py-3 text-right font-mono font-bold" :class="latencyColor(svc.latencyP95)">
                {{ svc.latencyP95 > 0 ? svc.latencyP95 + 'ms' : '—' }}
              </td>
              <td class="px-4 py-3 text-right">
                <span v-if="svc.burn" class="font-bold text-sm" :class="{ 'text-status-critical': svc.burn === 'Fast', 'text-status-warning': svc.burn === 'Slow' }">{{ svc.burn }}</span>
                <span v-else class="text-status-ok font-bold text-sm">Stable</span>
              </td>
              <td class="px-4 py-3 text-right font-mono text-text-secondary">
                {{ svc.apiEndpoints > 0 ? svc.apiEndpoints : '—' }}
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  :class="{
                    'bg-status-critical/10 text-status-critical border-status-critical/20': svc.status === 'critical',
                    'bg-status-warning/10 text-status-warning border-status-warning/20': svc.status === 'warning',
                    'bg-status-ok/10 text-status-ok border-status-ok/20': svc.status === 'healthy',
                  }"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="statusDot(svc.status)" />
                  {{ statusLabel(svc.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="svc.drillable"
                  class="px-3 py-1 bg-brand/10 text-brand text-[11px] font-bold rounded-md hover:bg-brand/20 transition-colors"
                  @click="router.push(`/dashboard/service/${svc.id}`)"
                >분석 →</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Service Map -->
      <div v-if="serviceMap" class="mb-8">
        <div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-3">Service Dependency Map</div>
        <ServiceMap :map="serviceMap" @node-click="(id) => router.push(`/dashboard/service/${id}`)" />
      </div>

      <!-- Budget summary cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="svc in services" :key="`budget-${svc.id}`" class="bg-bg-card border border-border rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-bold text-text-primary truncate">{{ svc.name }}</span>
            <span class="text-[10px] font-bold" :class="statusColor(svc.status)">{{ statusLabel(svc.status) }}</span>
          </div>
          <div class="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Error Budget</span><span class="font-bold text-text-primary">{{ svc.budgetRemaining }}% 남음</span>
          </div>
          <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full transition-all duration-500"
              :class="{ 'bg-status-critical': svc.budgetRemaining <= 35, 'bg-status-warning': svc.budgetRemaining > 35 && svc.budgetRemaining <= 60, 'bg-status-ok': svc.budgetRemaining > 60 }"
              :style="{ width: `${svc.budgetRemaining}%` }"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
