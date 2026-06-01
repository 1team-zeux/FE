# Style System & Global Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the dashboard style system and base layout for the zeux-frontend project.

**Architecture:** Define global CSS variables for branding, update the main style sheet to use Tailwind with these variables, and create a reusable AppLayout component using CSS Grid.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS, CSS Variables.

---

### Task 1: Create brand-styles.css

**Files:**
- Create: `src/assets/brand-styles.css`

- [ ] **Step 1: Create src/assets/brand-styles.css**

```css
:root {
  --color-brand: #2980B9;
  --color-brand-light: #6DD5FA;
  --color-brand-subtle: #EFF6FF;
  --color-bg-page: #F8F9FA;
  --color-bg-card: #FFFFFF;
  --color-border: #E5E7EB;
  --color-text-primary: #111111;
  --color-status-critical: #ED213A;
  --color-status-warning: #F37335;
  --color-status-ok: #56ab2f;
  --rail-w: 232px;
  --topbar-h: 52px;
}
```

---

### Task 2: Update style.css

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Replace src/style.css content**

```css
@import './assets/brand-styles.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-bg-page text-text-primary;
}
```

---

### Task 3: Create AppLayout.vue

**Files:**
- Create: `src/components/shared/AppLayout.vue`

- [ ] **Step 1: Create directory src/components/shared**

Run: `mkdir -p src/components/shared`

- [ ] **Step 2: Create src/components/shared/AppLayout.vue**

```vue
<script setup lang="ts">
// Layout component for the dashboard
</script>

<template>
  <div class="grid grid-cols-[var(--rail-w)_1fr] grid-rows-[var(--topbar-h)_1fr] min-h-screen">
    <header class="col-span-2 bg-white border-b border-border z-10">
      <slot name="header">
        <div class="flex items-center h-full px-4 font-bold text-brand">
          ZeuX Dashboard
        </div>
      </slot>
    </header>
    
    <aside class="bg-white border-r border-border overflow-y-auto">
      <slot name="sidebar">
        <!-- Sidebar content goes here -->
      </slot>
    </aside>

    <main class="bg-bg-page overflow-y-auto">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
}
</style>
```

---

### Task 4: Verify main.ts and Commit

**Files:**
- Modify: `src/main.ts` (Verify)
- Shell: `git add .`, `git commit`

- [ ] **Step 1: Verify src/main.ts imports style.css**

Check `src/main.ts` content. It should already import `style.css` (or I should add it if missing, but it was missing in the `read_file` output).

Wait, the `read_file` output for `src/main.ts` was:
```typescript
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```
It is missing `import './style.css'`.

- [ ] **Step 2: Add style.css import to src/main.ts**

```typescript
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 3: Commit changes**

Run:
```bash
git add src/assets/brand-styles.css src/style.css src/components/shared/AppLayout.vue src/main.ts
git commit -m "style: setup global brand styles and layout shell"
```
