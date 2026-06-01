<script setup lang="ts">
import { usePortfolioQuery, PortfolioCard } from '@/features/portfolio';
import { useRouter } from 'vue-router';
const { data: bus, isLoading, isError } = usePortfolioQuery();
const router = useRouter();
const handleDrilldown = (buId: string, drillable: boolean) => { if (drillable) router.push(`/dashboard/bu/${buId}`); };
</script>
<template>
  <div class="p-8 max-w-[1200px] mx-auto">
    <div class="mb-10">
      <div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">Level 1 · Portfolio</div>
      <h1 class="text-3xl font-bold text-text-primary tracking-tight">Enterprise Portfolio Status</h1>
      <p class="text-gray-500 mt-2 text-sm">Question: <b>Which of my assigned customers/BUs are currently at risk?</b></p>
    </div>
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><div v-for="i in 4" :key="i" class="h-[200px] bg-gray-100 animate-pulse rounded-lg"></div></div>
    <div v-else-if="isError" class="p-12 text-center bg-status-critical/5 rounded-lg border border-status-critical/20"><div class="text-status-critical font-bold">Failed to load portfolio data</div></div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><PortfolioCard v-for="bu in bus" :key="bu.id" :bu="bu" @click="handleDrilldown(bu.id, bu.drillable)" /></div>
  </div>
</template>
