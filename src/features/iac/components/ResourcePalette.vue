<script setup lang="ts">
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

function onDragStart(type: NodeType, e: DragEvent) {
  e.dataTransfer?.setData('text/plain', type)
}
</script>

<template>
  <aside class="w-52 border-r border-border bg-bg-card flex flex-col overflow-hidden shrink-0">
    <div class="px-4 py-3 border-b border-border">
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
  </aside>
</template>
