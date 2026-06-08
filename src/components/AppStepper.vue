<script setup lang="ts">
interface Step {
  label: string
}
const props = defineProps<{
  steps: Step[]
  currentStep: number
  compact?: boolean
}>()
</script>

<template>
  <nav class="flex items-center gap-0">
    <template v-for="(step, index) in steps" :key="index">
      <div
        data-testid="step-item"
        class="flex items-center"
        :class="[
          compact ? 'gap-1.5' : 'gap-2',
          {
            'step-active': index + 1 === currentStep,
            'step-completed': index + 1 < currentStep,
            'step-pending': index + 1 > currentStep,
          }
        ]"
      >
        <div
          class="rounded-full flex items-center justify-center font-bold border-2 transition-colors"
          :class="[
            compact ? 'w-5 h-5 text-[10px]' : 'w-8 h-8 text-sm',
            {
              'bg-brand border-brand text-white': index + 1 === currentStep,
              'bg-status-ok border-status-ok text-white': index + 1 < currentStep,
              'bg-bg-card border-border text-text-muted': index + 1 > currentStep,
            }
          ]"
        >
          <svg v-if="index + 1 < currentStep" :class="compact ? 'w-2.5 h-2.5' : 'w-4 h-4'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span
          class="font-medium hidden sm:block"
          :class="[
            compact ? 'text-xs' : 'text-sm',
            {
              'text-brand': index + 1 === currentStep,
              'text-status-ok': index + 1 < currentStep,
              'text-text-muted': index + 1 > currentStep,
            }
          ]"
        >{{ step.label }}</span>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="flex-1 h-px"
        :class="[compact ? 'mx-2' : 'mx-3', index + 1 < currentStep ? 'bg-status-ok' : 'bg-border']"
      />
    </template>
  </nav>
</template>
