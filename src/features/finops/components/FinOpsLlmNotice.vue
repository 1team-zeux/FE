<script setup lang="ts">
/** FinOps LLM 사용 시점 안내 — 페이지 조회만으로는 API 비용 없음 */
</script>

<template>
  <p class="text-[10px] text-gray-400 leading-relaxed max-w-3xl">
    <span class="font-bold text-gray-500">LLM 사용:</span>
    이 페이지 조회(GET /api/finops/runs)만으로는 LLM이 호출되지 않습니다.
    「상시 분석 실행」 시 파이프라인의
    <code class="text-[9px]">idle_detect</code>(finding 설명) ·
    <code class="text-[9px]">report_emit</code>(요약)에서만 선택 호출되며,
    기본값 <code class="text-[9px]">FINOPS_SKIP_LLM=true</code>이면
    <strong class="font-medium text-gray-500">템플릿 요약만</strong> 사용합니다.
    판정·guard·금액은 규칙 엔진이 담당합니다.
  </p>
</template>
