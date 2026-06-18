<script setup lang="ts">
// FinOpsRunConsole의 다크 터미널 UX를 그대로 빌려 Triage 전용 라벨 입힘
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{
  lines: string[];
  isStreaming?: boolean;
  isDone?: boolean;
}>();

const scrollEl = ref<HTMLElement | null>(null);

// 라인 추가될 때마다 자동 스크롤
watch(
  () => props.lines.length,
  async () => {
    await nextTick();
    if (scrollEl.value) {
      scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
    }
  },
);

// 줄 prefix별 색상 (FinOpsRunConsole과 동일 규칙)
const lineClass = (line: string) => {
  if (line.startsWith('$'))                          return 'text-emerald-300';
  if (line.startsWith('✓') || line.includes('✓'))    return 'text-emerald-400';
  if (line.startsWith('✗') || line.includes('FAILED'))return 'text-red-400';
  if (line.startsWith('⏭'))                         return 'text-amber-300';
  if (line.startsWith('  »'))                        return 'text-sky-300 italic';
  if (line.startsWith('  ⚠'))                        return 'text-amber-400';
  return 'text-gray-300';
};
</script>

<template>
  <div class="rounded-xl border border-gray-700 bg-[#0d1117] overflow-hidden shadow-lg font-mono text-xs leading-relaxed">
    <!-- 터미널 헤더 -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-gray-700 bg-[#161b22]">
      <span class="w-3 h-3 rounded-full bg-red-500/80" />
      <span class="w-3 h-3 rounded-full bg-amber-500/80" />
      <span class="w-3 h-3 rounded-full bg-emerald-500/80" />
      <span class="ml-2 text-gray-500 text-xs">Triage Agent Console</span>
      <span v-if="isStreaming" class="ml-auto text-emerald-400 text-xs animate-pulse">● running</span>
      <span v-else-if="isDone" class="ml-auto text-gray-500 text-xs">done</span>
    </div>
    <!-- 로그 본문 -->
    <div ref="scrollEl" class="h-72 overflow-y-auto p-4 space-y-0.5">
      <div v-if="!lines.length && !isStreaming" class="text-gray-600">
        Triage 실행 시 노드별 작업 로그가 표시됩니다.
      </div>
      <div v-for="(line, i) in lines" :key="i" :class="lineClass(line)">
        {{ line }}
      </div>
      <span v-if="isStreaming" class="inline-block w-2 h-4 bg-emerald-400 animate-pulse align-middle" />
    </div>
  </div>
</template>
