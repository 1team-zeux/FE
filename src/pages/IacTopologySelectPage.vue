<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useIacStore, useTopologyCandidates, useApproveTopology, TopologyEditor } from '@/features/iac'

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
      <!-- 헤더 -->
      <div class="px-8 pt-6 pb-0 shrink-0">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h1 class="text-xl font-bold text-text-primary">토폴로지 선택</h1>
            <p class="text-xs text-text-secondary mt-0.5">AI가 추천한 인프라 구성을 검토하고 선택합니다.</p>
          </div>
          <!-- SLA 만족도 뱃지 -->
          <div v-if="activeTopology" class="flex gap-2">
            <span
              v-for="(val, key) in activeTopology.slaSatisfaction"
              :key="key"
              class="text-[10px] font-mono px-2.5 py-1 rounded-full bg-brand/10 text-brand border border-brand/20"
            >{{ key }}: {{ val }}</span>
          </div>
        </div>
        <!-- 탭 -->
        <div class="flex gap-1 mt-4 border-b border-border">
          <button
            v-for="(topo, i) in topologies"
            :key="topo.topologyId"
            @click="activeIndex = i"
            class="relative pb-3 px-3 text-sm font-medium transition-colors"
            :class="i === activeIndex ? 'text-brand' : 'text-text-secondary hover:text-text-primary'"
          >
            {{ topo.label }}
            <span class="ml-1.5 text-xs" :class="i === activeIndex ? 'text-brand/70' : 'text-text-muted'">
              ₩{{ (topo.estimatedMonthlyCost / 10000).toFixed(0) }}만/월
            </span>
            <span v-if="i === activeIndex" class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-sm" />
          </button>
        </div>
      </div>

      <!-- 편집기 -->
      <TopologyEditor v-if="activeTopology" :topology="activeTopology" class="flex-1 min-h-0" />

      <!-- 푸터 -->
      <div class="px-6 py-4 flex items-center justify-between shrink-0">
        <button @click="router.push('/iac/2')" class="flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-muted rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          이전 단계
        </button>
        <div class="flex items-center gap-4">
          <p class="text-xs text-text-muted">노드를 드래그하거나 포트를 연결해 토폴로지를 수정할 수 있습니다.</p>
          <button @click="handleApprove" :disabled="isApproving" class="btn-brand flex items-center gap-2">
            <div v-if="isApproving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ isApproving ? '처리 중...' : '이 토폴로지로 진행' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
