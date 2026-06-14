<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { useIacStore } from '../stores/iac.store'
import { storeToRefs } from 'pinia'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const props = defineProps<{
  file: File | null
  documentId: 'doc1_contract' | 'doc2_infra'
}>()

const iacStore = useIacStore()
const { activeFieldId, activeDocumentId, bundleDraft } = storeToRefs(iacStore)

const containerRef = ref<HTMLDivElement | null>(null)
const pages = ref<{ num: number; canvas: HTMLCanvasElement | null; overlay: HTMLCanvasElement | null }[]>([])
const error = ref<string | null>(null)
const isLoading = ref(false)

const HIGHLIGHT_PADDING = 100
let pdfDoc: any = null
const renderTasks = new Map<number, any>() 

type TextItem = { str: string; transform: number[]; width?: number }
type Rect = { x: number; y: number; w: number; h: number }

const activeEvidence = computed(() => {
  if (!activeFieldId.value || !bundleDraft.value || activeDocumentId.value !== props.documentId) return null
  const allFields = [...(bundleDraft.value.bundleFields || []), ...(bundleDraft.value.slaItems || [])]
  const field = allFields.find(f => f.fieldId === activeFieldId.value || (f as any).slaItemId === activeFieldId.value)
  return field?.evidence || null
})

async function initPdf() {
  if (!props.file) return
  isLoading.value = true
  error.value = null
  
  for (const task of renderTasks.values()) {
    task.cancel()
  }
  renderTasks.clear()
  pages.value = []

  try {
    const arrayBuffer = await props.file.arrayBuffer()
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    const newPages = []
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      newPages.push({ num: i, canvas: null, overlay: null })
    }
    pages.value = newPages

    await nextTick()
    await renderAllPages()
  } catch (e) {
    console.error('PDF Init Error:', e)
    error.value = 'PDF를 불러올 수 없습니다.'
  } finally {
    isLoading.value = false
  }
}

async function renderAllPages() {
  if (!pdfDoc || !containerRef.value) return

  const containerWidth = containerRef.value.clientWidth - 16
  const dpr = window.devicePixelRatio || 1
  
  for (const pageItem of pages.value) {
    const pageNum = pageItem.num
    const pdfPage = await pdfDoc.getPage(pageNum)
    
    const originalViewport = pdfPage.getViewport({ scale: 1.0 })
    const scale = (containerWidth / originalViewport.width)
    const viewport = pdfPage.getViewport({ scale: scale * dpr })

    const canvas = document.getElementById(`${props.documentId}-canvas-${pageNum}`) as HTMLCanvasElement
    const overlay = document.getElementById(`${props.documentId}-overlay-${pageNum}`) as HTMLCanvasElement
    if (!canvas || !overlay) continue

    canvas.style.width = `${viewport.width / dpr}px`
    canvas.style.height = `${viewport.height / dpr}px`
    overlay.style.width = `${viewport.width / dpr}px`
    overlay.style.height = `${viewport.height / dpr}px`

    canvas.width = viewport.width
    canvas.height = viewport.height
    overlay.width = viewport.width
    overlay.height = viewport.height

    if (renderTasks.has(pageNum)) {
      renderTasks.get(pageNum).cancel()
    }

    const renderTask = pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas })
    renderTasks.set(pageNum, renderTask)

    try {
      await renderTask.promise
      pageItem.canvas = canvas
      pageItem.overlay = overlay
    } catch (err: any) {
      if (err.name === 'RenderingCancelledException') return
      console.error(`Page ${pageNum} render failed:`, err)
    }
  }
}

function findHighlightRects(
  items: TextItem[],
  viewport: any,
  snippet: string,
) {
  const noiseFreeToFull: number[] = []
  let noiseFreeFullText = ''
  // More aggressive noise filtering (remove all non-alphanumeric/korean)
  const isAlphaNum = /[A-Za-z0-9가-힣]/
  
  let fullText = ''
  const itemMap: { start: number; end: number; item: TextItem }[] = []
  for (const item of items) {
    const start = fullText.length
    fullText += item.str
    itemMap.push({ start, end: fullText.length, item })
  }

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i].normalize('NFKC')
    if (isAlphaNum.test(char)) {
      noiseFreeToFull.push(i)
      noiseFreeFullText += char.toLowerCase()
    }
  }

  const nsSnippet = snippet.normalize('NFKC').replace(/[^A-Za-z0-9가-힣]/g, '').toLowerCase()
  if (!nsSnippet) return null

  // Try matching progressively shorter and various chunks
  // Added even shorter fallbacks for problematic fields
  const lengths = [nsSnippet.length, 30, 20, 12, 8]
  let nsIdx = -1
  let nsLen = 0

  for (const len of lengths) {
    if (len > nsSnippet.length) continue
    const q = nsSnippet.slice(0, len)
    if (q.length < 4) continue
    const idx = noiseFreeFullText.indexOf(q)
    if (idx !== -1) {
      nsIdx = idx
      nsLen = q.length
      break
    }
  }

  // Fallback to middle or end of snippet if start didn't match
  if (nsIdx === -1 && nsSnippet.length > 15) {
    const midIdx = Math.floor(nsSnippet.length / 3)
    const q = nsSnippet.slice(midIdx, midIdx + 10)
    const idx = noiseFreeFullText.indexOf(q)
    if (idx !== -1) {
      nsIdx = idx
      nsLen = q.length
    }
  }

  if (nsIdx === -1) {
    console.warn(`[IacPdfViewer] Failed to find snippet: "${snippet.slice(0, 40)}..."`)
    return null
  }

  const matchStart = noiseFreeToFull[nsIdx]
  const matchEnd = noiseFreeToFull[Math.min(nsIdx + nsLen - 1, noiseFreeToFull.length - 1)] + 1

  const rects: Rect[] = []
  let minY = Infinity
  for (const { start, end, item } of itemMap) {
    if (end <= matchStart || start >= matchEnd) continue
    if (!item.transform) continue

    const [, , , scaleY, tx, ty] = item.transform
    const height = Math.abs(scaleY) * 1.2
    const pt = viewport.convertToViewportPoint(tx, ty)
    const rectY = pt[1] - height

    rects.push({ x: pt[0], y: rectY, w: (item.width || 0) * viewport.scale, h: height })
    if (rectY < minY) minY = rectY
  }

  return rects.length > 0 ? { rects, minY } : null
}

async function updateHighlight(ev: any) {
  // Wait for all render tasks to complete before attempting to draw
  if (renderTasks.size > 0) {
    await Promise.all(Array.from(renderTasks.values()).map(t => t.promise.catch(() => {})))
  }

  for (const p of pages.value) {
    if (p.overlay) p.overlay.getContext('2d')!.clearRect(0, 0, p.overlay.width, p.overlay.height)
  }

  if (!ev || !pdfDoc) return
  const pageNum = ev.page || 1
  const snippet = ev.snippet
  if (!snippet) return

  const pageItem = pages.value.find(p => p.num === pageNum)
  if (!pageItem || !pageItem.overlay) return

  const dpr = window.devicePixelRatio || 1
  const pdfPage = await pdfDoc.getPage(pageNum)
  const containerWidth = containerRef.value!.clientWidth - 16
  const originalViewport = pdfPage.getViewport({ scale: 1.0 })
  const viewport = pdfPage.getViewport({ scale: (containerWidth / originalViewport.width) * dpr })

  const textContent = await pdfPage.getTextContent()
  const hl = findHighlightRects(textContent.items as TextItem[], viewport, snippet)

  if (hl) {
    const ctx = pageItem.overlay.getContext('2d')!
    const color = 'rgba(41, 128, 185, 0.9)'
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5 * dpr 
    ctx.lineCap = 'round'
    
    for (const r of hl.rects) {
      ctx.beginPath()
      const yPos = r.y + r.h + (2 * dpr)
      ctx.moveTo(r.x, yPos)
      ctx.lineTo(r.x + r.w, yPos)
      ctx.stroke()
      
      ctx.fillStyle = 'rgba(41, 128, 185, 0.06)'
      ctx.fillRect(r.x, r.y, r.w, r.h)
    }

    const pageEl = document.getElementById(`${props.documentId}-page-${pageNum}`)
    if (pageEl && containerRef.value) {
      const top = pageEl.offsetTop + (hl.minY / dpr) - HIGHLIGHT_PADDING
      containerRef.value.scrollTo({ top, behavior: 'smooth' })
    }
  }
}

watch([activeEvidence, activeDocumentId], async ([newEv, newDocId]) => {
  if (newDocId === props.documentId) {
    await nextTick()
    // Give it a tiny bit of breathing room for CSS display: block to apply and container dimensions to be valid
    setTimeout(() => {
      updateHighlight(newEv)
    }, 50)
  } else {
    for (const p of pages.value) {
      if (p.overlay) p.overlay.getContext('2d')!.clearRect(0, 0, p.overlay.width, p.overlay.height)
    }
  }
})

watch(() => props.file, initPdf, { immediate: true })

onMounted(() => {
  const observer = new ResizeObserver(() => {
    if (pdfDoc) renderAllPages()
  })
  if (containerRef.value) observer.observe(containerRef.value)
})
</script>

<template>
  <div ref="containerRef" class="flex flex-col h-full bg-bg-muted overflow-auto relative custom-scrollbar scroll-smooth p-4 items-center">
    <div v-if="isLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-bg-muted z-20">
      <div class="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin mb-3" />
      <p class="text-xs text-text-muted">문서를 렌더링하고 있습니다...</p>
    </div>

    <div v-if="error" class="flex-1 flex items-center justify-center">
      <p class="text-sm text-status-critical">{{ error }}</p>
    </div>

    <div v-for="page in pages" :key="page.num" :id="`${documentId}-page-${page.num}`" class="relative shadow-xl bg-white mb-8 shrink-0">
      <canvas :id="`${documentId}-canvas-${page.num}`" class="block" />
      <canvas :id="`${documentId}-overlay-${page.num}`" class="absolute inset-0 pointer-events-none" />
      <div class="absolute top-2 right-3 px-1.5 py-0.5 bg-black/5 text-[9px] text-text-muted rounded">P.{{ page.num }}</div>
    </div>

    <div v-if="pages.length > 0" class="h-20 shrink-0" />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
</style>
