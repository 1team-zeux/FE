<script setup lang="ts">
import { RouterLink, useLink } from 'vue-router'

interface NavItem {
  label: string
  to: string
  icon: 'home' | 'document' | 'bolt' | 'layers'
}

interface Shortcut {
  label: string
  dot: 'critical' | 'brand' | 'muted'
}

const workspaceItems: NavItem[] = [
  { label: 'Overview Home',   to: '/',       icon: 'home'     },
  { label: 'SLA Bundles',     to: '/sla',    icon: 'document' },
  { label: 'MELA Timelines',  to: '/mela',   icon: 'bolt'     },
  { label: 'Topology Design', to: '/iac/1',  icon: 'layers'   },
]

const shortcuts: Shortcut[] = [
  { label: 'SKT T-Care Connect', dot: 'critical' },
  { label: 'AI Noise Filter',    dot: 'brand'    },
  { label: 'Infrastructure Logs', dot: 'muted'   },
]
</script>

<template>
  <aside class="w-64 bg-bg-card border-r border-border flex flex-col p-6 shrink-0">
    <!-- Logo -->
    <div class="flex items-center gap-2.5 mb-8 px-2">
      <div class="w-9 h-9 btn-brand rounded-lg flex items-center justify-center text-white font-bold text-base shrink-0">Z</div>
      <span class="font-bold text-lg tracking-tight text-text-primary">ZeuX Platform</span>
    </div>

    <nav class="space-y-6">
      <!-- Workspace -->
      <div>
        <span class="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-2">Workspace</span>
        <ul class="mt-2 space-y-0.5">
          <li v-for="item in workspaceItems" :key="item.to">
            <RouterLink
              :to="item.to"
              custom
              v-slot="{ isActive, navigate }"
            >
              <a
                href="#"
                @click.prevent="navigate"
                :class="[
                  'flex items-center gap-3 px-2 py-2 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-50 text-text-primary'
                    : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary',
                ]"
              >
                <!-- Home icon -->
                <svg
                  v-if="item.icon === 'home'"
                  :class="['w-4 h-4 shrink-0', isActive ? 'text-[var(--color-brand)]' : 'text-current']"
                  fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <!-- Document icon -->
                <svg
                  v-else-if="item.icon === 'document'"
                  :class="['w-4 h-4 shrink-0', isActive ? 'text-[var(--color-brand)]' : 'text-current']"
                  fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <!-- Bolt icon -->
                <svg
                  v-else-if="item.icon === 'bolt'"
                  :class="['w-4 h-4 shrink-0', isActive ? 'text-[var(--color-brand)]' : 'text-current']"
                  fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <!-- Layers icon -->
                <svg
                  v-else-if="item.icon === 'layers'"
                  :class="['w-4 h-4 shrink-0', isActive ? 'text-[var(--color-brand)]' : 'text-current']"
                  fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>

                <span :class="isActive ? 'text-brand-gradient font-bold' : ''">
                  {{ item.label }}
                </span>
              </a>
            </RouterLink>
          </li>
        </ul>
      </div>

      <!-- Shortcuts -->
      <div>
        <span class="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-2">Shortcuts</span>
        <ul class="mt-2 space-y-0.5">
          <li v-for="shortcut in shortcuts" :key="shortcut.label">
            <a href="#" class="flex items-center gap-3 px-2 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              <span
                :class="[
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  shortcut.dot === 'critical' && 'bg-[var(--color-status-critical)]',
                  shortcut.dot === 'muted'    && 'bg-border',
                ]"
                :style="shortcut.dot === 'brand'
                  ? 'background: linear-gradient(to bottom, var(--color-brand-light), var(--color-brand))'
                  : undefined"
              />
              {{ shortcut.label }}
            </a>
          </li>
        </ul>
      </div>
    </nav>
  </aside>
</template>
