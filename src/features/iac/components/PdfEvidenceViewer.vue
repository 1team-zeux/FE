<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const props = defineProps<{
  file: File
  page: number
  snippet?: string
}>()

const emit = defineEmits<{ ready: [] }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const overlayRef = ref<HTMLCanvasElement | null>(null)
const error = ref<string | null>(null)

const SCALE = 2.5
const CROP_PADDING = 50

type TextItem = { str: string; transform: number[]; width?: number }
type Rect = { x: number; y: number; w: number; h: number }
type HighlightResult = { rects: Rect[]; minY: number; maxY: number }

function findHighlightRects(
  items: TextItem[],
  viewport: pdfjsLib.PageViewport,
  snippet: string,
): HighlightResult | null {
  // Concatenate all items with NO separator — Korean PDFs emit char-by-char items
  let fullText = ''
  const itemMap: { start: number; end: number; item: TextItem }[] = []
  for (const item of items) {
    const start = fullText.length
    fullText += item.str
    itemMap.push({ start, end: fullText.length, item })
  }

  // Strip ALL "noise" (non-alphanumeric) from both texts for robust matching
  // Build mapping: noiseFreeToFull[i] = index in fullText for noise-free char i
  const noiseFreeToFull: number[] = []
  let noiseFreeFull = ''
  const isAlphaNum = /[A-Za-z0-9가-힣]/
  
  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i].normalize('NFKC')
    if (isAlphaNum.test(char)) {
      noiseFreeToFull.push(i)
      noiseFreeFull += char.toLowerCase()
    }
  }

  // Normalize snippet the same way
  const nsSnippet = snippet.normalize('NFKC').replace(/[^A-Za-z0-9가-힣]/g, '').toLowerCase()
  if (!nsSnippet) return null

  // Try matching progressively shorter chunks of the snippet
  const lengths = [nsSnippet.length, 50, 30, 20, 15]
  let nsIdx = -1
  let nsLen = 0

  for (const len of lengths) {
    const q = nsSnippet.slice(0, len)
    if (q.length < 4) continue
    const idx = noiseFreeFull.indexOf(q)
    if (idx !== -1) {
      nsIdx = idx
      nsLen = q.length
      break
    }
  }

  // If still not found, try searching for the MIDDLE part of the snippet
  if (nsIdx === -1 && nsSnippet.length > 20) {
    const q = nsSnippet.slice(Math.floor(nsSnippet.length / 4), Math.floor(nsSnippet.length / 4) + 20)
    const idx = noiseFreeFull.indexOf(q)
    if (idx !== -1) {
      nsIdx = idx
      nsLen = q.length
    }
  }

  if (nsIdx === -1) return null

  // Map back to fullText positions
  const matchStart = noiseFreeToFull[nsIdx]
  const matchEnd = noiseFreeToFull[Math.min(nsIdx + nsLen - 1, noiseFreeToFull.length - 1)] + 1

  const rects: Rect[] = []
  let minY = Infinity
  let maxY = -Infinity

  for (const { start, end, item } of itemMap) {
    if (end <= matchStart || start >= matchEnd) continue
    if (!item.transform) continue

    const [, , , scaleY, tx, ty] = item.transform
    const height = Math.abs(scaleY) * 1.2
    const width = item.width ?? 0
    const pt = viewport.convertToViewportPoint(tx, ty)
    const rectY = pt[1] - height

    rects.push({ x: pt[0], y: rectY, w: width * viewport.scale, h: height })
    if (rectY < minY) minY = rectY
    if (rectY + height > maxY) maxY = rectY + height
  }

  return rects.length > 0 ? { rects, minY, maxY } : null
}

function drawHighlights(overlay: HTMLCanvasElement, rects: Rect[], cropY: number) {
  const ctx = overlay.getContext('2d')!
  ctx.clearRect(0, 0, overlay.width, overlay.height)

  // C-Style: Minimal Underline with Brand Color
  const UNDERLINE_COLOR = 'rgba(41, 128, 185, 0.85)' // Vibrant brand color
  const SUBTLE_BG = 'rgba(41, 128, 185, 0.06)'      // Extremely subtle fill to guide eye
  
  for (const r of rects) {
    const x = r.x
    const y = r.y - cropY
    
    // 1. Draw subtle background (full height)
    ctx.fillStyle = SUBTLE_BG
    ctx.fillRect(x, y, r.w, r.h)

    // 2. Draw Minimal Underline (thick line at bottom)
    const thickness = 3.5
    const lineY = y + r.h - (thickness / 2)
    const radius = thickness / 2

    ctx.beginPath()
    ctx.strokeStyle = UNDERLINE_COLOR
    ctx.lineWidth = thickness
    ctx.lineCap = 'round'
    ctx.moveTo(x + radius, lineY)
    ctx.lineTo(x + r.w - radius, lineY)
    ctx.stroke()
  }
}

async function render() {
  if (!canvasRef.value || !overlayRef.value) return
  error.value = null

  try {
    const arrayBuffer = await props.file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pageNum = Math.min(Math.max(props.page, 1), pdf.numPages)
    const pdfPage = await pdf.getPage(pageNum)
    const viewport = pdfPage.getViewport({ scale: SCALE })

    // Render full page to offscreen canvas
    const offscreen = document.createElement('canvas')
    offscreen.width = viewport.width
    offscreen.height = viewport.height
    await pdfPage.render({ canvas: offscreen, canvasContext: offscreen.getContext('2d')!, viewport }).promise

    // Find highlight bounding box
    let hl: HighlightResult | null = null
    if (props.snippet) {
      const textContent = await pdfPage.getTextContent()
      hl = findHighlightRects(textContent.items as TextItem[], viewport, props.snippet)
    }

    // Crop region: around highlight or full page
    const cropY = hl ? Math.max(0, hl.minY - CROP_PADDING) : 0
    const cropH = hl
      ? Math.min(hl.maxY + CROP_PADDING - cropY, viewport.height - cropY)
      : viewport.height

    // Copy cropped region to visible canvas
    const canvas = canvasRef.value
    canvas.width = viewport.width
    canvas.height = cropH
    canvas.getContext('2d')!.drawImage(offscreen, 0, cropY, viewport.width, cropH, 0, 0, viewport.width, cropH)

    // Draw highlights offset by cropY
    const overlay = overlayRef.value
    overlay.width = viewport.width
    overlay.height = cropH
    if (hl) drawHighlights(overlay, hl.rects, cropY)
  } catch (e) {
    error.value = 'PDF를 불러올 수 없습니다.'
    console.error(e)
  } finally {
    emit('ready')
  }
}

onMounted(render)
watch(() => [props.file, props.page, props.snippet], render)
</script>

<template>
  <div class="relative bg-white">
    <div v-if="error" class="flex items-center justify-center h-12 text-xs text-text-muted px-4 text-center">
      {{ error }}
    </div>
    <div v-else class="relative">
      <canvas ref="canvasRef" class="block w-full bg-white" />
      <canvas ref="overlayRef" class="absolute inset-0 w-full pointer-events-none" />
    </div>
  </div>
</template>
