<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useIacStore } from '@/features/iac/stores/iac.store'
import { useTopologyCandidates, useApproveTopology } from '@/features/iac/api/useTopology'
import TopologyDiagram from '@/features/iac/components/TopologyDiagram.vue'
import TopologyInfoPanel from '@/features/iac/components/TopologyInfoPanel.vue'

const store = useIacStore()
const router = useRouter()
const { bundleDraft } = storeToRefs(store)
const bundleId = computed(() => bundleDraft.value?.bundleId ?? null)

const { data: topologies, isLoading } = useTopologyCandidates(bundleId)
const { mutate: approve, isPending: isApproving } = useApproveTopology()

const activeIndex = ref(0)
const activeTopology = computed(() => topologies.value?.[activeIndex.value])

function handleApprove() {
  if (!activeTopology.value) return
  approve(activeTopology.value.topologyId, {
    onSuccess() { router.push('/iac/4') },
  })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else-if="topologies?.length">
      <!-- 탭 -->
      <div class="px-6 pt-4 border-b border-border flex gap-4 bg-bg-card">
        <button
          v-for="(topo, i) in topologies"
          :key="topo.topologyId"
          @click="activeIndex = i"
          class="pb-3 text-sm font-medium border-b-2 transition-colors"
          :class="i === activeIndex
            ? 'border-brand text-brand'
            : 'border-transparent text-text-secondary hover:text-text-primary'"
        >
          <span>{{ topo.label }}</span>
          <span class="ml-2 text-xs text-text-muted">₩{{ (topo.estimatedMonthlyCost / 10000).toFixed(0) }}만/월</span>
        </button>
      </div>

      <!-- 다이어그램 + 정보 패널 -->
      <div v-if="activeTopology" class="flex flex-1 overflow-hidden">
        <div class="flex-1 p-6">
          <TopologyDiagram
            :nodes="activeTopology.nodes"
            :edges="activeTopology.edges"
          />
        </div>
        <div class="w-72 p-4 border-l border-border overflow-y-auto">
          <TopologyInfoPanel :topology="activeTopology" />
        </div>
      </div>

      <!-- 푸터 -->
      <div class="px-6 py-4 border-t border-border bg-bg-card flex items-center justify-between">
        <p class="text-sm text-text-secondary">선택한 토폴로지로 Terraform 코드를 생성합니다.</p>
        <button @click="handleApprove" :disabled="isApproving" class="btn-brand">
          {{ isApproving ? '처리 중...' : '이 토폴로지로 진행' }}
        </button>
      </div>
    </template>
  </div>
</template>
