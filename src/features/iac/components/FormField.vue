<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { ConfidenceLevel, ActivationStatus, SourceType, AiSuggestion } from '../types/sla-bundle.schema'
import { useIacStore } from '../stores/iac.store'
import PdfEvidenceViewer from './PdfEvidenceViewer.vue'
import type { Evidence } from '../types/sla-bundle.schema'

const SOURCE_LABEL: Record<SourceType, { text: string; cls: string }> = {
  doc1_contract:     { text: '계약서',  cls: 'bg-blue-50   text-blue-600   border-blue-200' },
  doc2_infra:        { text: '인프라',  cls: 'bg-purple-50 text-purple-600 border-purple-200' },
  system_default:    { text: '기본값',  cls: 'bg-gray-50   text-gray-500   border-gray-200' },
  system_rule:       { text: '규칙',    cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  llm_recommendation:{ text: 'AI 추천', cls: 'bg-brand/5   text-brand      border-brand/20' },
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

const isEditing = ref(props.confidence === '모호' || props.confidence === '추정')
const editValue = ref<string>(String(props.value ?? ''))

const showSuggestions = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const showEvidence = ref(false)
const evidenceAnchorRef = ref<HTMLElement | null>(null)
const iacStore = useIacStore()

const evidencePdfFile = computed(() => {
  if (!props.evidence?.documentId) return null
  if (props.evidence.documentId === 'doc1_contract') return iacStore.pdfFiles.sla
  return iacStore.pdfFiles.infra
})

const popoverPosition = computed(() => {
  if (!evidenceAnchorRef.value) return {}
  const rect = evidenceAnchorRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow > 440 ? rect.bottom + 4 : rect.top - 444
  const left = Math.min(rect.left, window.innerWidth - 492)
  return { top: `${top}px`, left: `${Math.max(8, left)}px` }
})

function toggleEvidence() {
  showEvidence.value = !showEvidence.value
}

watch(() => props.confidence, (c) => {
  if (c === '확실' || c === '확정') {
    isEditing.value = false
    showSuggestions.value = false
  } else if (c === '모호' || c === '추정') {
    editValue.value = String(props.value ?? '')
    isEditing.value = true
  }
})

function acceptValue() {
  if (showSuggestions.value) {
    showSuggestions.value = false
    setTimeout(() => emit('confirm', props.fieldId, editValue.value), 210)
  } else {
    emit('confirm', props.fieldId, isEditing.value ? editValue.value : props.value)
  }
}

function startEdit() {
  editValue.value = String(props.value ?? '')
  isEditing.value = true
}

function submitEdit() {
  isEditing.value = false
  emit('confirm', props.fieldId, editValue.value)
}

function openSuggestions() {
  if (props.suggestions?.length) showSuggestions.value = true
}

function applySuggestion(val: string) {
  editValue.value = val
  showSuggestions.value = false
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    showSuggestions.value = false
  }
  if (evidenceAnchorRef.value && !evidenceAnchorRef.value.contains(e.target as Node)) {
    showEvidence.value = false
  }
}

watch(showSuggestions, (v) => {
  if (v) document.addEventListener('click', handleClickOutside)
  else document.removeEventListener('click', handleClickOutside)
})

watch(showEvidence, (v) => {
  if (v) document.addEventListener('click', handleClickOutside)
  else document.removeEventListener('click', handleClickOutside)
})

onUnmounted(() => document.removeEventListener('click', handleClickOutside))

// 높이 기반 expand/collapse 훅
function onSuggestEnter(el: Element) {
  const e = el as HTMLElement
  e.style.height = '0'
  e.style.overflow = 'hidden'
  requestAnimationFrame(() => {
    e.style.transition = 'height 0.25s cubic-bezier(0.4,0,0.2,1)'
    e.style.height = e.scrollHeight + 'px'
  })
}
function onSuggestAfterEnter(el: Element) {
  const e = el as HTMLElement
  e.style.height = ''
  e.style.overflow = ''
  e.style.transition = ''
}
function onSuggestLeave(el: Element) {
  const e = el as HTMLElement
  const h = e.getBoundingClientRect().height
  e.style.height = h + 'px'
  e.style.overflow = 'hidden'
  requestAnimationFrame(() => {
    e.style.transition = 'height 0.2s cubic-bezier(0.4,0,0.2,1)'
    e.style.height = '0'
  })
}
function onSuggestAfterLeave(el: Element) {
  const e = el as HTMLElement
  e.style.height = ''
  e.style.overflow = ''
  e.style.transition = ''
}
</script>

<template>
  <div :id="fieldId">

    <!-- 비활성 (not_applicable) -->
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

    <!-- 라벨 행 -->
    <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
      <span class="text-xs font-medium text-text-secondary">{{ label }}</span>
      <span v-if="required" class="text-status-critical text-[10px] leading-none">*</span>
      <!-- source 배지 -->
      <span
        v-if="source"
        class="px-1.5 py-px rounded text-[9px] font-medium border leading-none"
        :class="SOURCE_LABEL[source].cls"
      >{{ SOURCE_LABEL[source].text }}</span>
      <!-- PDF 근거 버튼 -->
      <button
        v-if="evidence && (evidence.page || evidence.snippet)"
        ref="evidenceAnchorRef"
        @click.stop="toggleEvidence"
        class="relative ml-auto p-0.5 rounded text-text-muted hover:text-brand transition-colors"
        title="PDF 원문 보기"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <!-- 팝오버 -->
        <Teleport to="body">
          <div
            v-if="showEvidence"
            class="fixed z-50 shadow-xl rounded-xl border border-border overflow-hidden"
            style="width: 480px;"
            :style="popoverPosition"
          >
            <!-- 헤더 -->
            <div class="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-border">
              <span class="text-[11px] font-medium text-text-secondary">PDF 원문</span>
              <span v-if="evidence.page" class="text-[10px] text-text-muted">p.{{ evidence.page }}</span>
              <button @click.stop="showEvidence = false" class="ml-2 p-0.5 rounded hover:bg-gray-200 text-text-muted">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <!-- PDF 렌더링 (파일 있을 때) -->
            <PdfEvidenceViewer
              v-if="evidencePdfFile"
              :file="evidencePdfFile"
              :page="evidence.page ?? 1"
              :snippet="evidence.snippet"
            />
            <!-- 파일 없을 때: 스니펫 텍스트 폴백 -->
            <div v-else class="px-4 py-3 bg-white">
              <p class="text-[11px] text-text-muted mb-1">원문 발췌</p>
              <p class="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{{ evidence.snippet ?? '원문 없음' }}</p>
            </div>
          </div>
        </Teleport>
      </button>
    </div>

    <!-- 편집 중 -->
    <div v-if="isEditing" ref="containerRef" class="relative">
      <div class="relative">
        <input
          v-model="editValue"
          @click="(confidence === '모호' || confidence === '추정') ? openSuggestions() : undefined"
          @keyup.enter="confidence !== '확실' ? acceptValue() : submitEdit()"
          class="w-full h-9 px-3 pr-8 rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40 transition-shadow ring-1"
          :class="source === 'llm_recommendation' ? 'bg-white ring-brand' : 'bg-bg-muted ring-border'"
          :placeholder="String(value ?? '')"
        />
        <!-- 확인 버튼 (모호/추정) -->
        <div v-if="confidence === '모호' || confidence === '추정'"
          class="absolute right-2 top-1/2 -translate-y-1/2">
          <button @click="acceptValue"
            class="p-1 rounded text-status-ok hover:bg-green-100 transition-colors"
            title="확인">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
          </button>
        </div>
        <!-- 확실 수동 편집: 저장/취소 -->
        <div v-else class="flex gap-3 mt-1.5">
          <button @click="submitEdit" class="text-xs text-brand font-medium">저장</button>
          <button @click="isEditing = false" class="text-xs text-text-muted">취소</button>
        </div>
      </div>

      <!-- AI 추천 패널 -->
      <Transition
        @enter="onSuggestEnter"
        @after-enter="onSuggestAfterEnter"
        @leave="onSuggestLeave"
        @after-leave="onSuggestAfterLeave"
      >
        <div
          v-if="showSuggestions && suggestions?.length"
          class="mt-1.5 rounded-xl border border-brand/25 bg-white shadow-lg z-20 relative"
        >
          <!-- 헤더 -->
          <div class="flex items-center gap-1.5 px-3 py-2 bg-brand/5 border-b border-brand/10">
            <svg class="w-3 h-3 text-brand" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
            </svg>
            <span class="text-[10px] font-semibold text-brand tracking-wide">AI 추천</span>
            <span class="ml-auto text-[9px] text-brand/50">클릭하면 입력값에 반영됩니다</span>
          </div>

          <!-- 추천 목록 -->
          <div class="divide-y divide-border/60">
            <button
              v-for="(s, i) in suggestions"
              :key="i"
              @click.stop="applySuggestion(s.value)"
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
      <!-- 확정: 체크 아이콘 -->
      <svg v-if="confidence === '확정'" class="w-4 h-4 text-status-ok shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
      </svg>
      <!-- 확실: hover 시 편집 버튼 -->
      <button
        v-else-if="confidence === '확실'"
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

    <p v-if="description" class="mt-1 text-[11px] text-text-muted leading-relaxed">{{ description }}</p>

    </template><!-- /활성 -->
  </div>
</template>
