<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { TopologyDraft, TopologyNode, TopologyEdge } from '../types/topology.schema'
import TopologyCanvas from './TopologyCanvas.vue'
import ResourcePalette from './ResourcePalette.vue'
import { NODE_ICONS as ICONS } from '../utils/awsIcons'

const props = defineProps<{ topology: TopologyDraft }>()

const nodes = ref<TopologyNode[]>([...props.topology.nodes])
const edges = ref<TopologyEdge[]>([...props.topology.edges])
const groups = computed(() => props.topology.groups ?? [])

watch(() => props.topology, (t) => {
  nodes.value = [...t.nodes]
  edges.value = [...t.edges]
  requestAnimationFrame(() => requestAnimationFrame(centerView))
})

// ── 줌 ──────────────────────────────────────────────
const zoom = ref(0.6)
const ZOOM_MIN = 0.25
const ZOOM_MAX = 2.0

// ── 스크롤 컨테이너 ──────────────────────────────────
const scrollEl = ref<HTMLDivElement | null>(null)

function centerView() {
  if (!scrollEl.value) return
  const el = scrollEl.value
  el.scrollLeft = (3000 * zoom.value - el.clientWidth)  / 2
  el.scrollTop  = (2000 * zoom.value - el.clientHeight) / 2
}

function onWheel(e: WheelEvent) {
  if (!e.ctrlKey) return
  e.preventDefault()
  const el = scrollEl.value!
  const oldZoom = zoom.value
  const delta = -e.deltaY * 0.004
  const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(oldZoom + delta).toFixed(3)))
  if (newZoom === oldZoom) return
  const rect = el.getBoundingClientRect()
  const cursorX = e.clientX - rect.left + el.scrollLeft
  const cursorY = e.clientY - rect.top  + el.scrollTop
  zoom.value = newZoom
  nextTick(() => {
    const ratio = newZoom / oldZoom
    el.scrollLeft = cursorX * ratio - (e.clientX - rect.left)
    el.scrollTop  = cursorY * ratio - (e.clientY - rect.top)
  })
}

onMounted(() => {
  requestAnimationFrame(() => requestAnimationFrame(centerView))
  scrollEl.value?.addEventListener('wheel', onWheel, { passive: false })
})
onUnmounted(() => {
  scrollEl.value?.removeEventListener('wheel', onWheel)
})

// ── 노드 선택 → 선정 이유 카드 포커스 ────────────────
const selectedNodeId = ref<string | null>(null)

const rationaleCardRefs = ref<Record<string, HTMLElement>>({})

function onCanvasNodeHover(nodeId: string | null) {
  selectedNodeId.value = nodeId
  if (!nodeId) return
  nextTick(() => {
    const card = rationaleCardRefs.value[nodeId]
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}
</script>

<template>
  <div class="flex flex-1 overflow-hidden">
    <!-- 좌측: 리소스 팔레트 (접기/펼치기) -->
    <ResourcePalette />

    <!-- 중앙: 인터랙티브 캔버스 -->
    <div class="flex-1 overflow-hidden bg-[#FAFAFA] relative">
      <div class="absolute top-3 left-3 z-10 flex gap-2 text-[10px] text-text-muted bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border pointer-events-none">
        <span>드래그 → 이동</span>
        <span class="text-border">|</span>
        <span>포트 드래그 → 연결</span>
        <span class="text-border">|</span>
        <span>× → 삭제</span>
      </div>

      <div class="absolute bottom-3 right-3 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-sm">
        <span class="text-[10px] text-text-muted">{{ Math.round(ZOOM_MIN * 100) }}%</span>
        <input
          type="range"
          :min="ZOOM_MIN"
          :max="ZOOM_MAX"
          :step="0.05"
          v-model.number="zoom"
          class="w-28 accent-brand h-1 cursor-pointer"
        />
        <span class="text-[10px] text-text-muted">{{ Math.round(ZOOM_MAX * 100) }}%</span>
        <button @click="zoom = 0.6" class="text-[10px] font-mono text-brand hover:underline ml-1">
          {{ Math.round(zoom * 100) }}%
        </button>
      </div>

      <div ref="scrollEl" class="w-full h-full overflow-auto">
        <TopologyCanvas
          :nodes="nodes"
          :edges="edges"
          :groups="groups"
          :zoom="zoom"
          @update:nodes="nodes = $event"
          @update:edges="edges = $event"
          @nodeHover="onCanvasNodeHover"
        />
      </div>
    </div>

    <!-- 우측: 선정 이유 카드 패널 -->
    <div class="w-80 border-l border-border flex flex-col overflow-hidden shrink-0">
      <!-- 헤더 -->
      <div class="px-4 py-2.5 border-b border-border bg-bg-card shrink-0">
        <p class="text-xs font-bold text-text-muted uppercase tracking-widest">선정 이유</p>
        <p class="text-[10px] text-text-muted mt-0.5">다이어그램 요소를 클릭하면 해당 카드로 이동합니다</p>
      </div>

      <!-- 카드 목록 -->
      <div

        class="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
        style="mask-image: linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%);"
      >
        <div
          v-for="node in nodes"
          :key="node.nodeId"
          :ref="el => { if (el) rationaleCardRefs[node.nodeId] = el as HTMLElement }"
          class="rounded-lg border p-3 transition-all duration-200 cursor-default"
          :class="selectedNodeId === node.nodeId
            ? 'border-brand bg-brand/5 shadow-md -translate-y-0.5'
            : 'border-border bg-bg-card hover:border-brand/50 hover:shadow-md hover:-translate-y-0.5 hover:bg-brand/5'"
          @mouseenter="onNodeSelect(node.nodeId)"
          @mouseleave="onNodeSelect(null)"
        >
          <!-- 노드 헤더 -->
          <div class="flex items-center gap-2 mb-2">
            <img
              v-if="ICONS[node.type]"
              :src="ICONS[node.type]"
              :alt="node.type"
              class="w-6 h-6 shrink-0"
            />
            <span class="text-xs font-semibold text-text-primary">{{ node.label }}</span>
            <span class="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-muted text-text-muted uppercase">
              {{ node.type }}
            </span>
          </div>
          <!-- 선정 이유 -->
          <p class="text-[11px] text-text-secondary leading-relaxed">
            {{ node.catalogRule || `${node.label} 리소스가 인프라 구성에 포함되었습니다.` }}
          </p>
          <!-- 적용 조건 (있을 때만) -->
          <p v-if="node.applyCondition" class="mt-1.5 text-[10px] text-text-muted leading-relaxed border-t border-border pt-1.5">
            조건: {{ node.applyCondition }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
