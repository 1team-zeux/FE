<script setup lang="ts">
import { computed } from 'vue'

interface ResourceStatus {
  resource: string
  status: 'pending' | 'in_progress' | 'complete' | 'error'
  detail: string
}

const props = defineProps<{
  resources: ResourceStatus[]
}>()

const progressPct = computed(() => {
  if (!props.resources.length) return 0
  const done = props.resources.filter((r) => r.status === 'complete').length
  return Math.round((done / props.resources.length) * 100)
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <div class="flex justify-between text-sm mb-1">
        <span class="text-text-secondary">전체 진행률</span>
        <span class="font-medium text-text-primary">{{ progressPct }}%</span>
      </div>
      <div class="h-3 bg-bg-muted rounded-full overflow-hidden">
        <div
          data-testid="progress-bar"
          class="h-full bg-brand transition-all duration-700 rounded-full"
          :style="{ width: `${progressPct}%` }"
        />
      </div>
    </div>

    <div class="space-y-2">
      <div
        v-for="res in resources"
        :key="res.resource"
        data-testid="resource-row"
        class="flex items-center gap-3 p-3 rounded-lg border bg-bg-card"
        :class="{
          'border-status-ok': res.status === 'complete',
          'border-brand': res.status === 'in_progress',
          'border-status-critical': res.status === 'error',
          'border-border': res.status === 'pending',
        }"
      >
        <div class="shrink-0 w-6 h-6 flex items-center justify-center">
          <svg v-if="res.status === 'complete'" :data-status="res.status" class="w-5 h-5 text-status-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <div v-else-if="res.status === 'in_progress'" :data-status="res.status"
            class="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <svg v-else-if="res.status === 'error'" :data-status="res.status" class="w-5 h-5 text-status-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <div v-else :data-status="res.status" class="w-4 h-4 rounded-full border-2 border-border" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-mono text-text-primary truncate">{{ res.resource }}</p>
          <p class="text-xs text-text-muted">{{ res.detail }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
