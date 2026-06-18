<script setup lang="ts">
// 페이지 5 — 즉시 조치 승인 후 결과 회복 시각화
// Subscription.md: Task 4→12 진행 + 메트릭 before→after + burn rate 전환 + IaC followup
import { computed, onMounted, ref, watch } from 'vue';
import type { RecoveryResultData } from '../fixtures/recovery-fallback';

const props = defineProps<{
  data: RecoveryResultData;
  visible: boolean;
}>();

// ECS Task 진행 — 실제 80초를 5초로 압축 애니메이션
const taskProgress = ref<number>(props.data.ecsTasksBefore);
let progressTicker: ReturnType<typeof setInterval> | null = null;

function startProgress(): void {
  taskProgress.value = props.data.ecsTasksBefore;
  if (progressTicker) clearInterval(progressTicker);
  const totalSteps = props.data.ecsTasksAfter - props.data.ecsTasksBefore;
  if (totalSteps <= 0) return;
  const intervalMs = 5_000 / totalSteps;
  let i = 0;
  progressTicker = setInterval(() => {
    i++;
    taskProgress.value = props.data.ecsTasksBefore + i;
    if (taskProgress.value >= props.data.ecsTasksAfter) {
      taskProgress.value = props.data.ecsTasksAfter;
      if (progressTicker) clearInterval(progressTicker);
      progressTicker = null;
    }
  }, intervalMs);
}

onMounted(() => { if (props.visible) startProgress(); });
watch(() => props.visible, v => { if (v) startProgress(); });

// 메트릭 회복 비율
const recoveryPct = (before: number, after: number): number => {
  if (before === 0) return 0;
  return Math.min(1, Math.max(0, (before - after) / before));
};

// before 가 100% 가득찬 빨강 막대, after 가 회복된 비율로 녹색 막대
const beforeBarWidth = (before: number, _after: number): string => '100%';
const afterBarWidth = (before: number, after: number): string => {
  const ratio = Math.min(1, after / before);
  return `${Math.max(2, ratio * 100)}%`;
};

const taskProgressPct = computed(() => {
  const range = props.data.ecsTasksAfter - props.data.ecsTasksBefore;
  if (range <= 0) return 100;
  const done = taskProgress.value - props.data.ecsTasksBefore;
  return Math.min(100, Math.max(0, (done / range) * 100));
});

const taskDone = computed(() => taskProgress.value >= props.data.ecsTasksAfter);
</script>

<template>
  <div v-if="visible" class="bg-bg-card border-2 border-emerald-400 rounded-xl shadow-lg overflow-hidden">
    <!-- 헤더 -->
    <div class="bg-emerald-600 text-white px-5 py-3">
      <div class="flex items-center justify-between">
        <span class="text-sm font-bold uppercase tracking-widest">Page 5 · 복구 실행 결과</span>
        <span class="text-xs font-mono opacity-90">{{ taskDone ? '✓ 회복 완료' : '● 회복 진행 중' }}</span>
      </div>
    </div>

    <div class="px-5 py-5 space-y-5">
      <!-- 1. 타임라인 -->
      <div>
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">1. 실행 타임라인</div>
        <div class="space-y-1.5">
          <div v-for="(ev, i) in data.timelineEvents" :key="i" class="flex items-center gap-3 text-sm">
            <span class="font-mono text-xs text-gray-500 w-20 shrink-0">{{ ev.ts }}</span>
            <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span class="text-text-primary">{{ ev.label }}</span>
          </div>
        </div>
      </div>

      <!-- 2. ECS Task 진행 -->
      <div>
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">2. ECS Task 증설 진행</div>
        <div class="border border-border rounded-lg p-3 bg-bg-elev">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-text-primary">Desired Count
              <span class="font-mono text-gray-500">{{ data.ecsTasksBefore }}</span>
              <span class="text-gray-400"> → </span>
              <span class="font-mono font-bold text-emerald-700">{{ data.ecsTasksAfter }}</span>
            </span>
            <span class="text-sm font-bold text-text-primary font-mono">{{ taskProgress }} / {{ data.ecsTasksAfter }}</span>
          </div>
          <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 transition-all duration-200" :style="{ width: `${taskProgressPct}%` }" />
          </div>
          <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>실제 Task 기동 시간: 약 {{ data.ecsStartupSeconds }}초 (5초로 압축 표시)</span>
            <span v-if="taskDone" class="text-emerald-700 font-bold">✓ 12/12 Running</span>
          </div>
        </div>
      </div>

      <!-- 3. 메트릭 회복 -->
      <div>
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">3. 메트릭 회복 (Before → After)</div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div v-for="m in data.metrics" :key="m.name" class="border-2 border-border rounded-lg p-3 bg-bg-elev">
            <div class="text-sm font-bold text-text-primary mb-3">{{ m.label }}</div>

            <!-- Before -->
            <div class="mb-2">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-rose-700 font-bold">BEFORE</span>
                <span class="font-mono font-bold text-rose-700">{{ m.before }}{{ m.beforeUnit }}</span>
              </div>
              <div class="h-3 bg-rose-100 rounded-full overflow-hidden">
                <div class="h-full bg-rose-500" :style="{ width: beforeBarWidth(m.before, m.after) }" />
              </div>
            </div>

            <!-- After -->
            <div>
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-emerald-700 font-bold">AFTER</span>
                <span class="font-mono font-bold text-emerald-700">{{ m.after }}{{ m.afterUnit }}</span>
              </div>
              <div class="h-3 bg-emerald-100 rounded-full overflow-hidden">
                <div
                  v-if="taskDone"
                  class="h-full bg-emerald-500 transition-all duration-700"
                  :style="{ width: afterBarWidth(m.before, m.after) }"
                />
              </div>
            </div>

            <div class="text-xs text-gray-600 mt-2">
              회복률 <span class="font-bold text-emerald-700">{{ (recoveryPct(m.before, m.after) * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. burn rate 전환 + outcome -->
      <div>
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">4. SLA 상태</div>
        <div class="border-2 border-emerald-400 bg-emerald-50 rounded-lg p-3">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-sm text-text-primary">burn rate</span>
            <span class="px-2 py-0.5 text-xs font-bold rounded bg-rose-100 text-rose-700 border border-rose-300">{{ data.burnRateBefore }}</span>
            <span class="text-gray-400">→</span>
            <span class="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-300">{{ data.burnRateAfter }}</span>
          </div>
          <div class="text-base font-bold text-emerald-800">{{ data.outcome }}</div>
        </div>
      </div>

      <!-- 5. IaC followup -->
      <div>
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">5. IaC 후속 (Terraform PR)</div>
        <div class="border border-amber-300 bg-amber-50 rounded-lg p-3 text-sm text-text-primary">
          {{ data.iacFollowup }}
        </div>
      </div>
    </div>
  </div>
</template>
