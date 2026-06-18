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

// ── 선정 보고서 데이터 ────────────────────────────────

const SECTION_LAYERS = [
  { name: '네트워크', layers: ['G_ENTRY', 'V1_CONNECT', 'V2_PUBLIC'] },
  { name: '애플리케이션', layers: ['V3_APP'] },
  { name: '데이터', layers: ['V4_DATA', 'G_STORAGE'] },
  { name: '외부·모니터링', layers: ['G_MGMT', 'G_EXT_API'] },
]

type DedupItem = { key: string; node: TopologyNode; azs: string[]; nodeIds: string[] }

// AZ-복제 노드를 (type + label) 기준으로 하나로 묶는다.
const nodeIdToKey = computed(() => {
  const m = new Map<string, string>()
  for (const n of nodes.value) m.set(n.nodeId, `${n.type}|${n.label}`)
  return m
})

const dedupItems = computed((): DedupItem[] => {
  const seen = new Map<string, DedupItem>()
  for (const n of nodes.value) {
    const key = `${n.type}|${n.label}`
    const ex = seen.get(key)
    if (ex) {
      if (n.az && !ex.azs.includes(n.az)) ex.azs.push(n.az)
      ex.nodeIds.push(n.nodeId)
    } else {
      seen.set(key, { key, node: n, azs: n.az ? [n.az] : [], nodeIds: [n.nodeId] })
    }
  }
  return [...seen.values()]
})

const reportSections = computed(() =>
  SECTION_LAYERS
    .map(({ name, layers }) => ({
      name,
      items: dedupItems.value.filter(i => layers.includes(i.node.layer_id ?? 'V3_APP')),
    }))
    .filter(s => s.items.length > 0),
)

const CONCEPT_BADGE: Record<string, string> = {
  '균형안':      'bg-sky-50 text-sky-700 border-sky-200',
  '비용 우선안': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '안정성 우선안': 'bg-violet-50 text-violet-700 border-violet-200',
}
const conceptBadgeClass = computed(
  () => CONCEPT_BADGE[props.topology.label] ?? 'bg-brand/10 text-brand border-brand/20',
)

const SLA_LABELS: Record<string, string> = {
  availability: '가용성', rto: 'RTO', rpo: 'RPO', latency_p95: 'Latency P95',
}
const slaEntries = computed(() =>
  Object.entries(props.topology.slaSatisfaction)
    .filter(([, v]) => v && v !== 'N/A' && v !== '-')
    .map(([k, v]) => ({ label: SLA_LABELS[k] ?? k, value: v })),
)

function azLabel(az: string) {
  // "ap-northeast-2a" → "2a"
  return az.replace(/.*?(\d[a-z])$/, '$1')
}

// SLA 관련 패턴(수치·키워드)을 bold 파트로 분리
const SLA_PATTERN = /(\d+(?:\.\d+)?\s*(?:ms|분|%|TPS|RPS|초|Gbps|KB|MB|GB)|RTO|RPO|SLA|p95|p99|가용성|레이턴시)/g

function stripConcept(text: string) {
  return text.replace(/^\[[^\]]+\]\s*/, '')
}

function highlightSla(text: string): { text: string; bold: boolean }[] {
  const parts: { text: string; bold: boolean }[] = []
  let last = 0
  let m: RegExpExecArray | null
  SLA_PATTERN.lastIndex = 0
  while ((m = SLA_PATTERN.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false })
    parts.push({ text: m[0], bold: true })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false })
  return parts
}

// ── 노드 호버 → 카드 포커스 ───────────────────────────
const selectedNodeId = ref<string | null>(null)
const rationaleCardRefs = ref<Record<string, HTMLElement>>({})

const selectedKey = computed(
  () => selectedNodeId.value ? (nodeIdToKey.value.get(selectedNodeId.value) ?? null) : null,
)

function onCanvasNodeHover(nodeId: string | null) {
  selectedNodeId.value = nodeId
  if (!nodeId) return
  const key = nodeIdToKey.value.get(nodeId)
  if (!key) return
  nextTick(() => {
    rationaleCardRefs.value[key]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}
</script>

<template>
  <div class="flex flex-1 overflow-hidden">
    <!-- 좌측: 리소스 팔레트 -->
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
          type="range" :min="ZOOM_MIN" :max="ZOOM_MAX" :step="0.05" v-model.number="zoom"
          class="w-28 accent-brand h-1 cursor-pointer"
        />
        <span class="text-[10px] text-text-muted">{{ Math.round(ZOOM_MAX * 100) }}%</span>
        <button @click="zoom = 0.6" class="text-[10px] font-mono text-brand hover:underline ml-1">
          {{ Math.round(zoom * 100) }}%
        </button>
      </div>

      <div ref="scrollEl" class="w-full h-full overflow-auto">
        <TopologyCanvas
          :nodes="nodes" :edges="edges" :groups="groups" :zoom="zoom"
          @update:nodes="nodes = $event"
          @update:edges="edges = $event"
          @nodeHover="onCanvasNodeHover"
        />
      </div>
    </div>

    <!-- 우측: 선정 보고서 패널 -->
    <div class="w-80 border-l border-border flex flex-col overflow-hidden shrink-0">

      <!-- 패널 헤더 -->
      <div class="px-4 py-3 border-b border-border bg-bg-card shrink-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted">선정 보고서</span>
          <span :class="conceptBadgeClass" class="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border">
            {{ topology.label }}
          </span>
        </div>
        <p class="text-[12px] text-text-secondary leading-snug">{{ topology.summary }}</p>
      </div>

      <!-- 스크롤 본문 -->
      <div
        class="flex-1 overflow-y-auto"
        style="mask-image: linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%);"
      >
        <div class="px-3 py-4 space-y-5">

          <!-- 1. 아키텍처 결정 근거 -->
          <div v-if="topology.rationale.length">
            <div class="flex items-center gap-2 mb-2.5">
              <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted whitespace-nowrap">아키텍처 결정 근거</span>
              <div class="flex-1 h-px bg-border" />
            </div>
            <ul class="space-y-2">
              <li v-for="(r, i) in topology.rationale" :key="i" class="flex items-start gap-1.5">
                <span class="text-brand shrink-0 text-[12px] mt-0.5 font-bold select-none">▸</span>
                <span class="text-[12px] text-text-secondary leading-relaxed">
                  <template v-for="(part, j) in highlightSla(stripConcept(r))" :key="j">
                    <strong v-if="part.bold" class="font-bold text-text-primary">{{ part.text }}</strong>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </span>
              </li>
            </ul>
          </div>

          <!-- 2. SLA 달성 수치 -->
          <div v-if="slaEntries.length">
            <div class="flex items-center gap-2 mb-2.5">
              <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted whitespace-nowrap">SLA 달성 수치</span>
              <div class="flex-1 h-px bg-border" />
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <div
                v-for="sla in slaEntries" :key="sla.label"
                class="bg-bg-muted border border-border rounded-md px-2.5 py-2"
              >
                <div class="text-[11px] font-semibold text-text-secondary mb-0.5">{{ sla.label }}</div>
                <div class="text-sm font-bold font-mono text-text-primary">{{ sla.value }}</div>
              </div>
            </div>
          </div>

          <!-- 3. 리소스 섹션 -->
          <template v-for="section in reportSections" :key="section.name">
            <div>
              <div class="flex items-center gap-2 mb-2.5">
                <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted whitespace-nowrap">{{ section.name }}</span>
                <div class="flex-1 h-px bg-border" />
                <span class="text-[11px] font-mono text-text-muted shrink-0">{{ section.items.length }}</span>
              </div>

              <div class="space-y-1.5">
                <div
                  v-for="item in section.items"
                  :key="item.key"
                  :ref="(el) => { if (el) rationaleCardRefs[item.key] = el as HTMLElement }"
                  class="rounded-lg border p-2.5 transition-all duration-150 cursor-default"
                  :class="selectedKey === item.key
                    ? 'border-brand/60 bg-brand/5 shadow-sm'
                    : 'border-border bg-bg-card hover:border-brand/40 hover:bg-brand/5'"
                  @mouseenter="selectedNodeId = item.nodeIds[0]"
                  @mouseleave="selectedNodeId = null"
                >
                  <!-- 카드 헤더 -->
                  <div class="flex items-center gap-1.5 mb-1.5">
                    <img
                      v-if="ICONS[item.node.type]"
                      :src="ICONS[item.node.type]"
                      class="w-5 h-5 shrink-0"
                    />
                    <span class="text-[13px] font-semibold text-text-primary flex-1 min-w-0 truncate">
                      {{ item.node.label }}
                    </span>
                    <span class="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-muted text-text-muted uppercase">
                      {{ item.node.type }}
                    </span>
                  </div>

                  <!-- AZ 뱃지 (multi-AZ 노드만) -->
                  <div v-if="item.azs.length > 1" class="flex gap-1 flex-wrap mb-1.5">
                    <span
                      v-for="az in item.azs" :key="az"
                      class="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200"
                    >{{ azLabel(az) }}</span>
                  </div>

                  <!-- 선정 이유 -->
                  <p class="text-[12px] text-text-secondary leading-relaxed">
                    <template v-for="(part, j) in highlightSla(stripConcept(item.node.catalogRule || `${item.node.label} 리소스가 인프라 구성에 포함되었습니다.`))" :key="j">
                      <strong v-if="part.bold" class="font-bold text-text-primary">{{ part.text }}</strong>
                      <template v-else>{{ part.text }}</template>
                    </template>
                  </p>

                  <!-- 적용 규칙 태그 -->
                  <div v-if="item.node.applyCondition" class="mt-1.5 flex gap-1 flex-wrap">
                    <span
                      v-for="rule in item.node.applyCondition.split(', ').filter(Boolean)" :key="rule"
                      class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-muted text-text-muted"
                    >{{ rule }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

        </div>
      </div>
    </div>
  </div>
</template>
