<script setup lang="ts">
import { ref, toRef } from 'vue'
import type { ConfidenceLevel, ActivationStatus, SourceType, AiSuggestion, Evidence } from '../types/sla-bundle.schema'
import { useIacStore } from '../stores/iac.store'
import { storeToRefs } from 'pinia'
import PdfEvidenceViewer from './PdfEvidenceViewer.vue'
import AiSuggestionsPanel from './AiSuggestionsPanel.vue'
import { useFieldEdit } from './composables/useFieldEdit'
import { useAiSuggestions } from './composables/useAiSuggestions'
import { useEvidencePanel } from './composables/useEvidencePanel'

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
  unit?: string
  description?: string
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
const { pdfFiles } = storeToRefs(iacStore)

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

const { isEditing, acceptValue, startEdit, submitEdit } = useFieldEdit(
  props,
  (event, fieldId, value) => emit(event, fieldId, value),
  showSuggestions,
)

// useFieldEdit creates its own editValue ref, but we use sharedEditValue in template
// so both composables see the same value
const editValue = sharedEditValue

const {
  pinnedByClick,
  overlayPos,
  triggerRef,
  panelRef,
  evidencePdfFile,
  canShowPanel,
  showPanel,
  togglePin,
} = useEvidencePanel(
  toRef(props, 'source'),
  toRef(props, 'evidence'),
  pdfFiles,
)
</script>

<template>
  <div :id="fieldId">

    <!-- 비활성 -->
    <template v-if="activationStatus === 'inactive'">
      <div class="flex items-center gap-1.5 mb-1.5 opacity-40">
        <span class="text-xs font-medium text-text-muted line-through">{{ label }}</span>
      </div>
      <div class="h-9 px-3 flex items-center rounded-md bg-bg-muted/50 border border-dashed border-border">
        <span class="text-[11px] text-text-muted italic">해당 없음 (비활성)</span>
      </div>
      <p v-if="description" class="mt-1 text-[11px] text-text-muted/50 leading-relaxed line-through">{{ description }}</p>
    </template>

    <!-- 활성 -->
    <template v-else>
      <div ref="containerRef" class="relative">

        <!-- 라벨 행 -->
        <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span class="text-xs font-medium text-text-secondary">{{ label }}</span>
          <span v-if="required" class="text-status-critical text-[10px] leading-none">*</span>
          <span
            v-if="source"
            class="px-1.5 py-px rounded text-[9px] font-medium border leading-none"
            :class="SOURCE_LABEL[source].cls"
          >{{ SOURCE_LABEL[source].text }}</span>
          <button
            v-if="canShowPanel"
            ref="triggerRef"
            @click.stop="togglePin"
            class="ml-auto p-0.5 rounded transition-colors"
            :class="pinnedByClick ? 'text-brand' : 'text-text-muted hover:text-brand'"
            :title="source === 'system_rule' ? '규칙 설명 고정' : 'PDF 원문 고정'"
          >
            <svg v-if="source === 'system_rule'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </button>
        </div>

        <!-- 편집 중 -->
        <div v-if="isEditing" class="relative">
          <div class="relative">
            <input
              v-model="editValue"
              @click="(confidence === '모호' || confidence === '추정') ? openSuggestions() : undefined"
              @keyup.enter="confidence !== '확실' ? acceptValue() : submitEdit()"
              class="w-full h-9 px-3 pr-8 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40 transition-shadow ring-1"
              :class="source === 'llm_recommendation' ? 'bg-white ring-brand' : 'bg-bg-muted ring-border'"
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
              <button @click="isEditing = false" class="text-xs text-text-muted">취소</button>
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
          class="flex items-center justify-between h-9 px-3 rounded-md text-sm group transition-colors"
          :class="confidence === '확정' ? 'bg-green-50' : 'bg-bg-muted hover:bg-gray-200/50'"
        >
          <span class="text-text-primary truncate">
            {{ value !== null && value !== undefined ? `${value}${unit ? ' ' + unit : ''}` : '—' }}
          </span>
          <svg v-if="confidence === '확정'" class="w-4 h-4 text-status-ok shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          <button
            v-else-if="confidence === '확실'"
            data-testid="edit-btn"
            @click="startEdit"
            class="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-brand transition-all shrink-0"
            title="수정"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
        </div>

        <p v-if="description && source !== 'system_rule'" class="mt-1 text-[11px] text-text-muted leading-relaxed">{{ description }}</p>
      </div>

      <!-- Evidence overlay (Teleport to body) -->
      <Teleport to="body">
        <div
          v-if="showPanel && overlayPos"
          ref="panelRef"
          class="fixed w-96 z-[200] rounded-xl border overflow-hidden shadow-lg bg-white"
          :style="{ top: `${overlayPos.top}px`, left: `${overlayPos.left}px` }"
        >
          <!-- 규칙 기반 설명 카드 -->
          <div v-if="source === 'system_rule'">
            <div class="flex items-center gap-1.5 px-3 py-2 bg-orange-50 border-b border-orange-100">
              <svg class="w-3 h-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <span class="text-[10px] font-semibold text-orange-600 tracking-wide">규칙 기반 결정</span>
            </div>
            <div class="px-3 py-2.5 bg-white text-[11px] text-text-secondary leading-relaxed">
              <template v-if="evidence?.snippet && evidence?.page && description">
                PDF p.{{ evidence.page }}에 적혀있는
                <span class="font-medium text-text-primary">"{{ evidence.snippet.slice(0, 80) }}{{ evidence.snippet.length > 80 ? '…' : '' }}"</span>
                를 지키기 위해
                <span class="font-medium text-text-primary">{{ description }}</span>에 따라 자동 결정된 값입니다.
              </template>
              <template v-else-if="evidence?.snippet && description">
                PDF에 적혀있는
                <span class="font-medium text-text-primary">"{{ evidence.snippet.slice(0, 80) }}{{ evidence.snippet.length > 80 ? '…' : '' }}"</span>
                를 지키기 위해
                <span class="font-medium text-text-primary">{{ description }}</span>에 따라 자동 결정된 값입니다.
              </template>
              <template v-else-if="description">
                <span class="font-medium text-text-primary">{{ description }}</span>에 따라 자동 결정된 값입니다.
              </template>
              <template v-else-if="evidence?.snippet">
                PDF에 적혀있는
                <span class="font-medium text-text-primary">"{{ evidence.snippet.slice(0, 80) }}{{ evidence.snippet.length > 80 ? '…' : '' }}"</span>
                를 지키기 위해 규칙 기반으로 결정된 값입니다.
              </template>
              <template v-else>
                이 값은 내부 규칙에 의해 자동으로 결정된 값입니다.
              </template>
            </div>
          </div>

          <!-- PDF 뷰어 -->
          <template v-else>
            <div class="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-border">
              <span class="text-[11px] font-medium text-text-secondary">PDF 원문</span>
              <span v-if="evidence?.page" class="text-[10px] text-text-muted">p.{{ evidence.page }}</span>
            </div>
            <PdfEvidenceViewer
              v-if="evidencePdfFile && evidence?.page"
              :file="evidencePdfFile"
              :page="evidence.page"
              :snippet="evidence.snippet"
            />
            <div v-else class="px-4 py-3 bg-white">
              <p class="text-[11px] text-text-muted mb-1">원문 발췌</p>
              <p class="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{{ evidence?.snippet ?? '원문 없음' }}</p>
            </div>
          </template>
        </div>
      </Teleport>
    </template>
  </div>
</template>
