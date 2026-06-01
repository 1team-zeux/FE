<script setup lang="ts">
import type { SLASection } from '../types/sla-bundle.schema'

defineProps<{
  sections: SLASection[]
  activeSection: string
}>()

const emit = defineEmits<{
  select: [sectionId: string]
}>()
</script>

<template>
  <nav class="w-44 shrink-0 space-y-1">
    <button
      v-for="section in sections"
      :key="section.sectionId"
      @click="emit('select', section.sectionId)"
      class="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors"
      :class="section.sectionId === activeSection
        ? 'bg-brand-subtle text-brand font-medium'
        : 'text-text-secondary hover:bg-bg-muted'"
    >
      <span>{{ section.label }}</span>
      <span
        v-if="section.ambiguousCount + section.estimatedCount > 0"
        class="text-xs px-1.5 py-0.5 rounded-full font-medium"
        :class="section.estimatedCount > 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'"
      >{{ section.ambiguousCount + section.estimatedCount }}</span>
    </button>
  </nav>
</template>
