<script setup lang="ts">
import { ref } from 'vue'
import type { FinOpsRun } from '../types/finops.schema'
import { useFinOpsApprovalMutation } from '../api/useFinOpsApprovalMutation'

const props = defineProps<{
  run: FinOpsRun
}>()

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
        message.value = action === 'approve' ? '승인 완료 (MVP: 실제 AWS 조치 없음)' : '거절 완료'
      },
      onError: (err) => {
        message.value = err instanceof Error ? err.message : '승인 처리 실패'
      },
    },
  )
}
</script>

<template>
  <div class="bg-bg-card border border-border rounded-lg p-5">
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-[10px] font-bold text-brand uppercase tracking-widest">Human-in-the-Loop</div>
        <h3 class="text-lg font-bold text-text-primary">Report & Proposal 검토</h3>
      </div>
      <span
        class="px-2 py-1 rounded border text-[10px] font-bold"
        :class="canReview() ? 'bg-status-warning/10 text-status-warning border-status-warning/20' : 'bg-gray-100 text-gray-500 border-border'"
      >
        {{ run.approval_status ?? '—' }}
      </span>
    </div>

    <p class="text-[12px] text-gray-500 mb-4">
      MVP: 승인 후에도 Stop/PR/Terraform/AWS 변경 API는 호출하지 않습니다.
    </p>

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
        placeholder="코멘트 (선택)"
        class="w-full text-sm border border-border rounded-md px-3 py-2 bg-bg-page focus:outline-none focus:border-brand resize-none"
      />
      <div class="flex gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-brand text-white text-sm font-bold hover:brightness-110 disabled:opacity-50"
          :disabled="isPending"
          @click="submit('approve')"
        >
          승인
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
    <p v-else class="text-[12px] text-gray-400">이 run은 이미 검토가 완료되었습니다.</p>

    <p v-if="message" class="mt-3 text-[12px] font-bold text-brand">{{ message }}</p>
  </div>
</template>
