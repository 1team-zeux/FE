<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker — use the bundled legacy worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const props = defineProps<{
  file: File
  page: number       // 1-based
  snippet?: string   // text to highlight
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const overlayRef = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function render() {
  if (!canvasRef.value || !overlayRef.value) return
  loading.value = true
  error.value = null

  try {
    const arrayBuffer = await props.file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pageNum = Math.min(Math.max(props.page, 1), pdf.numPages)
    const pdfPage = await pdf.getPage(pageNum)

    const viewport = pdfPage.getViewport({ scale: 1.4 })
    const canvas = canvasRef.value
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')!
    await pdfPage.render({ canvasContext: ctx, viewport }).promise

    // Overlay canvas (same size)
    const overlay = overlayRef.value
    overlay.width = viewport.width
    overlay.height = viewport.height

    if (props.snippet) {
      await highlightSnippet(pdfPage, viewport, overlay, props.snippet)
    }
  } catch (e) {
    error.value = 'PDF를 불러올 수 없습니다.'
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function highlightSnippet(
  pdfPage: pdfjsLib.PDFPageProxy,
  viewport: pdfjsLib.PageViewport,
  overlay: HTMLCanvasElement,
  snippet: string,
) {
  const textContent = await pdfPage.getTextContent()
  const ctx = overlay.getContext('2d')!
  ctx.clearRect(0, 0, overlay.width, overlay.height)

  // Normalize snippet for fuzzy matching (strip whitespace, lowercase)
  const normalizedSnippet = snippet.replace(/\s+/g, ' ').toLowerCase().trim().slice(0, 60)

  const items = textContent.items as pdfjsLib.TextItem[]
  // Build full text with item index map
  let fullText = ''
  const itemMap: { start: number; end: number; item: pdfjsLib.TextItem }[] = []
  for (const item of items) {
    const start = fullText.length
    fullText += item.str
    itemMap.push({ start, end: fullText.length, item })
  }

  const normalizedFull = fullText.replace(/\s+/g, ' ').toLowerCase()
  const idx = normalizedFull.indexOf(normalizedSnippet)
  if (idx === -1) return

  // Find items that overlap with the match range
  ctx.fillStyle = 'rgba(255, 220, 0, 0.45)'
  for (const { start, end, item } of itemMap) {
    if (end <= idx || start >= idx + normalizedSnippet.length) continue
    if (!item.transform) continue

    // pdfjs transform: [scaleX, skewX, skewY, scaleY, tx, ty]
    const [, , , scaleY, tx, ty] = item.transform
    const height = Math.abs(scaleY) * 1.2
    const width = (item.width || 0)
    const pt = viewport.convertToViewportPoint(tx, ty)

    ctx.fillRect(pt[0], pt[1] - height, width * viewport.scale, height)
  }
}

onMounted(render)
watch(() => [props.file, props.page, props.snippet], render)
</script>

<template>
  <div class="relative bg-white rounded-lg overflow-hidden" style="max-height: 420px; overflow-y: auto;">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center h-48">
      <svg class="animate-spin w-6 h-6 text-brand/40" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center h-24 text-xs text-text-muted px-4 text-center">
      {{ error }}
    </div>

    <!-- Canvas stack -->
    <div v-show="!loading && !error" class="relative">
      <canvas ref="canvasRef" class="block w-full" />
      <canvas
        ref="overlayRef"
        class="absolute inset-0 w-full pointer-events-none"
      />
    </div>
  </div>
</template>
