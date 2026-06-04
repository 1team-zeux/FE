<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  useIacStore,
  useSlaBundleDraft, useConfirmField, useSaveSlaBundle,
  FormField,
} from '@/features/iac'

const SECTION_LABELS: Record<string, string> = {
  availability: '가용성',
  recovery: '복구 목표 (RTO / RPO)',
  performance: '성능',
  cost: '비용',
  infra: '인프라',
  backup: '백업',
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

const progressPct = computed(() => {
  if (!bundleDraft.value) return 0
  return Math.round((bundleDraft.value.confirmedCount / bundleDraft.value.totalRequiredCount) * 100)
})

const canSave = computed(() =>
  bundleDraft.value !== null &&
  bundleDraft.value.confirmedCount === bundleDraft.value.totalRequiredCount
)

function handleConfirm(fieldId: string, value: string | number | null) {
  if (!bundleDraft.value) return
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
    <!-- 진행도 바 -->
    <div class="px-6 pt-4 pb-2 bg-bg-card border-b border-border shrink-0">
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-text-secondary">필드 확정 진행률</span>
        <span class="font-medium text-text-primary">
          {{ bundleDraft?.confirmedCount ?? 0 }} / {{ bundleDraft?.totalRequiredCount ?? 0 }} 확정
        </span>
      </div>
      <div class="h-2 bg-bg-muted rounded-full overflow-hidden">
        <div
          class="h-full bg-brand transition-all duration-500 rounded-full"
          :style="{ width: `${progressPct}%` }"
        />
      </div>
    </div>

    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-3">
        <div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p class="text-text-secondary">AI가 문서를 분석하고 있습니다...</p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto px-8 py-6 space-y-8">
      <section v-for="{ sectionId, items } in groupedSections" :key="sectionId">
        <h2 class="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">
          {{ SECTION_LABELS[sectionId] ?? sectionId }}
        </h2>
        <div class="grid grid-cols-2 gap-3">
          <FormField
            v-for="item in items"
            :key="item.fieldId"
            v-bind="item"
            class="field-stagger"
            :style="{ animationDelay: `${(staggerIndex.get(item.fieldId) ?? 0) * 60}ms` }"
            @confirm="handleConfirm"
          />
        </div>
      </section>
    </div>

    <div class="px-6 py-4 border-t border-border bg-bg-card flex justify-end shrink-0">
      <button
        :disabled="!canSave || isSaving"
        @click="handleSave"
        class="btn-brand min-w-[180px]"
      >
        {{ isSaving ? '저장 중...' : 'SLA Bundle 저장 및 다음' }}
      </button>
    </div>
  </div>
</template>
