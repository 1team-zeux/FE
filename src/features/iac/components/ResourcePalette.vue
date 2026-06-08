<script setup lang="ts">
import { ref } from 'vue'
import type { NodeType } from '../types/topology.schema'
import ec2Url from '@/assets/aws-icons/ec2.svg?url'
import rdsUrl from '@/assets/aws-icons/rds.svg?url'
import elbUrl from '@/assets/aws-icons/elb.svg?url'
import lambdaUrl from '@/assets/aws-icons/lambda.svg?url'
import eksUrl from '@/assets/aws-icons/eks.svg?url'
import ecsUrl from '@/assets/aws-icons/ecs.svg?url'
import apigwUrl from '@/assets/aws-icons/apigw.svg?url'
import cloudwatchUrl from '@/assets/aws-icons/cloudwatch.svg?url'
import route53Url from '@/assets/aws-icons/route53.svg?url'
import s3Url from '@/assets/aws-icons/s3.svg?url'

const PALETTE: { type: NodeType; label: string; icon: string }[] = [
  { type: 'ec2',        label: 'EC2',         icon: ec2Url },
  { type: 'rds',        label: 'RDS',         icon: rdsUrl },
  { type: 'elb',        label: 'ALB / ELB',   icon: elbUrl },
  { type: 'lambda',     label: 'Lambda',      icon: lambdaUrl },
  { type: 'eks',        label: 'EKS',         icon: eksUrl },
  { type: 'ecs',        label: 'ECS',         icon: ecsUrl },
  { type: 'apigw',      label: 'API GW',      icon: apigwUrl },
  { type: 'cloudwatch', label: 'CloudWatch',  icon: cloudwatchUrl },
  { type: 'route53',    label: 'Route 53',    icon: route53Url },
  { type: 's3',         label: 'S3',          icon: s3Url },
]

const isOpen = ref(false)

function onDragStart(type: NodeType, e: DragEvent) {
  e.dataTransfer?.setData('text/plain', type)
}
</script>

<template>
  <aside
    class="border-r border-border bg-bg-card flex flex-col overflow-hidden shrink-0 transition-all duration-200"
    :style="{ width: isOpen ? '208px' : '40px' }"
  >
    <!-- 토글 헤더 -->
    <button
      @click="isOpen = !isOpen"
      class="flex items-center justify-center w-full py-3 hover:bg-bg-muted transition-colors shrink-0"
      :title="isOpen ? '리소스 패널 닫기' : '리소스 추가'"
    >
      <svg
        class="w-4 h-4 text-text-secondary transition-transform duration-200"
        :class="isOpen ? 'rotate-180' : ''"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </button>

    <!-- 열렸을 때 내용 -->
    <template v-if="isOpen">
      <div class="px-4 pb-2 shrink-0">
        <p class="text-xs font-bold text-text-muted uppercase tracking-widest">리소스</p>
        <p class="text-[10px] text-text-muted mt-0.5">드래그하여 캔버스에 추가</p>
      </div>
      <div class="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div
          v-for="item in PALETTE"
          :key="item.type"
          draggable="true"
          @dragstart="onDragStart(item.type, $event)"
          class="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-white hover:border-brand hover:bg-brand-subtle cursor-grab active:cursor-grabbing transition-colors select-none"
        >
          <img :src="item.icon" :alt="item.label" class="w-7 h-7 shrink-0" />
          <span class="text-xs font-medium text-text-primary">{{ item.label }}</span>
        </div>
      </div>
    </template>
  </aside>
</template>
