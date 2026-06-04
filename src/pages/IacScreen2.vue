<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  useIacStore,
  useSlaBundleDraft, useConfirmField, useSaveSlaBundle,
  SectionNav, FormField,
} from '@/features/iac'
import type { SLASection } from '@/features/iac'

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

const activeSection = ref('availability')

const sections = computed<SLASection[]>(() => {
  if (!bundleDraft.value) return []
  const sectionMap = new Map<string, SLASection>()
  for (const item of bundleDraft.value.items) {
    const existing = sectionMap.get(item.sectionId)
    if (!existing) {
      sectionMap.set(item.sectionId, {
        sectionId: item.sectionId,
        label: item.sectionId,
        ambiguousCount: item.confidence === '모호' ? 1 : 0,
        estimatedCount: item.confidence === '추정' ? 1 : 0,
      })
    } else {
      if (item.confidence === '모호') existing.ambiguousCount++
      if (item.confidence === '추정') existing.estimatedCount++
    }
  }
  return Array.from(sectionMap.values())
})

const activeItems = computed(() =>
  bundleDraft.value?.items.filter((i) => i.sectionId === activeSection.value) ?? []
)

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
    <div class="px-6 pt-4 pb-2 bg-bg-card border-b border-border">
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-text-secondary">필드 확정 진행률</span>
        <span class="font-medium text-text-primary">
          {{ bundleDraft?.confirmedCount ?? 0 }} / {{ bundleDraft?.totalRequiredCount ?? 47 }} 확정
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

    <div v-else class="flex flex-1 overflow-hidden">
      <div class="p-4 border-r border-border overflow-y-auto">
        <SectionNav
          :sections="sections"
          :active-section="activeSection"
          @select="activeSection = $event"
        />
      </div>

      <div class="flex-1 p-6 overflow-y-auto space-y-3">
        <FormField
          v-for="item in activeItems"
          :key="item.fieldId"
          v-bind="item"
          @confirm="handleConfirm"
        />
      </div>
    </div>

    <div class="px-6 py-4 border-t border-border bg-bg-card flex justify-end">
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
