<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useIacStore, useTopologyCandidates, useApproveTopology } from '@/features/iac'
import TopologyEditor from '@/features/iac/components/TopologyEditor.vue'
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
      <div class="px-6 pt-4 border-b border-border flex items-center justify-between bg-bg-card shrink-0">
        <div class="flex gap-4">
          <button
            v-for="(topo, i) in topologies"
            :key="topo.topologyId"
            @click="activeIndex = i"
            class="pb-3 text-sm font-medium border-b-2 transition-colors"
            :class="i === activeIndex ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'"
          >
            {{ topo.label }}
            <span class="ml-1.5 text-xs text-text-muted">₩{{ (topo.estimatedMonthlyCost / 10000).toFixed(0) }}만/월</span>
          </button>
        </div>

        <!-- 정보 패널 (SLA 만족도 요약) -->
        <div v-if="activeTopology" class="flex gap-3 pb-2">
          <span
            v-for="(val, key) in activeTopology.slaSatisfaction"
            :key="key"
            class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand/10 text-brand"
          >{{ key }}: {{ val }}</span>
        </div>
      </div>

      <!-- 편집기 (팔레트 + 캔버스 + 코드) -->
      <TopologyEditor v-if="activeTopology" :topology="activeTopology" class="flex-1 min-h-0" />

      <!-- 푸터 -->
      <div class="px-6 py-4 border-t border-border bg-bg-card flex items-center justify-between shrink-0">
        <p class="text-xs text-text-muted">캔버스에서 수정한 내용은 Terraform 코드에 실시간 반영됩니다.</p>
        <button @click="handleApprove" :disabled="isApproving" class="btn-brand">
          {{ isApproving ? '처리 중...' : '이 토폴로지로 진행' }}
        </button>
      </div>
    </template>
  </div>
</template>
