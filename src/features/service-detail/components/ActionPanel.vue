<script setup lang="ts">
import { ref } from 'vue';

const slackChannel = ref('#ops-alerts');
const jiraProject = ref('OPS');
const sent = ref<string | null>(null);

const sendSlack = () => { sent.value = 'slack'; setTimeout(() => sent.value = null, 2000); };
const createJira = () => { sent.value = 'jira'; setTimeout(() => sent.value = null, 2000); };
const runRunbook = () => { sent.value = 'runbook'; setTimeout(() => sent.value = null, 2000); };
</script>
<template>
  <div class="space-y-4">
    <div class="bg-bg-muted border border-border rounded-lg px-4 py-3 text-xs text-gray-500">
      Slack · Jira · Runbook 연동은 Sprint 6 이후 백엔드 API 연결 예정. 현재 UI 프로토타입 상태.
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Slack -->
      <div class="bg-bg-card border border-border rounded-lg p-5">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-xl">💬</span>
          <span class="font-bold text-sm">Slack 알림 전송</span>
        </div>
        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">채널</label>
        <input v-model="slackChannel" class="w-full text-xs px-3 py-2 border border-border rounded-md bg-bg-page focus:outline-none focus:border-brand mb-3" />
        <button
          class="w-full py-2 text-xs font-bold rounded-md transition-all"
          :class="sent === 'slack' ? 'bg-status-ok text-white' : 'bg-brand text-white hover:brightness-110'"
          @click="sendSlack"
        >{{ sent === 'slack' ? '✓ 전송됨' : '알림 전송' }}</button>
      </div>

      <!-- Jira -->
      <div class="bg-bg-card border border-border rounded-lg p-5">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-xl">🎫</span>
          <span class="font-bold text-sm">Jira 티켓 생성</span>
        </div>
        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">프로젝트</label>
        <input v-model="jiraProject" class="w-full text-xs px-3 py-2 border border-border rounded-md bg-bg-page focus:outline-none focus:border-brand mb-3" />
        <button
          class="w-full py-2 text-xs font-bold rounded-md transition-all"
          :class="sent === 'jira' ? 'bg-status-ok text-white' : 'bg-brand text-white hover:brightness-110'"
          @click="createJira"
        >{{ sent === 'jira' ? '✓ 생성됨' : '티켓 생성' }}</button>
      </div>

      <!-- Runbook -->
      <div class="bg-bg-card border border-border rounded-lg p-5">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-xl">📋</span>
          <span class="font-bold text-sm">Runbook 실행</span>
        </div>
        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Runbook</label>
        <select class="w-full text-xs px-3 py-2 border border-border rounded-md bg-bg-page focus:outline-none focus:border-brand mb-3">
          <option>DB Connection Pool 복구</option>
          <option>서비스 재시작 절차</option>
          <option>스케일업 자동화</option>
        </select>
        <button
          class="w-full py-2 text-xs font-bold rounded-md transition-all"
          :class="sent === 'runbook' ? 'bg-status-ok text-white' : 'bg-brand text-white hover:brightness-110'"
          @click="runRunbook"
        >{{ sent === 'runbook' ? '✓ 실행됨' : 'Runbook 실행' }}</button>
      </div>
    </div>
  </div>
</template>
