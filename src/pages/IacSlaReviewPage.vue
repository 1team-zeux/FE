<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  useIacStore,
  useSlaBundleDraft, useConfirmField, useSaveSlaBundle,
  FormField,
} from '@/features/iac'
import type { ConfidenceLevel, ActivationStatus, SourceType, Service, AiSuggestion, Evidence } from '@/features/iac'

// ── 상수 ──────────────────────────────────────────────────────────────────────

const BUNDLE_SECTION_LABELS: Record<string, string> = {
  sla_basic:   'SLA 기본 정보',
  performance: '성능 / 트래픽',
  infra:       '인프라 / 리전',
  cost:        '비용',
  compliance:  '보안 / 컴플라이언스',
  db:          'DB / 데이터',
}

const BUNDLE_SECTION_ORDER = ['sla_basic', 'performance', 'infra', 'cost', 'compliance', 'db'] as const

const SERVICE_TYPE_LABELS: Record<string, string> = {
  web:   'Web',
  api:   'API',
  batch: 'Batch',
}

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface NormalizedField {
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
}

interface ReviewSection {
  sectionId: string
  label: string
  isService: boolean
  service?: Service
  fields: NormalizedField[]
}

// ── 스토어 / 라우터 ────────────────────────────────────────────────────────────

const store = useIacStore()
const router = useRouter()
const { uploadSessionId, bundleDraft } = storeToRefs(store)

const { data: bundleData, isLoading } = useSlaBundleDraft(uploadSessionId)
const { mutate: confirmField } = useConfirmField()
const { mutate: saveBundle, isPending: isSaving } = useSaveSlaBundle()

// ── 로컬 상태 ─────────────────────────────────────────────────────────────────

// 체크 버튼 클릭 시 confidence를 즉시 '확실'로 오버라이드
const localConfidence = ref<Record<string, ConfidenceLevel>>({})

// 챗봇 가이드 아이콘: 현재 포커스 필드 + 플로팅 위치
const currentGuideFieldId = ref<string | null>(null)
const bodyRef = ref<HTMLElement | null>(null)
const iconPos = ref<{ top: number; left: number } | null>(null)

let scrollRafId: number | null = null

function cancelScrollRaf() {
  if (scrollRafId !== null) {
    cancelAnimationFrame(scrollRafId)
    scrollRafId = null
  }
}

function lerpScrollTo(container: HTMLElement, target: number) {
  cancelScrollRaf()
  function step() {
    const current = container.scrollTop
    const delta = target - current
    if (Math.abs(delta) < 0.5) { container.scrollTop = target; scrollRafId = null; return }
    container.scrollTop += delta * 0.04
    scrollRafId = requestAnimationFrame(step)
  }
  scrollRafId = requestAnimationFrame(step)
}

let bodyListenerAttached = false
watch(bodyRef, (el) => {
  if (el && !bodyListenerAttached) {
    el.addEventListener('wheel', cancelScrollRaf, { passive: true })
    el.addEventListener('touchstart', cancelScrollRaf, { passive: true })
    bodyListenerAttached = true
  }
})

onUnmounted(() => {
  cancelScrollRaf()
  bodyRef.value?.removeEventListener('wheel', cancelScrollRaf)
  bodyRef.value?.removeEventListener('touchstart', cancelScrollRaf)
})

// ── 섹션 그루핑 ───────────────────────────────────────────────────────────────

const groupedReviewSections = computed((): ReviewSection[] => {
  if (!bundleDraft.value) return []
  const sections: ReviewSection[] = []

  // 1. SLA 기본 정보 (bundle field)
  const basicFields = bundleDraft.value.bundleFields
    .filter(f => f.sectionId === 'sla_basic')
    .map(toNorm)
  if (basicFields.length) sections.push({ sectionId: 'sla_basic', label: BUNDLE_SECTION_LABELS['sla_basic'], isService: false, fields: basicFields })

  // 2. 서비스별 SLA 항목
  for (const service of bundleDraft.value.services) {
    const fields = bundleDraft.value.slaItems
      .filter(i => i.serviceId === service.serviceId)
      .map(i => ({
        fieldId:          i.slaItemId,
        label:            i.label,
        value:            i.targetValue,
        confidence:       i.confidence,
        required:         i.required,
        unit:             i.unit,
        description:      i.description,
        activationStatus: i.activationStatus,
        source:           i.source,
        suggestions:      i.suggestions,
        evidence:         i.evidence,
      }))
    if (fields.length) sections.push({ sectionId: service.serviceId, label: service.serviceName, isService: true, service, fields })
  }

  // 3. 나머지 공통 섹션 (performance / infra / cost / compliance / db)
  for (const sectionId of BUNDLE_SECTION_ORDER) {
    if (sectionId === 'sla_basic') continue
    const fields = bundleDraft.value.bundleFields
      .filter(f => f.sectionId === sectionId)
      .map(toNorm)
    if (fields.length) sections.push({ sectionId, label: BUNDLE_SECTION_LABELS[sectionId] ?? sectionId, isService: false, fields })
  }

  return sections
})

function toNorm(f: NormalizedField): NormalizedField {
  return { fieldId: f.fieldId, label: f.label, value: f.value, confidence: f.confidence, required: f.required, unit: f.unit, description: f.description, activationStatus: f.activationStatus, source: f.source, evidence: f.evidence }
}

// ── 계산 ──────────────────────────────────────────────────────────────────────

// global stagger index 계산 (진입 애니메이션)
const staggerIndex = computed(() => {
  const idx = new Map<string, number>()
  let i = 0
  for (const section of groupedReviewSections.value) {
    for (const field of section.fields) {
      idx.set(field.fieldId, i++)
    }
  }
  return idx
})

function isActiveField(field: NormalizedField) {
  return field.activationStatus !== 'inactive'
}

function resolvedConfidence(fieldId: string, base: ConfidenceLevel): ConfidenceLevel {
  return localConfidence.value[fieldId] ?? base
}

const confirmedCount = computed(() => {
  let count = 0
  for (const section of groupedReviewSections.value) {
    for (const field of section.fields) {
      if (!isActiveField(field) || !field.required) continue
      const c = resolvedConfidence(field.fieldId, field.confidence)
      if (c === '확실' || c === '확정') count++
    }
  }
  return count
})

const totalRequired = computed(() => {
  let count = 0
  for (const section of groupedReviewSections.value) {
    for (const field of section.fields) {
      if (isActiveField(field) && field.required) count++
    }
  }
  return count
})

const p0UnresolvedCount = computed(() => {
  let count = 0
  for (const section of groupedReviewSections.value) {
    for (const field of section.fields) {
      if (!isActiveField(field) || !field.required) continue
      if (resolvedConfidence(field.fieldId, field.confidence) === '추정') count++
    }
  }
  return count
})

const progressPct = computed(() =>
  totalRequired.value > 0 ? Math.round((confirmedCount.value / totalRequired.value) * 100) : 0
)

const canSave = computed(() => confirmedCount.value === totalRequired.value && totalRequired.value > 0)

// ── 챗봇 가이드 아이콘 ────────────────────────────────────────────────────────

function firstUnconfirmedField(excludeId?: string): NormalizedField | null {
  for (const section of groupedReviewSections.value) {
    for (const field of section.fields) {
      if (field.fieldId === excludeId) continue
      if (!isActiveField(field)) continue
      const c = resolvedConfidence(field.fieldId, field.confidence)
      if (c !== '확실' && c !== '확정') return field
    }
  }
  return null
}

function updateIconPos() {
  if (!currentGuideFieldId.value || !bodyRef.value) { iconPos.value = null; return }
  const el = document.getElementById(currentGuideFieldId.value)
  if (!el) return
  const c = bodyRef.value
  const eRect = el.getBoundingClientRect()
  const cRect = c.getBoundingClientRect()
  iconPos.value = {
    top:  eRect.top  - cRect.top  + c.scrollTop + 30,
    left: eRect.left - cRect.left - 40,
  }
}

watch(currentGuideFieldId, async () => {
  await nextTick()
  updateIconPos()
})

// ── 데이터 로드 ───────────────────────────────────────────────────────────────

watch(bundleData, async (data) => {
  if (!data) return
  store.setBundleDraft(data)

  // 챗봇 트리거 등록 (추정=P0, 모호=P1)
  for (const item of data.slaItems) {
    if (item.activationStatus === 'inactive') continue
    if (item.confidence === '추정' || item.confidence === '모호') {
      store.addChatbotTrigger({
        fieldId:  item.slaItemId,
        priority: item.confidence === '추정' ? 'P0' : 'P1',
        reason:   item.confidence === '추정' ? 'LLM 추정값 — 운영자 검토 필수' : '모호한 값 — 확인 권장',
      })
    }
  }
  for (const field of data.bundleFields) {
    if (field.activationStatus === 'inactive') continue
    if (field.confidence === '추정' || field.confidence === '모호') {
      store.addChatbotTrigger({
        fieldId:  field.fieldId,
        priority: field.confidence === '추정' ? 'P0' : 'P1',
        reason:   field.confidence === '추정' ? 'LLM 추정값 — 운영자 검토 필수' : '모호한 값 — 확인 권장',
      })
    }
  }

  // 첫 미확정 필드에 가이드 아이콘 배치
  const first = firstUnconfirmedField()
  currentGuideFieldId.value = first?.fieldId ?? null
  await nextTick()
  updateIconPos()
})

// ── 액션 ──────────────────────────────────────────────────────────────────────

function handleConfirm(fieldId: string, value: string | number | null) {
  if (!bundleDraft.value) return
  localConfidence.value = { ...localConfidence.value, [fieldId]: '확실' }
  confirmField({ bundleId: bundleDraft.value.bundleId, fieldId, value })
  nextTick(() => {
    const next = firstUnconfirmedField(fieldId)
    currentGuideFieldId.value = next?.fieldId ?? null
    if (next && bodyRef.value) {
      const el = document.getElementById(next.fieldId)
      if (el) {
        const target = el.offsetTop - bodyRef.value.clientHeight / 2 + el.clientHeight / 2
        lerpScrollTo(bodyRef.value, target)
        setTimeout(() => {
          el.querySelector('input')?.click()
        }, 400)
      }
    }
    updateIconPos()
  })
}

function scrollToFirstUnconfirmed(excludeId?: string) {
  if (!bodyRef.value) return
  const field = firstUnconfirmedField(excludeId)
  if (!field) return
  const el = document.getElementById(field.fieldId)
  if (!el) return
  const target = el.offsetTop - bodyRef.value.clientHeight / 2 + el.clientHeight / 2
  lerpScrollTo(bodyRef.value, target)
}


function handleSave() {
  if (!bundleDraft.value) return
  saveBundle(bundleDraft.value.bundleId, {
    onSuccess() { router.push('/iac/3') },
  })
}

</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 헤더 -->
    <div class="px-8 pt-6 pb-4 shrink-0">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h1 class="text-xl font-bold text-text-primary">SLA 검토</h1>
          <p class="text-xs text-text-secondary mt-0.5">AI가 추출한 SLA 항목을 검토하고 확정합니다.</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-text-muted">필드 확정 진행률</p>
          <p class="text-sm font-semibold text-text-primary mt-0.5">{{ confirmedCount }} / {{ totalRequired }}</p>
        </div>
      </div>
      <div class="mt-2 h-1.5 bg-bg-muted rounded-full overflow-hidden">
        <div
          class="h-full transition-all duration-500 rounded-full"
          :style="{ width: `${progressPct}%`, background: 'linear-gradient(90deg, var(--color-brand-light), var(--color-brand))' }"
        />
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-3">
        <div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p class="text-text-secondary">AI가 문서를 분석하고 있습니다...</p>
      </div>
    </div>

    <!-- 바디 -->
    <div
      v-else
      ref="bodyRef"
      class="flex-1 overflow-y-auto relative"
      style="mask-image: linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 24px), transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);"
    >
      <!-- 플로팅 챗봇 가이드 아이콘 -->
      <Transition name="fade">
        <img
          v-if="iconPos"
          src="@/assets/images/chatbot.png"
          alt="AI 가이드"
          class="absolute z-30 w-7 h-7 rounded-full shadow-lg ring-2 ring-white object-cover pointer-events-none"
          :style="{
            top:  `${iconPos.top}px`,
            left: `${iconPos.left}px`,
            transition: 'top 0.48s cubic-bezier(0.4,0,0.2,1), left 0.48s cubic-bezier(0.4,0,0.2,1)',
          }"
        />
      </Transition>

      <div class="divide-y divide-border">
        <section
          v-for="section in groupedReviewSections"
          :key="section.sectionId"
          class="grid gap-10 px-8 py-7"
          style="grid-template-columns: 180px 1fr"
        >
          <!-- 왼쪽: 섹션명 -->
          <div class="pt-0.5 space-y-1.5">
            <h2 class="text-sm font-bold text-text-primary">{{ section.label }}</h2>
            <!-- 서비스 섹션: 서비스 타입 배지 -->
            <span
              v-if="section.isService && section.service"
              class="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-brand/10 text-brand"
            >
              {{ SERVICE_TYPE_LABELS[section.service.serviceType] ?? section.service.serviceType }}
            </span>
          </div>
          <!-- 오른쪽: 필드 그리드 -->
          <div class="grid grid-cols-2 gap-x-8 gap-y-5 pl-8">
            <FormField
              v-for="field in section.fields"
              :key="field.fieldId"
              v-bind="field"
              :confidence="resolvedConfidence(field.fieldId, field.confidence)"
              class="field-stagger"
              :style="{ animationDelay: `${(staggerIndex.get(field.fieldId) ?? 0) * 20}ms` }"
              @confirm="handleConfirm"
            />
          </div>
        </section>
      </div>
    </div>

    <!-- 푸터 -->
    <div class="px-6 py-4 flex items-center justify-between shrink-0">
      <button @click="router.push('/iac/1')" class="flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-muted rounded-lg transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        이전 단계
      </button>
      <div class="flex items-center gap-4">
        <div v-if="!canSave" class="text-right space-y-0.5">
          <p class="text-xs text-text-muted">
            미확정 필드 {{ totalRequired - confirmedCount }}개가 남아있습니다.
          </p>
          <p v-if="p0UnresolvedCount > 0" class="text-[10px] font-semibold text-status-critical flex items-center justify-end gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            P0 검토 필수 {{ p0UnresolvedCount }}건
          </p>
        </div>
        <p v-else class="text-xs text-status-ok flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          모든 필드 확정 완료
        </p>
        <button
          :disabled="!canSave || isSaving"
          @click="handleSave"
          @mouseenter="!canSave ? scrollToFirstUnconfirmed() : undefined"
          class="btn-brand min-w-[180px] flex items-center justify-center gap-2"
        >
          <div v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {{ isSaving ? '저장 중...' : 'SLA Bundle 저장 및 다음' }}
        </button>
      </div>
    </div>
  </div>
</template>
