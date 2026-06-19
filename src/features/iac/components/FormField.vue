<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import type { ConfidenceLevel, ActivationStatus, SourceType, AiSuggestion, Evidence } from '../types/sla-bundle.schema'
import { useIacStore } from '../stores/iac.store'
import { storeToRefs } from 'pinia'
import AiSuggestionsPanel from './AiSuggestionsPanel.vue'
import { useFieldEdit } from './composables/useFieldEdit'
import { useAiSuggestions } from './composables/useAiSuggestions'

const SOURCE_LABEL: Record<SourceType, { text: string; cls: string }> = {
  doc1_contract:      { text: '계약서',  cls: 'bg-blue-50   text-blue-600   border-blue-200' },
  doc2_infra:         { text: '인프라',  cls: 'bg-purple-50 text-purple-600 border-purple-200' },
  system_default:     { text: '기본값',  cls: 'bg-gray-50   text-gray-500   border-gray-200' },
  system_rule:        { text: '규칙',    cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  llm_recommendation: { text: 'AI 추천', cls: 'bg-brand/5   text-brand      border-brand/20' },
}

const props = defineProps<{
  fieldId: string
  label: string
  value: string | number | null
  confidence: ConfidenceLevel
  required: boolean
  unit?: string | null
  description?: string | null
  activationStatus?: ActivationStatus
  source?: SourceType
  suggestions?: AiSuggestion[]
  evidence?: Evidence
}>()

const emit = defineEmits<{
  confirm: [fieldId: string, value: string | number | null]
}>()

const containerRef = ref<HTMLElement | null>(null)
const iacStore = useIacStore()
const { activeFieldId } = storeToRefs(iacStore)

const isHovered = computed(() => activeFieldId.value === props.fieldId)

function handleMouseEnter() {
  if (props.activationStatus === 'inactive') return
  // Only trigger PDF interaction for document-sourced fields
  if (props.source === 'doc1_contract' || props.source === 'doc2_infra') {
    iacStore.setActiveField(props.fieldId, props.source)
  }
}

function handleMouseLeave() {
  iacStore.setActiveField(null)
}

// Shared editValue ref — passed to both useAiSuggestions and useFieldEdit
const sharedEditValue = ref(String(props.value ?? ''))

const {
  showSuggestions,
  openSuggestions,
  applySuggestion,
  onSuggestEnter,
  onSuggestAfterEnter,
  onSuggestLeave,
  onSuggestAfterLeave,
} = useAiSuggestions(toRef(props, 'suggestions'), containerRef, sharedEditValue)

const { isEditing, acceptValue, startEdit, submitEdit, cancelEdit } = useFieldEdit(
  props,
  (event, fieldId, value) => emit(event, fieldId, value),
  showSuggestions,
  sharedEditValue,
)
</script>

<template>
  <div
    :id="fieldId"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    class="p-3 rounded-lg border transition-all duration-200 h-full flex flex-col"
    :class="[
      isHovered ? 'border-brand bg-brand/5 ring-1 ring-brand/20 shadow-sm' : 'border-border/50 bg-white/50 hover:bg-white hover:border-border',
      activationStatus === 'inactive' ? 'opacity-40 grayscale pointer-events-none' : ''
    ]"
  >

    <!-- 비활성 -->
    <template v-if="activationStatus === 'inactive'">
      <div class="flex items-center gap-1.5 mb-1.5 opacity-40">
        <span class="text-xs font-medium text-text-muted line-through">{{ label }}</span>
      </div>
      <div class="h-9 px-3 flex items-center rounded-md bg-bg-muted/50 border border-dashed border-border mt-auto">
        <span class="text-[11px] text-text-muted italic">해당 없음 (비활성)</span>
      </div>
      <p v-if="description" class="mt-1 text-[11px] text-text-muted/50 leading-relaxed line-through">{{ description }}</p>
    </template>

    <!-- 활성 -->
    <template v-else>
      <div ref="containerRef" class="relative flex flex-col h-full">

        <!-- 라벨 행 -->
        <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span class="text-xs font-medium text-text-secondary">{{ label }}</span>
          <span v-if="required" class="text-status-critical text-[10px] leading-none">*</span>
          <span
            v-if="source"
            class="px-1.5 py-px rounded text-[9px] font-medium border leading-none ml-auto"
            :class="SOURCE_LABEL[source].cls"
          >{{ SOURCE_LABEL[source].text }}</span>
        </div>

        <!-- 편집 중 -->
        <div v-if="isEditing" class="relative">
          <div class="relative">
            <input
              v-model="sharedEditValue"
              @click="(confidence === '모호' || confidence === '추정') ? openSuggestions() : undefined"
              @keyup.enter="(confidence === '모호' || confidence === '추정') ? acceptValue() : submitEdit()"
              class="w-full h-9 px-3 pr-8 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40 transition-shadow ring-1"
              :class="(confidence === '모호' || confidence === '추정' || source === 'llm_recommendation') ? 'bg-white ring-brand shadow-sm' : 'bg-bg-muted ring-border'"
              :placeholder="String(value ?? '')"
            />
            <div v-if="confidence === '모호' || confidence === '추정'"
              class="absolute right-2 top-1/2 -translate-y-1/2">
              <button
                data-testid="accept-btn"
                @click="acceptValue"
                class="p-1 rounded text-status-ok hover:bg-green-100 transition-colors"
                title="확인"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </div>
            <div v-else class="flex gap-3 mt-1.5">
              <button @click="submitEdit" class="text-xs text-brand font-medium">저장</button>
              <button @click="cancelEdit" class="text-xs text-text-muted">취소</button>
            </div>
          </div>

          <!-- AI 추천 패널 -->
          <Transition
            @enter="onSuggestEnter" @after-enter="onSuggestAfterEnter"
            @leave="onSuggestLeave" @after-leave="onSuggestAfterLeave"
          >
            <AiSuggestionsPanel
              v-if="showSuggestions && suggestions?.length"
              :suggestions="suggestions"
              :unit="unit"
              class="mt-1.5"
              @select="applySuggestion"
            />
          </Transition>
        </div>

        <!-- 읽기 전용 -->
        <div
          v-else
          class="flex items-center justify-between min-h-[2.25rem] px-3 py-1.5 rounded-md text-sm group transition-colors bg-bg-muted hover:bg-gray-200/50"
        >
          <span class="text-text-primary break-all">
            {{ value !== null && value !== undefined ? `${value}${unit ? ' ' + unit : ''}` : '—' }}
          </span>
          <div class="flex items-center gap-1 shrink-0 ml-2">
            <svg v-if="confidence === '확정'" class="w-4 h-4 text-status-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
            <button
              v-if="confidence === '확실' || confidence === '확정'"
              data-testid="edit-btn"
              @click="startEdit"
              class="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-brand transition-all"
              title="수정"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          </div>
        </div>

        <template v-if="description">
          <div v-if="source === 'system_rule'" class="mt-2 flex gap-1.5 items-start bg-orange-50/50 p-2 rounded text-orange-700/80 border border-orange-100/50 mt-auto">
            <svg class="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-[10px] leading-relaxed">{{ description }}</p>
          </div>
          <p v-else class="mt-2 text-[11px] text-text-muted leading-relaxed mt-auto">{{ description }}</p>
        </template>
      </div>
    </template>
  </div>
</template>
