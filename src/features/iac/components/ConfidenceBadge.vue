<script setup lang="ts">
import type { ConfidenceLevel } from '../types/sla-bundle.schema'
defineProps<{ confidence: ConfidenceLevel }>()
</script>

<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
    :class="{
      'bg-green-100 text-green-800': confidence === '확실',
      'bg-yellow-100 text-yellow-800': confidence === '모호',
      'bg-red-100 text-red-800': confidence === '추정',
      'bg-brand-subtle text-brand': confidence === '확정',
    }"
  >{{ confidence }}</span>
</template>
