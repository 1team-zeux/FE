<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  useIacStore,
  useSlaBundleDraft, useConfirmField, useSaveSlaBundle,
  IacPdfViewer,
  FormField
} from '@/features/iac'
import type { ConfidenceLevel, ActivationStatus, SourceType, AiSuggestion, Evidence } from '@/features/iac'

const router = useRouter()
const iacStore = useIacStore()
const { uploadSessionId, activeDocumentId, pdfFiles, bundleDraft } = storeToRefs(iacStore)

// Redirect back if session or files are missing
if (!uploadSessionId.value || !pdfFiles.value.sla) {
  router.replace('/iac/1')
}

const { data: bundleData, isLoading, error: apiError } = useSlaBundleDraft(uploadSessionId)

watch(bundleData, (newData) => {
  if (newData) iacStore.setBundleDraft(newData)
}, { immediate: true })

const sections = [
  { id: 'sla_basic', label: 'SLA 기본 정보' },
  { id: 'performance', label: '성능 및 트래픽' },
  { id: 'infra', label: '인프라 및 가용성' },
  { id: 'cost', label: '비용 정보' },
  { id: 'compliance', label: '컴플라이언스 및 보안' },
  { id: 'db', label: '데이터베이스 요구사항' },
]

const { mutate: confirmField } = useConfirmField()
const { mutate: saveBundle, isPending: isSaving } = useSaveSlaBundle()

// ── Local Navigation & Guide Logic ───────────────────────────────────────────

const leftScrollRef = ref<HTMLElement | null>(null)
const currentGuideFieldId = ref<string | null>(null)
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
    if (Math.abs(delta) < 0.5) {
      container.scrollTop = target
      scrollRafId = null
      return
    }
    container.scrollTop += delta * 0.08
    scrollRafId = requestAnimationFrame(step)
  }
  scrollRafId = requestAnimationFrame(step)
}

// User interaction cancels auto-scroll
let bodyListenerAttached = false
watch(leftScrollRef, (el) => {
  if (el && !bodyListenerAttached) {
    el.addEventListener('wheel', cancelScrollRaf, { passive: true })
    el.addEventListener('touchstart', cancelScrollRaf, { passive: true })
    bodyListenerAttached = true
  }
})

function firstUnconfirmedField(excludeId?: string): string | null {
  if (!bundleDraft.value) return null
  const allFields = [
    ...bundleDraft.value.bundleFields,
    ...bundleDraft.value.slaItems.map(i => ({ ...i, fieldId: i.slaItemId }))
  ]
  for (const f of allFields) {
    if (f.fieldId === excludeId) continue
    if (f.activationStatus === 'inactive') continue
    if (f.confidence === '추정' || f.confidence === '모호') return f.fieldId
  }
  return null
}

const confirmedCount = computed(() => bundleData.value?.confirmedCount ?? 0)
const totalRequired = computed(() => bundleData.value?.totalRequiredCount ?? 0)
const canSave = computed(() => confirmedCount.value >= totalRequired.value && totalRequired.value > 0)

function handleConfirm(fieldId: string, value: string | number | null) {
  confirmField({ bundleId: bundleData.value!.bundleId, fieldId, value })
  nextTick(() => {
    const nextId = firstUnconfirmedField(fieldId)
    currentGuideFieldId.value = nextId
    if (nextId && leftScrollRef.value) {
      const el = document.getElementById(nextId)
      if (el) {
        const target = el.offsetTop - leftScrollRef.value.clientHeight / 2 + el.clientHeight / 2
        lerpScrollTo(leftScrollRef.value, target)
      }
    }
  })
}

function scrollToFirstUnconfirmed() {
  if (!leftScrollRef.value) return
  const nextId = firstUnconfirmedField()
  if (!nextId) return
  const el = document.getElementById(nextId)
  if (!el) return
  const target = el.offsetTop - leftScrollRef.value.clientHeight / 2 + el.clientHeight / 2
  lerpScrollTo(leftScrollRef.value, target)
  currentGuideFieldId.value = nextId
}

async function handleNext() {
  if (!bundleData.value) return
  saveBundle(bundleData.value.bundleId, {
    onSuccess: (data) => {
      if (bundleDraft.value) {
        iacStore.setBundleDraft({ ...bundleDraft.value, bundleId: data.bundleId })
      }
      router.push('/iac/3')
    },
  })
}

watch([bundleData, currentGuideFieldId], () => {
  if (bundleData.value && !currentGuideFieldId.value) {
    currentGuideFieldId.value = firstUnconfirmedField()
  }
})

onUnmounted(() => {
  iacStore.setActiveField(null)
  cancelScrollRaf()
  leftScrollRef.value?.removeEventListener('wheel', cancelScrollRaf)
  leftScrollRef.value?.removeEventListener('touchstart', cancelScrollRaf)
})
</script>

<template>
  <div class="h-full flex flex-col bg-bg-page overflow-hidden">
    <header class="h-14 bg-white border-b border-border flex items-center px-6 shrink-0 z-20 shadow-sm">
      <div class="flex items-center gap-4">
        <button @click="router.back()" class="p-2 hover:bg-bg-muted rounded-full transition-colors">
          <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 class="text-base font-bold text-text-primary">SLA 및 인프라 요구사항 검토</h1>
          <p class="text-[11px] text-text-muted">문서에서 추출된 내용을 확인하고 확정해 주세요.</p>
        </div>
      </div>
      <div class="ml-auto flex items-center gap-6">
        <div v-if="bundleData" class="flex flex-col items-end">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">Review Progress</span>
            <span class="text-xs font-bold text-brand">{{ confirmedCount }} / {{ totalRequired }}</span>
          </div>
          <div class="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
            <div 
              class="h-full bg-brand transition-all duration-500 ease-out shadow-[0_0_8px_rgba(41,128,185,0.4)]"
              :style="{ width: `${(confirmedCount / totalRequired) * 100}%` }"
            />
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 flex overflow-hidden">
      <section class="w-3/5 flex flex-col bg-white border-r border-border overflow-hidden relative">
        <div v-if="apiError" class="absolute inset-0 flex flex-col items-center justify-center bg-white z-20 p-8 text-center">
          <button @click="router.replace('/iac/1')" class="btn-brand">다시 시도하기</button>
        </div>
        <div v-if="isLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
          <div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
          <p class="text-sm font-medium text-text-secondary">AI 분석 결과를 불러오는 중...</p>
        </div>
        <div v-else-if="bundleData" ref="leftScrollRef" class="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
          <div v-for="section in sections" :key="section.id" class="mb-10 last:mb-20">
            <h2 class="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <span class="w-1 h-4 bg-brand rounded-full" />
              {{ section.label }}
            </h2>
            <div class="grid grid-cols-2 gap-4">
              <FormField
                v-for="field in bundleData.bundleFields.filter(f => f.sectionId === section.id)"
                :key="field.fieldId"
                v-bind="field"
                @confirm="handleConfirm"
              />
              <template v-if="section.id === 'performance'">
                <FormField
                  v-for="item in bundleData.slaItems"
                  :key="item.slaItemId"
                  :field-id="item.slaItemId"
                  :label="item.label"
                  :value="item.targetValue"
                  :confidence="item.confidence"
                  :required="item.required"
                  :unit="item.unit"
                  :description="item.description ?? undefined"
                  :source="item.source"
                  :suggestions="item.suggestions"
                  :evidence="item.evidence"
                  @confirm="handleConfirm"
                />
              </template>
            </div>
          </div>
        </div>
        <div class="p-4 bg-gray-50 border-t border-border flex justify-between items-center shrink-0">
          <p class="text-[11px] text-text-muted">
            <span class="font-bold text-status-critical">*</span> 필수 항목을 모두 확정해야 다음 단계로 진행할 수 있습니다.
          </p>
          <button
            @click="handleNext"
            @mouseenter="!canSave ? scrollToFirstUnconfirmed() : undefined"
            :disabled="isSaving || !canSave"
            class="btn-brand h-10 px-8 text-sm flex items-center gap-2 shadow-md disabled:shadow-none disabled:grayscale"
          >
            <div v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ isSaving ? '저장 중...' : 'SLA Bundle 저장 및 다음' }}
          </button>
        </div>
      </section>
      <!-- Right: PDF Viewer -->
      <section class="w-2/5 h-full relative overflow-hidden bg-bg-muted shadow-inner border-l border-border">
        <div class="absolute inset-0 z-0">
          <IacPdfViewer v-if="pdfFiles.sla" :file="pdfFiles.sla" document-id="doc1_contract" />
        </div>
        <Transition name="pdf-slide">
          <div v-show="activeDocumentId === 'doc2_infra' && pdfFiles.infra" class="absolute inset-0 z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.15)] bg-bg-muted">
            <IacPdfViewer v-if="pdfFiles.infra" :file="pdfFiles.infra" document-id="doc2_infra" />
          </div>
        </Transition>
      </section>

    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }

.pdf-slide-enter-active, .pdf-slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.pdf-slide-enter-from, .pdf-slide-leave-to { transform: translateX(100%); }
.pdf-slide-enter-to, .pdf-slide-leave-from { transform: translateX(0); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
