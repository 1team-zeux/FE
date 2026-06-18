<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRecoveryActionsQuery, useApproveActionMutation } from '@/features/incident';
import { selectDemoRecoveryActions, selectDemoRecoveryReport } from '@/features/incident/fixtures';
import type { RecoveryAction } from '@/features/incident';

const route  = useRoute();
const router = useRouter();
const incidentId = route.params.incidentId as string;

const { data: apiData, isLoading } = useRecoveryActionsQuery(incidentId);
const approveMut = useApproveActionMutation();

// API 없으면 incidentId 로 시나리오별 데모 fixture 선택
const actions = computed<RecoveryAction[]>(() =>
  apiData.value?.actions && apiData.value.actions.length > 0
    ? apiData.value.actions
    : selectDemoRecoveryActions(incidentId)
);
const report = computed(() => apiData.value?.report ?? selectDemoRecoveryReport(incidentId));

// 로컬 상태 (백엔드 미연결 시 즉시 토글)
const localStatus = ref<Record<string, RecoveryAction['status']>>({});
const statusOf = (a: RecoveryAction) => localStatus.value[a.id] ?? a.status;

// 위험도 Medium/High → 인라인 확인 UI
const confirmingId = ref<string | null>(null);

const startConfirm = (a: RecoveryAction) => {
  if (a.riskLevel === 'Low') {
    submitDecision(a, 'approve');
  } else {
    confirmingId.value = a.id;
  }
};

const cancelConfirm = () => { confirmingId.value = null; };

const submitDecision = async (a: RecoveryAction, decision: 'approve' | 'reject') => {
  confirmingId.value = null;
  localStatus.value[a.id] = decision === 'approve' ? 'executing' : 'rejected';
  try {
    await approveMut.mutateAsync({ incidentId, actionId: a.id, decision });
  } catch {
    // 백엔드 미연결 시 로컬 시뮬레이션
  }
  if (decision === 'approve') {
    // 2초 후 완료 (데모)
    setTimeout(() => { localStatus.value[a.id] = 'done'; }, 2000);
  }
};

// 즉시 복구 / IaC 변경 분리
const immediateActions = computed(() => actions.value.filter(a => a.actionType === 'immediate'));
const iacActions       = computed(() => actions.value.filter(a => a.actionType === 'iac_change'));

// 위험도 → 배지
const riskBadge = (level: string) => ({
  Low:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-status-warning/10 text-status-warning border-status-warning/30',
  High:   'bg-status-critical/10 text-status-critical border-status-critical/30',
}[level] ?? 'bg-gray-100 text-gray-500 border-border');

// 상태 → 표시
const statusBadge = (a: RecoveryAction) => {
  const s = statusOf(a);
  return ({
    pending:   { text: '대기 중',     cls: 'text-gray-400' },
    approved:  { text: '승인됨',     cls: 'text-brand font-semibold' },
    rejected:  { text: '반려됨',     cls: 'text-gray-400 line-through' },
    executing: { text: '실행 중...', cls: 'text-brand animate-pulse font-semibold' },
    done:      { text: '✓ 완료',     cls: 'text-status-ok font-bold' },
  }[s]);
};
</script>

<template>
  <div class="py-8 px-8 max-w-7xl mx-auto">
    <!-- 헤더 -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <div class="text-xs font-bold text-brand uppercase tracking-widest mb-1">장애 대응 · Page 4</div>
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">복구 추천 · HITL 승인</h1>
        <p class="text-gray-500 mt-1 text-sm">incident <span class="font-mono">{{ incidentId }}</span></p>
      </div>
      <button class="px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors" @click="router.back()">← 뒤로</button>
    </div>

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
    </div>

    <template v-else>
      <!-- (a) 즉시 복구 조치 -->
      <section class="mb-6">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-7 h-7 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center">a</div>
          <h2 class="text-base font-bold text-text-primary">즉시 복구 조치</h2>
          <span class="text-xs text-gray-400">Kubernetes API / AWS SDK 수준 즉시 실행 가능</span>
        </div>
        <div class="space-y-3">
          <div
            v-for="a in immediateActions" :key="a.id"
            class="bg-bg-card border border-border rounded-lg p-5"
            :class="statusOf(a) === 'done' ? 'border-status-ok/40 bg-emerald-50/30' : ''"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <span class="text-base font-bold text-text-primary">{{ a.title }}</span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border" :class="riskBadge(a.riskLevel)">
                    위험도 {{ a.riskLevel }}
                  </span>
                  <span v-if="a.expectedSlaImprovementPct" class="text-xs text-status-ok font-bold">
                    SLA +{{ a.expectedSlaImprovementPct }}% 개선
                  </span>
                </div>
                <p class="text-sm text-gray-600 leading-relaxed mb-2">{{ a.description }}</p>
                <p v-if="a.rationale" class="text-xs text-gray-500"><span class="font-semibold">근거:</span> {{ a.rationale }}</p>
                <p v-if="a.expectedEffect" class="text-xs text-gray-500 mt-1"><span class="font-semibold">예상 효과:</span> {{ a.expectedEffect }}</p>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0 w-32">
                <template v-if="statusOf(a) === 'pending' && confirmingId !== a.id">
                  <button class="w-full px-4 py-1.5 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand/90" @click="startConfirm(a)">승인</button>
                  <button class="w-full px-4 py-1.5 border border-border text-sm font-bold rounded-lg hover:bg-gray-50" @click="submitDecision(a, 'reject')">반려</button>
                </template>
                <template v-else-if="confirmingId === a.id">
                  <div class="text-xs text-gray-600 text-right mb-1">위험도 {{ a.riskLevel }} — 확인 필요</div>
                  <button class="w-full px-4 py-1.5 bg-status-critical text-white text-sm font-bold rounded-lg hover:opacity-90" @click="submitDecision(a, 'approve')">실행 확인</button>
                  <button class="w-full px-4 py-1.5 border border-border text-xs rounded-lg hover:bg-gray-50" @click="cancelConfirm">취소</button>
                </template>
                <span v-else class="text-sm" :class="statusBadge(a).cls">{{ statusBadge(a).text }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- (b) IaC 변경 제안 -->
      <section class="mb-6">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-7 h-7 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center">b</div>
          <h2 class="text-base font-bold text-text-primary">IaC 변경 제안</h2>
          <span class="text-xs text-gray-400">인프라 구조 변경 — 승인 시 Terraform PR 생성 흐름으로 이동</span>
        </div>
        <div class="space-y-3">
          <div v-for="a in iacActions" :key="a.id" class="bg-bg-card border border-border rounded-lg p-5">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <span class="text-base font-bold text-text-primary">{{ a.title }}</span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border" :class="riskBadge(a.riskLevel)">
                    위험도 {{ a.riskLevel }}
                  </span>
                  <span v-if="a.expectedSlaImprovementPct" class="text-xs text-status-ok font-bold">
                    SLA +{{ a.expectedSlaImprovementPct }}% 개선
                  </span>
                </div>
                <p class="text-sm text-gray-600 leading-relaxed mb-2">{{ a.description }}</p>
                <p v-if="a.rationale" class="text-xs text-gray-500"><span class="font-semibold">근거:</span> {{ a.rationale }}</p>
                <p v-if="a.expectedEffect" class="text-xs text-gray-500 mt-1"><span class="font-semibold">예상 효과:</span> {{ a.expectedEffect }}</p>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0 w-32">
                <template v-if="statusOf(a) === 'pending' && confirmingId !== a.id">
                  <button class="w-full px-4 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600" @click="startConfirm(a)">승인 → IaC</button>
                  <button class="w-full px-4 py-1.5 border border-border text-sm font-bold rounded-lg hover:bg-gray-50" @click="submitDecision(a, 'reject')">반려</button>
                </template>
                <template v-else-if="confirmingId === a.id">
                  <div class="text-xs text-gray-600 text-right mb-1">위험도 {{ a.riskLevel }} — 확인 필요</div>
                  <button class="w-full px-4 py-1.5 bg-status-critical text-white text-sm font-bold rounded-lg hover:opacity-90" @click="submitDecision(a, 'approve')">실행 확인</button>
                  <button class="w-full px-4 py-1.5 border border-border text-xs rounded-lg hover:bg-gray-50" @click="cancelConfirm">취소</button>
                </template>
                <template v-else-if="statusOf(a) === 'done'">
                  <button class="w-full px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-100" @click="router.push('/iac/1')">
                    IaC 온보딩으로 →
                  </button>
                </template>
                <span v-else class="text-sm" :class="statusBadge(a).cls">{{ statusBadge(a).text }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- (c) 해결 방안 보고서 -->
      <section class="bg-bg-card border border-border rounded-lg p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-7 h-7 rounded-full bg-gray-600 text-white text-sm font-bold flex items-center justify-center">c</div>
          <h2 class="text-base font-bold text-text-primary">추천 해결 방안 보고서</h2>
        </div>
        <pre class="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-lg p-4 border border-border">{{ report }}</pre>
      </section>

      <div class="mt-4 text-xs text-gray-400 text-right">
        모든 승인/반려 이력은 action_histories 테이블에 자동 기록됩니다.
      </div>
    </template>
  </div>
</template>
