<script setup lang="ts">
interface Step {
  label: string
}
const props = defineProps<{
  steps: Step[]
  currentStep: number
}>()
</script>

<template>
  <nav class="flex items-center gap-0">
    <template v-for="(step, index) in steps" :key="index">
      <div
        data-testid="step-item"
        class="flex items-center gap-2"
        :class="{
          'step-active': index + 1 === currentStep,
          'step-completed': index + 1 < currentStep,
          'step-pending': index + 1 > currentStep,
        }"
      >
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors"
          :class="{
            'bg-brand border-brand text-white': index + 1 === currentStep,
            'bg-status-ok border-status-ok text-white': index + 1 < currentStep,
            'bg-bg-card border-border text-text-muted': index + 1 > currentStep,
          }"
        >
          <svg v-if="index + 1 < currentStep" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span
          class="text-sm font-medium hidden sm:block"
          :class="{
            'text-brand': index + 1 === currentStep,
            'text-status-ok': index + 1 < currentStep,
            'text-text-muted': index + 1 > currentStep,
          }"
        >{{ step.label }}</span>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="flex-1 h-0.5 mx-3"
        :class="index + 1 < currentStep ? 'bg-status-ok' : 'bg-border'"
      />
    </template>
  </nav>
</template>
