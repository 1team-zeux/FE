<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  label: string
  accept: string
  description?: string
  allowedExtensions?: string[]
  maxSizeMb?: number
}>()

const emit = defineEmits<{
  select: [file: File]
}>()

const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const errorMsg = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const extensions = computed(() => props.allowedExtensions ?? ['.pdf'])
const maxMb = computed(() => props.maxSizeMb ?? 50)
const extensionLabel = computed(() =>
  extensions.value.map(e => e.replace('.', '').toUpperCase()).join('/'),
)

function validateFile(file: File): string | null {
  const nameLower = file.name.toLowerCase()
  const allowed = extensions.value.some(ext => nameLower.endsWith(ext))
  if (!allowed) {
    return `${extensionLabel.value} 파일만 업로드 가능합니다.`
  }
  if (file.size > maxMb.value * 1024 * 1024) {
    return `파일 크기는 ${maxMb.value}MB 이하여야 합니다.`
  }
  return null
}

function handleFile(file: File) {
  const err = validateFile(file)
  if (err) {
    errorMsg.value = err
    selectedFile.value = null
    return
  }
  errorMsg.value = null
  selectedFile.value = file
  emit('select', file)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function formatSize(bytes: number) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${(bytes / 1024).toFixed(0)}KB`
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-sm font-semibold text-text-primary">{{ label }}</label>
    <div
      class="relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
      :class="{
        'border-brand bg-brand-subtle': isDragging,
        'border-status-ok bg-green-50': selectedFile,
        'border-status-critical bg-red-50': errorMsg,
        'border-border bg-bg-card hover:border-brand hover:bg-brand-subtle': !isDragging && !selectedFile && !errorMsg,
      }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        class="hidden"
        @change="onFileChange"
      />

      <div v-if="!selectedFile" class="space-y-2">
        <svg class="w-10 h-10 mx-auto" :class="errorMsg ? 'text-status-critical' : 'text-text-muted'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p data-testid="upload-status" class="text-sm text-text-secondary">
          {{ errorMsg ?? `${extensionLabel} 파일을 드래그하거나 클릭하여 선택` }}
        </p>
        <p class="text-xs text-text-muted">최대 {{ maxMb }}MB</p>
      </div>

      <div v-else class="space-y-1">
        <svg class="w-10 h-10 mx-auto text-status-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <p data-testid="upload-status" class="text-sm font-medium text-status-ok">{{ selectedFile.name }}</p>
        <p class="text-xs text-text-muted">{{ formatSize(selectedFile.size) }}</p>
        <button
          class="text-xs text-text-secondary underline"
          @click.stop="selectedFile = null; errorMsg = null"
        >파일 변경</button>
      </div>
    </div>
    <p v-if="description" class="text-xs text-text-muted">{{ description }}</p>
  </div>
</template>
