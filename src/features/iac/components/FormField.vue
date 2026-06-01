<script setup lang="ts">
import { ref } from 'vue'
import ConfidenceBadge from './ConfidenceBadge.vue'
import type { ConfidenceLevel } from '../types/sla-bundle.schema'

const props = defineProps<{
  fieldId: string
  label: string
  value: string | number | null
  confidence: ConfidenceLevel
  required: boolean
  unit?: string
  description?: string
}>()

const emit = defineEmits<{
  confirm: [fieldId: string, value: string | number | null]
}>()

const isEditing = ref(false)
const editValue = ref<string>(String(props.value ?? ''))

function acceptValue() {
  emit('confirm', props.fieldId, props.value)
}

function startEdit() {
  editValue.value = String(props.value ?? '')
  isEditing.value = true
}

function submitEdit() {
  isEditing.value = false
  emit('confirm', props.fieldId, editValue.value)
}
</script>

<template>
  <div
    class="p-4 rounded-lg border transition-colors"
    :class="{
      'border-yellow-300 bg-yellow-50': confidence === '모호',
      'border-red-300 bg-red-50': confidence === '추정',
      'border-status-ok bg-green-50': confidence === '확정',
      'border-border bg-bg-card': confidence === '확실',
    }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm font-medium text-text-primary">{{ label }}</span>
          <span v-if="required" class="text-status-critical text-xs">*</span>
          <ConfidenceBadge :confidence="confidence" />
        </div>

        <div v-if="isEditing">
          <input
            v-model="editValue"
            @keyup.enter="submitEdit"
            class="w-full border border-brand rounded px-2 py-1 text-sm focus:outline-none bg-bg-card text-text-primary"
            :placeholder="String(value ?? '')"
          />
          <div class="flex gap-2 mt-1.5">
            <button @click="submitEdit" class="text-xs text-brand underline">저장</button>
            <button @click="isEditing = false" class="text-xs text-text-muted underline">취소</button>
          </div>
        </div>
        <div v-else class="text-sm text-text-secondary">
          {{ value !== null ? `${value}${unit ? ' ' + unit : ''}` : '—' }}
        </div>

        <p v-if="description" class="mt-1 text-xs text-text-muted">{{ description }}</p>
      </div>

      <div v-if="confidence !== '확정'" class="flex gap-1 shrink-0">
        <button
          data-testid="accept-btn"
          @click="acceptValue"
          class="p-1.5 rounded-md text-status-ok hover:bg-green-100 transition-colors"
          title="수용"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          data-testid="edit-btn"
          @click="startEdit"
          class="p-1.5 rounded-md text-brand hover:bg-brand-subtle transition-colors"
          title="수정"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
      <div v-else class="shrink-0">
        <svg class="w-5 h-5 text-status-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  </div>
</template>
