<script setup lang="ts">
// Main Layout for ZeuX Monitoring Dashboard
</script>

<template>
  <div class="grid grid-cols-[var(--rail-w)_1fr] grid-rows-[var(--topbar-h)_1fr] h-screen bg-bg-page text-text-primary">
    <!-- Topbar -->
    <header class="col-span-2 border-b border-border bg-bg-card flex items-center px-4 z-50">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 bg-brand rounded flex items-center justify-center text-white font-bold text-sm">Z</div>
        <div>
          <div class="text-sm font-bold leading-none text-text-primary">ZeuX</div>
          <div class="text-[10px] text-gray-400 leading-none mt-1">SK AX · AIOps Monitoring</div>
        </div>
      </div>
      <div class="flex-1"></div>
      <div class="flex items-center gap-4 text-xs">
        <span class="text-gray-400">Operating Team · On Duty</span>
      </div>
    </header>

    <!-- Sidebar Rail -->
    <aside class="border-r border-border bg-bg-card overflow-y-auto">
      <slot name="rail" />
    </aside>

    <!-- Main Content -->
    <main class="overflow-y-auto relative">
      <slot />
    </main>
  </div>
</template>
