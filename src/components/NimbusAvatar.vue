<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { mountSvgAnimation } from '@/utils/mountSvgAnimation'

import idleSvg from '@/assets/nimbus/Nimbus_Idle.svg?raw'
import clapSvg from '@/assets/nimbus/Nimbus_Clap.svg?raw'
import notifySvg from '@/assets/nimbus/Nimbus_Notify.svg?raw'
import questionSvg from '@/assets/nimbus/Nimbus_Question.svg?raw'

export type NimbusVariant = 'idle' | 'clap' | 'notify' | 'question'

const props = withDefaults(defineProps<{
  variant?: NimbusVariant
  size?: number
  scale?: number
  hideWatermark?: boolean
}>(), {
  variant: 'idle',
  size: 108,
  scale: 1,
  hideWatermark: true,
})

const SVG_BY_VARIANT: Record<NimbusVariant, string> = {
  idle: idleSvg,
  clap: clapSvg,
  notify: notifySvg,
  question: questionSvg,
}

const hostRef = ref<HTMLElement | null>(null)
let loadToken = 0

async function renderVariant(variant: NimbusVariant) {
  await nextTick()
  const host = hostRef.value
  if (!host) return

  const token = ++loadToken
  const markup = SVG_BY_VARIANT[variant]
  if (token !== loadToken) return

  mountSvgAnimation(host, markup)
}

onMounted(() => {
  void renderVariant(props.variant)
})

watch(() => props.variant, (variant) => {
  void renderVariant(variant)
})

onBeforeUnmount(() => {
  loadToken++
  hostRef.value?.replaceChildren()
})
</script>

<template>
  <div
    class="nimbus-avatar"
    :class="{ 'nimbus-avatar--no-watermark': hideWatermark }"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  >
    <div
      ref="hostRef"
      class="nimbus-avatar__host"
      :style="{ '--nimbus-scale': scale }"
    />
  </div>
</template>

<style scoped>
.nimbus-avatar {
  position: relative;
  flex-shrink: 0;
  background: transparent;
}

.nimbus-avatar__host {
  width: 100%;
  height: 100%;
}

.nimbus-avatar__host :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  transform: scale(var(--nimbus-scale, 1));
  transform-origin: center center;
}

/* SVGator watermark sits in the bottom-right ~28% × ~13% of the viewBox. */
.nimbus-avatar--no-watermark .nimbus-avatar__host {
  clip-path: polygon(
    0% 0%,
    100% 0%,
    100% 87%,
    71% 87%,
    71% 100%,
    0% 100%
  );
}
</style>
