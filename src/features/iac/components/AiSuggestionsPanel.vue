<script setup lang="ts">
import type { AiSuggestion } from '../types/sla-bundle.schema'

defineProps<{
  suggestions: AiSuggestion[]
  unit?: string | null
}>()

defineEmits<{
  select: [value: string]
}>()
</script>

<template>
  <div class="rounded-xl border border-brand/25 bg-white shadow-lg relative">
    <div class="flex items-center gap-1.5 px-3 py-2 bg-brand/5 border-b border-brand/10">
      <svg class="w-3 h-3 text-brand" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
      </svg>
      <span class="text-[10px] font-semibold text-brand tracking-wide">AI 추천</span>
      <span class="ml-auto text-[9px] text-brand/50">클릭하면 입력값에 반영됩니다</span>
    </div>
    <div class="divide-y divide-border/60">
      <button
        v-for="(s, i) in suggestions"
        :key="i"
        @click.stop="$emit('select', s.value)"
        class="w-full text-left px-3 py-2.5 hover:bg-brand/5 transition-colors group"
      >
        <div class="flex items-start gap-2.5">
          <span class="text-[11px] font-mono font-semibold text-brand mt-0.5 shrink-0 group-hover:underline">
            {{ s.value }}{{ unit ? ` ${unit}` : '' }}
          </span>
          <span class="text-[10px] text-text-secondary leading-relaxed">{{ s.reason }}</span>
        </div>
      </button>
    </div>
  </div>
</template>
