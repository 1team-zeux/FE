<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRootCauseQuery, ResourceCard } from '@/features/root-cause';
const route = useRoute();
const router = useRouter();
const alarmId = route.params.alarmId as string;
const { data: rootCause, isLoading, isError } = useRootCauseQuery(alarmId);
const showToast = ref(false);
const toastCardName = ref('');
const handleHandoff = (name: string) => { toastCardName.value = name; showToast.value = true; setTimeout(() => showToast.value = false, 3000); };
</script>
<template>
  <div class="py-8 px-8">
    <div v-if="isLoading" class="p-12 text-center">Identifying root causes...</div>
    <div v-else-if="isError" class="p-12 text-center text-status-critical">Error loading trace data</div>
    <template v-else-if="rootCause">
      <div class="mb-8 flex items-center justify-between">
        <div><div class="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">Level 4 · Root Cause Trace</div><h1 class="text-3xl font-bold text-text-primary tracking-tight">Causal Analysis</h1><p class="text-gray-500 mt-2 text-sm">Question: <b>Which specific resource or endpoint is the root cause?</b> · Entry: {{ rootCause.enteredFrom }}</p></div>
        <button class="px-4 py-2 border border-border rounded-md text-sm font-bold hover:bg-gray-50 transition-colors" @click="router.back()">← Back</button>
      </div>
      <div class="bg-brand/5 border border-brand/20 rounded-lg p-3 mb-8 flex items-center gap-3"><span class="text-brand">ⓘ</span><p class="text-[11px] text-gray-500 leading-tight">This stage isolates specific resources like <b>ALB, RDS, or Pods</b>. Components are ranked by risk score.</p></div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><ResourceCard v-for="card in rootCause.cards" :key="card.id" :card="card" @handoff="handleHandoff(card.name)" /></div>
      <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="transform translate-y-10 opacity-0" enter-to-class="transform translate-y-0 opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showToast" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-text-primary text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[320px]"><div class="w-2 h-2 bg-brand rounded-full"></div><div><div class="text-xs font-bold uppercase tracking-wider">Handoff Initiated</div><div class="text-[11px] opacity-70">Context for {{ toastCardName }} sent to AIOps response module.</div></div></div>
      </Transition>
    </template>
  </div>
</template>
