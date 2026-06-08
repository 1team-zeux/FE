<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  useIacStore,
  useSlaBundleDraft, useConfirmField, useSaveSlaBundle,
  FormField,
} from '@/features/iac'
import type { ConfidenceLevel } from '@/features/iac'

const SECTION_LABELS: Record<string, string> = {
  sla_basic:    'SLA 기본 정보',
  availability: '가용성',
  latency:      '지연 시간',
  recovery:     '복구 목표 (RTO / RPO)',
  performance:  '성능 / 트래픽',
  infra:        '인프라 / 리전',
  cost:         '비용',
  compliance:   '보안 / 컴플라이언스',
  db:           'DB / 데이터',
}

const store = useIacStore()
const router = useRouter()
const { uploadSessionId, bundleDraft } = storeToRefs(store)

const { data: bundleData, isLoading } = useSlaBundleDraft(uploadSessionId)

watch(bundleData, (data) => {
  if (!data) return
  store.setBundleDraft(data)
  const triggers = data.items
    .filter((i) => i.confidence === '추정' || i.confidence === '모호')
    .map((i) => ({
      fieldId: i.fieldId,
      priority: i.confidence === '추정' ? 'P0' as const : 'P1' as const,
      reason: i.confidence === '추정' ? 'LLM 추정값 — 운영자 검토 필수' : '모호한 값 — 확인 권장',
    }))
  triggers.forEach((t) => store.addChatbotTrigger(t))
})

const { mutate: confirmField } = useConfirmField()
const { mutate: saveBundle, isPending: isSaving } = useSaveSlaBundle()

// 로컬 confidence 오버라이드: 체크 버튼 클릭 시 '확실'로 변경
const localConfidence = ref<Record<string, ConfidenceLevel>>({})

const groupedSections = computed(() => {
  if (!bundleDraft.value) return []
  const map = new Map<string, typeof bundleDraft.value.items>()
  for (const item of bundleDraft.value.items) {
    if (!map.has(item.sectionId)) map.set(item.sectionId, [])
    map.get(item.sectionId)!.push(item)
  }
  return Array.from(map.entries()).map(([sectionId, items]) => ({ sectionId, items }))
})

// global index for stagger across all sections
const staggerIndex = computed(() => {
  const idx = new Map<string, number>()
  let i = 0
  for (const { items } of groupedSections.value) {
    for (const item of items) {
      idx.set(item.fieldId, i++)
    }
  }
  return idx
})

// 로컬 오버라이드를 반영한 실제 confidence 반환
function resolvedConfidence(item: { fieldId: string; confidence: ConfidenceLevel }): ConfidenceLevel {
  return localConfidence.value[item.fieldId] ?? item.confidence
}

// 진행률: 확실·확정인 필드 수 / 전체 required 수
const confirmedCount = computed(() => {
  if (!bundleDraft.value) return 0
  return bundleDraft.value.items.filter(item =>
    item.required && (resolvedConfidence(item) === '확실' || resolvedConfidence(item) === '확정')
  ).length
})

const totalRequired = computed(() => bundleDraft.value?.items.filter(i => i.required).length ?? 0)

const progressPct = computed(() =>
  totalRequired.value > 0 ? Math.round((confirmedCount.value / totalRequired.value) * 100) : 0
)

const canSave = computed(() => confirmedCount.value === totalRequired.value && totalRequired.value > 0)

function handleConfirm(fieldId: string, value: string | number | null) {
  if (!bundleDraft.value) return
  // 로컬에서 즉시 confidence를 '확실'로 변경
  localConfidence.value = { ...localConfidence.value, [fieldId]: '확실' }
  // 백엔드에도 동기화
  confirmField({ bundleId: bundleDraft.value.bundleId, fieldId, value })
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

    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-3">
        <div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p class="text-text-secondary">AI가 문서를 분석하고 있습니다...</p>
      </div>
    </div>

    <!-- 바디 -->
    <div
      v-else
      class="flex-1 overflow-y-auto"
      style="mask-image: linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 24px), transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);"
    >
      <div class="divide-y divide-border">
        <section
          v-for="{ sectionId, items } in groupedSections"
          :key="sectionId"
          class="grid gap-10 px-8 py-7"
          style="grid-template-columns: 180px 1fr"
        >
          <!-- 왼쪽: 섹션명 -->
          <div class="pt-0.5">
            <h2 class="text-sm font-bold text-text-primary">{{ SECTION_LABELS[sectionId] ?? sectionId }}</h2>
          </div>
          <!-- 오른쪽: 필드 그리드 -->
          <div class="grid grid-cols-2 gap-x-8 gap-y-5">
            <FormField
              v-for="item in items"
              :key="item.fieldId"
              v-bind="item"
              :confidence="resolvedConfidence(item)"
              class="field-stagger"
              :style="{ animationDelay: `${(staggerIndex.get(item.fieldId) ?? 0) * 60}ms` }"
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
      <p v-if="!canSave" class="text-xs text-text-muted">
        미확정 필드 {{ totalRequired - confirmedCount }}개가 남아있습니다.
      </p>
      <p v-else class="text-xs text-status-ok flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
        모든 필드 확정 완료
      </p>
      <button
        :disabled="!canSave || isSaving"
        @click="handleSave"
        class="btn-brand min-w-[180px] flex items-center justify-center gap-2"
      >
        <div v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        {{ isSaving ? '저장 중...' : 'SLA Bundle 저장 및 다음' }}
      </button>
      </div>
    </div>
  </div>
</template>
