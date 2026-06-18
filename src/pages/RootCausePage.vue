<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRootCauseQuery, ResourceCard } from '@/features/root-cause';

const route = useRoute();
const router = useRouter();

// 두 가지 진입 경로 지원:
//   /dashboard/trace/:alarmId   → alarm 기반 RCA (기존)
//   /incident/rca/:incidentId   → incident 기반 RCA (장애 대응 섹션)
const alarmId    = computed(() => (route.params.alarmId as string | undefined));
const incidentId = computed(() => (route.params.incidentId as string | undefined));
const isIncidentMode = computed(() => Boolean(incidentId.value));

const { data: rootCause, isLoading, isError } = useRootCauseQuery(
  computed(() => isIncidentMode.value
    ? { incidentId: incidentId.value }
    : { alarmId: alarmId.value }
  ).value
);

// AIOps Handoff 토스트
const showToast = ref(false);
const toastCardName = ref('');
const handleHandoff = (name: string) => {
  toastCardName.value = name;
  showToast.value = true;
  setTimeout(() => (showToast.value = false), 3000);
};

// 복구 추천 페이지로 이동 (incident 모드 전용)
const goToRecovery = () => {
  if (incidentId.value) {
    router.push({ name: 'incident-recovery', params: { incidentId: incidentId.value } });
  }
};
</script>

<template>
  <div class="py-8 px-8">
    <div v-if="isLoading" class="p-12 text-center text-sm text-gray-500">근본 원인 분석 중...</div>
    <div v-else-if="isError" class="p-12 text-center text-sm text-status-critical">RCA 데이터 로드 실패</div>

    <template v-else-if="rootCause">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <div class="text-xs font-bold text-brand uppercase tracking-widest mb-1">
            {{ isIncidentMode ? '장애 대응 · Page 3' : 'Level 4 · Root Cause Trace' }}
          </div>
          <h1 class="text-3xl font-bold text-text-primary tracking-tight">
            {{ isIncidentMode ? 'RCA — 근본 원인 분석' : 'Causal Analysis' }}
          </h1>
          <p class="text-gray-500 mt-2 text-sm">
            <span v-if="isIncidentMode">Triage 가설을 검증해 어느 리소스가 원인인지 좁힙니다 · Entry: {{ rootCause.enteredFrom }}</span>
            <span v-else>Question: <b>Which specific resource or endpoint is the root cause?</b> · Entry: {{ rootCause.enteredFrom }}</span>
          </p>
        </div>
        <button class="px-4 py-2 border border-border rounded-md text-sm font-bold hover:bg-gray-50 transition-colors" @click="router.back()">← 뒤로</button>
      </div>

      <div class="bg-brand/5 border border-brand/20 rounded-lg p-3 mb-8 flex items-center gap-3">
        <span class="text-brand">ⓘ</span>
        <p class="text-xs text-gray-500 leading-relaxed">
          <span v-if="isIncidentMode">각 카드는 1개의 원인 후보입니다. confidence가 높은 순으로 정렬되며, 카드의 metrics는 evidence 수와 rank를 보여줍니다.</span>
          <span v-else>This stage isolates specific resources like <b>ALB, RDS, or Pods</b>. Components are ranked by risk score.</span>
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ResourceCard v-for="card in rootCause.cards" :key="card.id" :card="card" @handoff="handleHandoff(card.name)" />
      </div>

      <!-- 복구 추천 진입 (incident 모드만) -->
      <div v-if="isIncidentMode" class="mt-8 flex justify-end">
        <button
          class="px-5 py-3 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand/90 transition-colors"
          @click="goToRecovery"
        >복구 추천 보기 →</button>
      </div>

      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform translate-y-10 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showToast" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-text-primary text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[320px]">
          <div class="w-2 h-2 bg-brand rounded-full"></div>
          <div>
            <div class="text-xs font-bold uppercase tracking-wider">Handoff Initiated</div>
            <div class="text-xs opacity-70">Context for {{ toastCardName }} sent to AIOps response module.</div>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>
