<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FinOpsRun, OptimizationProposal } from '../types/finops.schema'
import { useFinOpsApprovalMutation } from '../api/useFinOpsApprovalMutation'

const props = defineProps<{
  run: FinOpsRun
  adoptedProposal?: OptimizationProposal | null
}>()

const router = useRouter()
const reviewer = ref('ops-lead@zeux.io')
const comment = ref('')
const message = ref('')

const { mutate, isPending } = useFinOpsApprovalMutation()

const canReview = () => props.run.approval_status === 'PENDING_REVIEW'

const submit = (action: 'approve' | 'reject') => {
  message.value = ''
  mutate(
    { runId: props.run.run_id, action, reviewer: reviewer.value, comment: comment.value },
    {
      onSuccess: () => {
        if (action === 'approve') {
          message.value = '채택 완료 — 인프라 변경은 ③ Terraform 검증 흐름으로 이어집니다 (MVP: plan 시뮬레이션)'
        } else {
          message.value = '거절 완료'
        }
      },
      onError: (err) => {
        message.value = err instanceof Error ? err.message : '검토 처리 실패'
      },
    },
  )
}

function goTerraform() {
  router.push({
    path: '/iac/deploy',
    query: {
      from: 'finops',
      runId: props.run.run_id,
      proposal: props.adoptedProposal?.id,
    },
  })
}
</script>

<template>
  <div class="bg-bg-card border border-border rounded-xl p-5">
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-[10px] font-bold text-brand uppercase tracking-widest">Human-in-the-Loop</div>
        <h3 class="text-lg font-bold text-text-primary">절감안 검토 · 채택</h3>
      </div>
      <span
        class="px-2 py-1 rounded border text-[10px] font-bold"
        :class="canReview() ? 'bg-status-warning/10 text-status-warning border-status-warning/20' : 'bg-gray-100 text-gray-500 border-border'"
      >
        {{ run.approval_status ?? '—' }}
      </span>
    </div>

    <p class="text-[12px] text-gray-500 mb-4 leading-relaxed">
      채택된 절감안은 <strong>③ Terraform Plan</strong>에서 비용·SLA 차원을 재검증합니다.
      MVP에서는 실제 AWS 변경 없이 HITL 상태만 기록합니다.
    </p>

    <div
      v-if="adoptedProposal"
      class="mb-4 p-3 rounded-lg bg-brand/5 border border-brand/20 text-[12px]"
    >
      <span class="font-bold text-brand">선택된 제안:</span>
      {{ adoptedProposal.title }}
      <span class="text-gray-400 font-mono text-[11px]">{{ adoptedProposal.resource_id ?? adoptedProposal.service_name }}</span>
      <span class="text-gray-500">({{ adoptedProposal.iac_change_label ?? adoptedProposal.recommended_action }})</span>
    </div>

    <div v-if="run.approval_reviewer" class="mb-4 text-[12px] text-gray-500">
      {{ run.approval_reviewer }} · {{ run.approval_reviewed_at ? new Date(run.approval_reviewed_at).toLocaleString('ko-KR') : '' }}
      <span v-if="run.approval_comment" class="block mt-1">「{{ run.approval_comment }}」</span>
    </div>

    <div v-if="canReview()" class="space-y-3">
      <input
        v-model="reviewer"
        type="text"
        placeholder="검토자 이메일"
        class="w-full text-sm border border-border rounded-md px-3 py-2 bg-bg-page focus:outline-none focus:border-brand"
      />
      <textarea
        v-model="comment"
        rows="2"
        placeholder="코멘트 (선택) — 예: P0 RightSizing 채택"
        class="w-full text-sm border border-border rounded-md px-3 py-2 bg-bg-page focus:outline-none focus:border-brand resize-none"
      />
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-brand text-white text-sm font-bold hover:brightness-110 disabled:opacity-50"
          :disabled="isPending"
          @click="submit('approve')"
        >
          채택 (승인)
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-md border border-status-critical text-status-critical text-sm font-bold hover:bg-status-critical/5 disabled:opacity-50"
          :disabled="isPending"
          @click="submit('reject')"
        >
          거절
        </button>
      </div>
    </div>

    <div v-else-if="run.approval_status === 'APPROVED'" class="space-y-3">
      <p class="text-[12px] text-status-ok font-bold">채택 완료</p>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-brand text-brand text-sm font-bold hover:bg-brand/5"
        @click="goTerraform"
      >
        ③ Terraform Plan 검증으로 이동
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
    <p v-else class="text-[12px] text-gray-400">이 run은 이미 검토가 완료되었습니다.</p>

    <p v-if="message" class="mt-3 text-[12px] font-bold text-brand">{{ message }}</p>
  </div>
</template>
