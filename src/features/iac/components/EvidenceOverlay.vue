<script setup lang="ts">
import type { SourceType, Evidence } from '../types/sla-bundle.schema'
import PdfEvidenceViewer from './PdfEvidenceViewer.vue'

defineProps<{
  source?: SourceType
  evidence?: Evidence
  evidencePdfFile?: File | null
  description?: string
}>()
</script>

<template>
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
</template>
