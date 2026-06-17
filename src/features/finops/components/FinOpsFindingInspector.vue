<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import type { FinOpsFinding, FinOpsRun, OptimizationProposal, TradeoffRow } from '../types/finops.schema'
import FinOpsEvidencePanel from './FinOpsEvidencePanel.vue'
import FinOpsInspectorTopology from './FinOpsInspectorTopology.vue'
import FinOpsInspectorPolicy from './FinOpsInspectorPolicy.vue'
import {
  INSPECTOR_PANEL_LABELS,
  type InspectorPanel,
  type TopologyLayer,
  type TopologyView,
} from '../utils/findingInspector'

const props = defineProps<{
  open: boolean
  panel: InspectorPanel
  run: FinOpsRun
  proposal: OptimizationProposal
  finding: FinOpsFinding | null
  evaluationDays?: number | null
  tradeoffRows?: TradeoffRow[]
  topoLayer: TopologyLayer
  topoView: TopologyView
}>()

const emit = defineEmits<{
  close: []
  'update:panel': [panel: InspectorPanel]
  'update:topoLayer': [layer: TopologyLayer]
  'update:topoView': [view: TopologyView]
}>()

const panels: InspectorPanel[] = ['observability', 'topology', 'policy']

const title = computed(() => {
  const base = INSPECTOR_PANEL_LABELS[props.panel]
  return `${props.proposal.service_name} · ${base}`
})

watch(
  () => props.open,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
  { immediate: true },
)

onUnmounted(() => {
  document.body.style.overflow = ''
})

function selectPanel(next: InspectorPanel) {
  emit('update:panel', next)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="finops-drawer">
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex justify-end print:hidden"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/35"
          aria-label="닫기"
          @click="emit('close')"
        />

        <aside
          class="relative flex flex-col w-full h-full bg-bg-card border-l border-border shadow-2xl"
          :class="panel === 'topology' ? 'max-w-lg sm:max-w-2xl' : 'max-w-lg sm:max-w-xl'"
        >
          <header class="shrink-0 border-b border-border px-4 py-3 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[10px] font-bold text-brand uppercase tracking-widest">Finding Inspector</p>
                <h2 class="text-sm font-bold text-text-primary truncate">{{ title }}</h2>
              </div>
              <button
                type="button"
                class="shrink-0 p-2 rounded-lg border border-border text-gray-400 hover:text-text-primary hover:bg-bg-muted"
                aria-label="Inspector 닫기"
                @click="emit('close')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="flex gap-1 overflow-x-auto">
              <button
                v-for="tab in panels"
                :key="tab"
                type="button"
                class="px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors"
                :class="
                  panel === tab
                    ? 'bg-brand text-white'
                    : 'bg-bg-muted text-gray-500 hover:text-text-primary'
                "
                @click="selectPanel(tab)"
              >
                {{ INSPECTOR_PANEL_LABELS[tab] }}
              </button>
            </div>
          </header>

          <div class="flex-1 overflow-y-auto px-4 py-4">
            <FinOpsEvidencePanel
              v-if="panel === 'observability'"
              :finding="finding"
              :evaluation-days="evaluationDays"
              embedded
            />
            <FinOpsInspectorTopology
              v-else-if="panel === 'topology'"
              :finding="finding"
              :layer="topoLayer"
              :view="topoView"
              @update:layer="emit('update:topoLayer', $event)"
              @update:view="emit('update:topoView', $event)"
            />
            <FinOpsInspectorPolicy
              v-else
              :run="run"
              :finding="finding"
              :proposal="proposal"
              :tradeoff-rows="tradeoffRows"
            />
          </div>

          <footer class="shrink-0 border-t border-border px-4 py-2 text-[10px] text-gray-400">
            Esc로 닫기 · finding 선택은 유지됩니다
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.finops-drawer-enter-active,
.finops-drawer-leave-active {
  transition: opacity 0.2s ease;
}
.finops-drawer-enter-active aside,
.finops-drawer-leave-active aside {
  transition: transform 0.25s ease;
}
.finops-drawer-enter-from,
.finops-drawer-leave-to {
  opacity: 0;
}
.finops-drawer-enter-from aside,
.finops-drawer-leave-to aside {
  transform: translateX(100%);
}
</style>
