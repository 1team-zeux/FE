<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import type { FinOpsRun } from '../types/finops.schema'
import { buildExecutiveReportMarkdown, downloadExecutiveReportMarkdown } from '../utils/executiveReportMarkdown'

const props = defineProps<{
  run: FinOpsRun
}>()

const viewMode = ref<'preview' | 'source'>('preview')

const markdown = computed(() => buildExecutiveReportMarkdown(props.run))

const html = computed(() =>
  marked.parse(markdown.value, { async: false, gfm: true }) as string,
)

const onDownload = () => downloadExecutiveReportMarkdown(props.run)
</script>

<template>
  <article class="finops-md-report bg-bg-card border border-border rounded-xl overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-border bg-bg-muted">
      <div>
        <h3 class="text-sm font-bold text-text-primary">마크다운 경영 보고서</h3>
        <p class="text-[11px] text-gray-500 mt-0.5">단일 .md 파일과 동일한 내용 · 공유·버전관리용</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex rounded-md border border-border overflow-hidden text-[11px] font-bold">
          <button
            type="button"
            class="px-3 py-1.5 transition-colors"
            :class="viewMode === 'preview' ? 'bg-brand text-white' : 'bg-bg-card text-gray-500 hover:bg-bg-muted'"
            @click="viewMode = 'preview'"
          >
            미리보기
          </button>
          <button
            type="button"
            class="px-3 py-1.5 transition-colors border-l border-border"
            :class="viewMode === 'source' ? 'bg-brand text-white' : 'bg-bg-card text-gray-500 hover:bg-bg-muted'"
            @click="viewMode = 'source'"
          >
            원문 (.md)
          </button>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 rounded-md border border-border bg-bg-card text-[11px] font-bold hover:bg-bg-muted"
          @click="onDownload"
        >
          다운로드 ↓
        </button>
      </div>
    </div>

    <div
      v-if="viewMode === 'preview'"
      class="md-preview px-6 py-6 prose prose-sm max-w-none text-text-primary"
      v-html="html"
    />
    <pre
      v-else
      class="md-source p-6 text-[12px] leading-relaxed font-mono text-gray-300 bg-[#0d1117] overflow-x-auto whitespace-pre-wrap"
    >{{ markdown }}</pre>
  </article>
</template>

<style scoped>
.md-preview :deep(h1) {
  font-size: 1.35rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
}
.md-preview :deep(h2) {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}
.md-preview :deep(p) {
  margin: 0.5rem 0;
  line-height: 1.65;
  font-size: 0.9rem;
}
.md-preview :deep(blockquote) {
  margin: 0.75rem 0;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid #6366f1;
  background: rgba(99, 102, 241, 0.06);
  color: #6b7280;
  font-size: 0.8rem;
}
.md-preview :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  margin: 0.75rem 0;
}
.md-preview :deep(th),
.md-preview :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.4rem 0.6rem;
  text-align: left;
}
.md-preview :deep(th) {
  background: #f9fafb;
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
}
.md-preview :deep(ul) {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
}
.md-preview :deep(li) {
  margin: 0.25rem 0;
}
.md-preview :deep(code) {
  font-family: ui-monospace, monospace;
  font-size: 0.8em;
  background: #f3f4f6;
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.md-preview :deep(hr) {
  margin: 1.5rem 0;
  border-color: #e5e7eb;
}
.md-preview :deep(strong) {
  font-weight: 700;
}
</style>
