# Vue 3 + TypeScript Development Guidelines

This document defines the architectural standards and coding conventions for the project. All code must adhere to these rules to ensure maintainability, type safety, and scalability.

## 1. Core Tech Stack
- **Framework:** Vue 3 (Composition API with `<script setup>`)
- **Build Tool:** Vite
- **Language:** TypeScript (Strict Mode)
- **State Management:**
    - **Server State:** [TanStack Query (Vue Query)](https://tanstack.com/query/latest/docs/framework/vue/overview) - Handles all API data fetching, caching, and synchronization.
    - **Client State:** [Pinia](https://pinia.vuejs.org/) - Handles global UI state, user sessions, and local-only data.
- **Validation:** [Zod](https://zod.dev/) - Runtime schema validation for API responses.
- **Styling:** Tailwind CSS (preferred) or Vanilla CSS.

---

## 2. Feature-Based Architecture
We follow a **Feature-First** directory structure. A "feature" is a self-contained domain module.

### Directory Structure
```text
src/
├── components/         # Shared UI components (Button, Input, Modal)
├── composables/        # Shared global logic (useWindowSize, useAuth)
├── features/           # Domain-driven modules
│   └── [feature-name]/
│       ├── api/        # TanStack Query hooks and Axios calls
│       ├── components/ # Components exclusive to this feature
│       ├── stores/     # Feature-specific Pinia stores (if needed)
│       ├── types/      # Zod schemas and TS types
│       └── index.ts    # Public API for the feature (Barrel Export)
├── services/           # Global API client (Axios instance)
└── pages/              # Route components (Views)
```

### Rule: Public API (Barrel Exports)
- Every feature must have an `index.ts`.
- **Only** export what is necessary for other parts of the app.
- **Constraint:** Never import from a feature's internal folders directly (e.g., `import X from '@/features/auth/api/X'`). Always use the public entry point: `import { X } from '@/features/auth'`.

---

## 3. Data & Communication

### Server State vs. Client State
- **Do not fetch or store API data in Pinia.** Use TanStack Query.
- Pinia should remain "lean," storing only UI-related state or authenticated user metadata.

### Schema Validation (Zod)
- All API responses must be validated at runtime using Zod.
- **Rule:** Treat all external data as "untrusted." Define a schema for every API endpoint.
- Integration: Use Zod's `.parse()` or `.safeParse()` within the API service layer.

### Global Error Handling
- Avoid redundant `try-catch` blocks in components.
- Use TanStack Query's `QueryClient` global configuration for consistent error notifications (e.g., Toast alerts).
- Utilize Vue's `onErrorCaptured` for localized UI error boundaries.

---

## 4. Component Patterns

### Headless & Compound Components
- **Headless:** Separate logic from presentation. Use Composables to handle complex state management for UI elements (e.g., `useDropdown`).
- **Compound:** For complex UI like Tabs or Modals, use a compound pattern:
  ```vue
  <Tabs>
    <TabList>
      <Tab>Item 1</Tab>
    </TabList>
    <TabPanel>Content 1</TabPanel>
  </Tabs>
  ```
- This maximizes flexibility and prevents "Prop Drilling" within UI components.

---

## 5. Coding Standards

### TypeScript
- **No `any` allowed.** Use `unknown` if a type is truly dynamic.
- Prefer `type` for definitions unless `interface` is required for declaration merging.
- Use `defineProps<T>()` and `defineEmits<T>()` with generic type arguments for full type safety.

### Vue Standards
- Always use `<script setup lang="ts">`.
- Keep components focused. If a component exceeds 200 lines, extract logic into a feature-specific Composable.
- Use `defineAsyncComponent` for heavy feature modules to optimize bundle size.

---

## 6. Testing Strategy
- **Unit/Logic:** Vitest.
- **Component:** Vitest + Vue Test Utils.
- **E2E:** Playwright.
- Focus on testing **behavior** (what the user sees/does) rather than implementation details.
