<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useSlaStatusQuery, ServiceRow } from '@/features/sla';
const route = useRoute();
const router = useRouter();
const buId = route.params.buId as string;
const { data: services, isLoading, isError } = useSlaStatusQuery(buId);
const handleDrilldown = (svcId: string) => router.push(`/dashboard/service/${svcId}`);
</script>
<template>
  <div class="p-8 max-w-[1200px] mx-auto">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">Level 2 · SLA Status</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">Platform Service Health</h1>
        <p class="text-gray-500 mt-2 text-sm">Question: <b>Which service SLAs are at risk within this BU?</b></p>
      </div>
      <button class="px-4 py-2 border border-border rounded-md text-sm font-bold hover:bg-gray-50 transition-colors" @click="router.push('/dashboard')">← Portfolio</button>
    </div>
    <div v-if="isLoading" class="space-y-6"><div v-for="i in 2" :key="i" class="h-[200px] bg-gray-100 animate-pulse rounded-lg"></div></div>
    <div v-else-if="isError" class="p-12 text-center bg-status-critical/5 rounded-lg border border-status-critical/20"><div class="text-status-critical font-bold">Failed to load service data</div></div>
    <div v-else class="space-y-6"><ServiceRow v-for="service in services" :key="service.id" :service="service" @drilldown="handleDrilldown(service.id)" /></div>
  </div>
</template>
