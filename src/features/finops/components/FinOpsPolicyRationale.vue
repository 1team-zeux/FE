<script setup lang="ts">
import {
  DETECTION_RULES,
  GOVERNANCE_RULES,
  GUARD_RULES,
  GUARD_STATUS_DEFINITIONS,
  POLICY_BIBLIOGRAPHY,
  POLICY_NORMATIVE_DOC,
  POLICY_REGISTRY_DATE,
  POLICY_REGISTRY_VERSION,
  PRIORITY_RULES,
  RCA_RULES,
} from '../data/policyRuleRegistry'
import FinOpsPolicyRuleTable from './FinOpsPolicyRuleTable.vue'
</script>

<template>
  <footer class="mt-12 pt-6 border-t border-border/40 print:hidden">
    <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2 max-w-5xl">
      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        FinOps 판정 규칙 및 출처 (Policy Rule Registry)
      </h3>
      <p class="text-[9px] text-gray-400 font-mono tabular-nums">
        v{{ POLICY_REGISTRY_VERSION }} · {{ POLICY_REGISTRY_DATE }} · {{ POLICY_NORMATIVE_DOC }}
      </p>
    </div>

    <div class="max-w-5xl space-y-5 text-[10px] leading-snug text-gray-400">
      <section>
        <h4 class="text-[10px] font-semibold text-gray-500 mb-2">§1 guard_status 정의</h4>
        <div class="overflow-x-auto rounded border border-border/30">
          <table class="w-full min-w-[480px] border-collapse">
            <thead>
              <tr class="bg-bg-muted/50 text-left">
                <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30 w-20">값</th>
                <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30">정의</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in GUARD_STATUS_DEFINITIONS"
                :key="row.status"
                class="border-b border-border/20 last:border-0"
              >
                <td class="px-2 py-1.5 font-mono text-gray-500 align-top">{{ row.status }}</td>
                <td class="px-2 py-1.5 align-top">{{ row.definition }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h4 class="text-[10px] font-semibold text-gray-500 mb-2">§2 유휴·과잉 탐지 규칙</h4>
        <FinOpsPolicyRuleTable :rows="DETECTION_RULES" />
      </section>

      <section>
        <h4 class="text-[10px] font-semibold text-gray-500 mb-2">§3 SLA·리스크 가드 규칙</h4>
        <p class="mb-2 text-[9px] text-gray-400/90">
          적용 순서: GRD-001 → GRD-002/003 → GRD-004 → RCA override → GRD-006 → GRD-005 → GRD-007.
        </p>
        <FinOpsPolicyRuleTable :rows="GUARD_RULES" />
      </section>

      <section>
        <h4 class="text-[10px] font-semibold text-gray-500 mb-2">§4 RCA 연동 규칙 (연쇄 오탐 방지)</h4>
        <FinOpsPolicyRuleTable :rows="RCA_RULES" />
      </section>

      <section>
        <h4 class="text-[10px] font-semibold text-gray-500 mb-2">§5 우선순위·비용 산정</h4>
        <FinOpsPolicyRuleTable :rows="PRIORITY_RULES" />
      </section>

      <section>
        <h4 class="text-[10px] font-semibold text-gray-500 mb-2">§6 거버넌스·자동화 경계</h4>
        <FinOpsPolicyRuleTable :rows="GOVERNANCE_RULES" />
      </section>

      <section>
        <h4 class="text-[10px] font-semibold text-gray-500 mb-2">§7 참고 문헌 (Bibliography)</h4>
        <div class="overflow-x-auto rounded border border-border/30">
          <table class="w-full min-w-[480px] border-collapse">
            <thead>
              <tr class="bg-bg-muted/50 text-left">
                <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30 w-14">ID</th>
                <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30">제목</th>
                <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30 w-24">발행</th>
                <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30 w-12">연도</th>
                <th class="px-2 py-1.5 font-semibold text-gray-500 border-b border-border/30 w-16">URL</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ref in POLICY_BIBLIOGRAPHY"
                :key="ref.id"
                class="border-b border-border/20 last:border-0"
              >
                <td class="px-2 py-1.5 font-mono text-gray-500 align-top">{{ ref.id }}</td>
                <td class="px-2 py-1.5 align-top">
                  {{ ref.title }}
                  <span v-if="ref.note" class="block text-[9px] text-gray-400/80 mt-0.5">{{ ref.note }}</span>
                </td>
                <td class="px-2 py-1.5 align-top">{{ ref.publisher }}</td>
                <td class="px-2 py-1.5 align-top text-gray-400">{{ ref.year ?? '—' }}</td>
                <td class="px-2 py-1.5 align-top">
                  <a
                    v-if="ref.url"
                    :href="ref.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-brand/70 hover:text-brand underline underline-offset-2"
                  >link</a>
                  <span v-else class="text-gray-300">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <p class="mt-5 max-w-5xl text-[9px] text-gray-300/80 italic leading-relaxed">
      본 레지스트리는 FinOps Agent 판정 임계값과 가드레일의 외부 근거를 정리합니다.
      클라우드 벤더 가이드·SRE·FinOps·ITIL·NIST·ISO·학술 문헌을 인용하며,
      ZeuX 적용값(예: EC2 p95 5%)은 업계 기준 대비 보수적으로 조정된 플랫폼 설정입니다.
    </p>
  </footer>
</template>
