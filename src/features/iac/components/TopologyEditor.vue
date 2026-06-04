<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TopologyDraft, TopologyNode, TopologyEdge } from '../types/topology.schema'
import TopologyCanvas from './TopologyCanvas.vue'
import ResourcePalette from './ResourcePalette.vue'
import { generateTerraform } from '../utils/terraform-generator'

const props = defineProps<{ topology: TopologyDraft }>()

const nodes = ref<TopologyNode[]>([...props.topology.nodes])
const edges = ref<TopologyEdge[]>([...props.topology.edges])
const groups = computed(() => props.topology.groups ?? [])

watch(() => props.topology, (t) => {
  nodes.value = [...t.nodes]
  edges.value = [...t.edges]
})

const terraform = computed(() => generateTerraform(nodes.value, edges.value, groups.value))
const copied = ref(false)

function copyCode() {
  navigator.clipboard.writeText(terraform.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}
</script>

<template>
  <div class="flex flex-1 overflow-hidden">
    <!-- 좌측: 리소스 팔레트 -->
    <ResourcePalette />

    <!-- 중앙: 인터랙티브 캔버스 -->
    <div class="flex-1 overflow-hidden bg-[#FAFAFA] relative">
      <div class="absolute top-3 left-3 z-10 flex gap-2 text-[10px] text-text-muted bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border">
        <span>드래그 → 이동</span>
        <span class="text-border">|</span>
        <span>포트 드래그 → 연결</span>
        <span class="text-border">|</span>
        <span>노드 클릭 후 × → 삭제</span>
      </div>
      <TopologyCanvas
        :nodes="nodes"
        :edges="edges"
        :groups="groups"
        @update:nodes="nodes = $event"
        @update:edges="edges = $event"
      />
    </div>

    <!-- 우측: 코드 패널 -->
    <div class="w-80 border-l border-border flex flex-col overflow-hidden shrink-0">
      <div class="px-4 py-2.5 border-b border-border bg-bg-card flex items-center justify-between shrink-0">
        <div>
          <p class="text-xs font-bold text-text-muted uppercase tracking-widest">Terraform HCL</p>
          <p class="text-[10px] text-text-muted">토폴로지 변경 시 자동 업데이트</p>
        </div>
        <button
          @click="copyCode"
          class="text-[10px] font-semibold px-2 py-1 rounded border border-border hover:bg-bg-muted transition-colors"
        >
          {{ copied ? '복사됨 ✓' : '복사' }}
        </button>
      </div>
      <pre class="flex-1 overflow-auto text-[10px] leading-relaxed font-mono bg-gray-950 text-green-400 p-4 whitespace-pre">{{ terraform }}</pre>
    </div>
  </div>
</template>
