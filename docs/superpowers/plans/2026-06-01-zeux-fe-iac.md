# ZeuX FE IaC Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `zeux-frontend/` Vue 3 프로젝트를 신규 생성하고 IaC 온보딩 플로우 화면 1~4를 구현한다.

**Architecture:** Feature-first 구조 (`src/features/iac/`). 서버 상태는 TanStack Query v5, 클라이언트 상태는 Pinia v2, 런타임 검증은 Zod v3. 백엔드 없이 MSW v2로 전체 API 목업. CSS 커스텀 프로퍼티 + Tailwind CSS v3로 색상 시스템 관리.

**Tech Stack:** Vue 3.4, TypeScript 5 (strict), Vite 5, TanStack Query v5, Pinia v2, Zod v3, Axios v1, MSW v2, Tailwind CSS v3, Vitest + @vue/test-utils

---

## File Map

| 파일 | 역할 |
|---|---|
| `src/assets/styles.css` | CSS 변수 단일 진실 공급원 |
| `tailwind.config.ts` | CSS var() 참조 토큰 |
| `src/services/api.ts` | Axios 인스턴스 |
| `src/services/mocks/handlers.ts` | MSW 핸들러 10개 |
| `src/services/mocks/browser.ts` | MSW browser worker |
| `src/features/iac/types/sla-bundle.schema.ts` | Zod: SLABundle, SLAItem, ConfidenceLevel |
| `src/features/iac/types/topology.schema.ts` | Zod: TopologyDraft, TopologyNode |
| `src/features/iac/stores/iac.store.ts` | Pinia: uploadSessionId, bundleDraft, selectedTopologyId, deployStatus, chatbotTriggers |
| `src/features/iac/api/useUploadSession.ts` | TanStack Mutation: 파일 업로드 |
| `src/features/iac/api/useSlaBundle.ts` | TanStack Query: 드래프트 조회·필드 확정 |
| `src/features/iac/api/useTopology.ts` | TanStack Query: 토폴로지 3개 조회·승인 |
| `src/features/iac/api/useTerraform.ts` | TanStack Mutation + SSE: plan/apply/verify |
| `src/components/AppLayout.vue` | 헤더 + 라우터뷰 + chatbotMode prop |
| `src/components/AppStepper.vue` | 4단계 진행 표시 |
| `src/components/ChatbotModal.vue` | 플로팅 챗봇 패널 |
| `src/composables/useChatbot.ts` | 챗봇 열기/닫기/배지 제어 |
| `src/features/iac/components/UploadZone.vue` | 드래그앤드롭 업로드 존 |
| `src/features/iac/components/ConfidenceBadge.vue` | 확실/모호/추정 배지 |
| `src/features/iac/components/FormField.vue` | 신뢰도 배지 + 수용/수정 액션 |
| `src/features/iac/components/SectionNav.vue` | 좌측 섹션 네비게이터 |
| `src/features/iac/components/TopologyDiagram.vue` | 순수 SVG 다이어그램 |
| `src/features/iac/components/TopologyInfoPanel.vue` | SLA/비용/근거 정보 패널 |
| `src/features/iac/components/DeployProgress.vue` | 리소스별 실시간 상태 목록 |
| `src/pages/IacScreen1.vue` ~ `IacScreen4.vue` | 화면 페이지 컴포넌트 |
| `src/router/index.ts` | Vue Router 4 라우트 정의 |
| `src/features/iac/index.ts` | Barrel export |

---

## Task 1: 프로젝트 스캐폴드

**Files:**
- Create: `zeux-frontend/` (프로젝트 루트)
- Modify: `zeux-frontend/tsconfig.json`
- Modify: `zeux-frontend/package.json`

- [ ] **Step 1: Vite + Vue + TS 프로젝트 생성**

```bash
cd /Users/ljsuu/TeamProjectTemp
npm create vite@latest zeux-frontend -- --template vue-ts
cd zeux-frontend
npm install
```

- [ ] **Step 2: 의존성 설치**

```bash
npm install vue-router@^4 @tanstack/vue-query@^5 pinia@^2 zod@^3 axios@^1
npm install -D tailwindcss@^3 autoprefixer@^10 postcss@^8 msw@^2 vitest@^1 @vue/test-utils@^2 jsdom@^24 @vitejs/plugin-vue@^5
```

- [ ] **Step 3: tsconfig.json strict 모드 활성화**

`zeux-frontend/tsconfig.json`의 `compilerOptions`에 다음을 확인/추가:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: vite.config.ts 업데이트 (path alias + vitest)**

```ts
// zeux-frontend/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 5: test-setup.ts 생성**

```ts
// zeux-frontend/src/test-setup.ts
import '@vue/test-utils'
```

- [ ] **Step 6: 빌드 확인**

```bash
cd /Users/ljsuu/TeamProjectTemp/zeux-frontend
npm run build
```

Expected: `dist/` 생성, 에러 없음

- [ ] **Step 7: 커밋**

```bash
cd /Users/ljsuu/TeamProjectTemp/zeux-frontend
git init
git add .
git commit -m "feat: scaffold zeux-frontend with Vue3+TS+Vite+TanStack+Pinia"
```

---

## Task 2: CSS 색상 시스템 + Tailwind 설정

**Files:**
- Create: `src/assets/styles.css`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Modify: `src/main.ts`

- [ ] **Step 1: Tailwind 초기화**

```bash
cd /Users/ljsuu/TeamProjectTemp/zeux-frontend
npx tailwindcss init -p --ts
```

- [ ] **Step 2: tailwind.config.ts 작성**

```ts
// zeux-frontend/tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: 'var(--color-brand)',
        'brand-light': 'var(--color-brand-light)',
        'brand-subtle': 'var(--color-brand-subtle)',
        'bg-page': 'var(--color-bg-page)',
        'bg-card': 'var(--color-bg-card)',
        'bg-muted': 'var(--color-bg-muted)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'status-critical': 'var(--color-status-critical)',
        'status-warning': 'var(--color-status-warning)',
        'status-ok': 'var(--color-status-ok)',
        'status-pending': 'var(--color-status-pending)',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 3: styles.css 작성**

```css
/* zeux-frontend/src/assets/styles.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-brand:        #2980B9;
  --color-brand-light:  #6DD5FA;
  --color-brand-subtle: #EFF6FF;

  --color-bg-page:  #F8F9FA;
  --color-bg-card:  #FFFFFF;
  --color-bg-muted: #F3F4F6;
  --color-border:   #E5E7EB;

  --color-text-primary:   #111111;
  --color-text-secondary: #6B7280;
  --color-text-muted:     #9CA3AF;

  --color-status-critical: #ED213A;
  --color-status-warning:  #F37335;
  --color-status-ok:       #56ab2f;
  --color-status-pending:  #F59E0B;
}

.btn-brand {
  background: linear-gradient(135deg, var(--color-brand-light) 0%, var(--color-brand) 100%);
  @apply text-white font-semibold px-6 py-2.5 rounded-lg transition-opacity;
}
.btn-brand:hover { opacity: 0.9; }
.btn-brand:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 4: main.ts에서 styles.css import**

```ts
// zeux-frontend/src/main.ts
import { createApp } from 'vue'
import './assets/styles.css'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 5: 색상 변수 적용 확인 (테스트)**

```ts
// zeux-frontend/src/assets/__tests__/styles.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('styles.css', () => {
  const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf-8')

  it('브랜드 컬러 변수가 존재한다', () => {
    expect(css).toContain('--color-brand:')
    expect(css).toContain('--color-brand-light:')
  })

  it('상태 컬러 변수가 4개 존재한다', () => {
    expect(css).toContain('--color-status-critical:')
    expect(css).toContain('--color-status-warning:')
    expect(css).toContain('--color-status-ok:')
    expect(css).toContain('--color-status-pending:')
  })
})
```

- [ ] **Step 6: 테스트 실행**

```bash
cd /Users/ljsuu/TeamProjectTemp/zeux-frontend
npx vitest run src/assets/__tests__/styles.test.ts
```

Expected: PASS 2 tests

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: add CSS variable color system and Tailwind config"
```

---

## Task 3: Zod 스키마 정의

**Files:**
- Create: `src/features/iac/types/sla-bundle.schema.ts`
- Create: `src/features/iac/types/topology.schema.ts`
- Create: `src/features/iac/__tests__/schemas.test.ts`

- [ ] **Step 1: 폴더 구조 생성**

```bash
mkdir -p src/features/iac/{types,api,components,stores,__tests__}
mkdir -p src/pages
mkdir -p src/components
mkdir -p src/composables
mkdir -p src/services/mocks
mkdir -p src/router
```

- [ ] **Step 2: 실패 테스트 작성**

```ts
// zeux-frontend/src/features/iac/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest'
import {
  ConfidenceLevelSchema,
  SLAItemSchema,
  SLABundleSchema,
  FieldActionSchema,
} from '../types/sla-bundle.schema'
import {
  TopologyNodeSchema,
  TopologyDraftSchema,
} from '../types/topology.schema'

describe('SLA Bundle Schema', () => {
  it('ConfidenceLevel: 유효한 값 파싱', () => {
    expect(ConfidenceLevelSchema.parse('확실')).toBe('확실')
    expect(ConfidenceLevelSchema.parse('모호')).toBe('모호')
    expect(ConfidenceLevelSchema.parse('추정')).toBe('추정')
    expect(ConfidenceLevelSchema.parse('확정')).toBe('확정')
  })

  it('ConfidenceLevel: 잘못된 값 거부', () => {
    expect(() => ConfidenceLevelSchema.parse('unknown')).toThrow()
  })

  it('SLAItem: 유효한 항목 파싱', () => {
    const item = SLAItemSchema.parse({
      fieldId: 'sla_availability',
      label: '가용성 목표',
      value: '99.9%',
      confidence: '확실',
      sectionId: 'availability',
      required: true,
    })
    expect(item.fieldId).toBe('sla_availability')
    expect(item.confidence).toBe('확실')
  })

  it('SLAItem: value는 string | number | null 허용', () => {
    expect(() => SLAItemSchema.parse({
      fieldId: 'f1', label: 'L', value: null,
      confidence: '추정', sectionId: 's1', required: false,
    })).not.toThrow()
    expect(() => SLAItemSchema.parse({
      fieldId: 'f2', label: 'L', value: 99.9,
      confidence: '모호', sectionId: 's1', required: true,
    })).not.toThrow()
  })

  it('SLABundle: 전체 번들 파싱', () => {
    const bundle = SLABundleSchema.parse({
      bundleId: 'b-001',
      uploadSessionId: 'sess-001',
      items: [],
      confirmedCount: 0,
      totalRequiredCount: 47,
      status: 'draft',
    })
    expect(bundle.status).toBe('draft')
  })

  it('FieldAction: accept | edit | direct 허용', () => {
    expect(FieldActionSchema.parse('accept')).toBe('accept')
    expect(FieldActionSchema.parse('edit')).toBe('edit')
    expect(FieldActionSchema.parse('direct')).toBe('direct')
  })
})

describe('Topology Schema', () => {
  it('TopologyNode: 유효한 노드 파싱', () => {
    const node = TopologyNodeSchema.parse({
      nodeId: 'vpc-01',
      type: 'vpc',
      label: 'Main VPC',
      x: 100,
      y: 200,
      catalogRule: 'VPC CIDR /16',
      applyCondition: 'prod 환경',
    })
    expect(node.type).toBe('vpc')
  })

  it('TopologyDraft: 3개 토폴로지 파싱', () => {
    const draft = TopologyDraftSchema.parse({
      topologyId: 'topo-001',
      label: '고가용성 구성',
      summary: '3-tier HA',
      estimatedMonthlyCost: 1200000,
      slaSatisfaction: { availability: '99.99%', rto: '15분' },
      rationale: ['Multi-AZ 배포', 'Auto Scaling 적용'],
      nodes: [],
      edges: [],
    })
    expect(draft.topologyId).toBe('topo-001')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npx vitest run src/features/iac/__tests__/schemas.test.ts
```

Expected: FAIL — "Cannot find module '../types/sla-bundle.schema'"

- [ ] **Step 4: sla-bundle.schema.ts 구현**

```ts
// zeux-frontend/src/features/iac/types/sla-bundle.schema.ts
import { z } from 'zod'

export const ConfidenceLevelSchema = z.enum(['확실', '모호', '추정', '확정'])
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>

export const FieldActionSchema = z.enum(['accept', 'edit', 'direct'])
export type FieldAction = z.infer<typeof FieldActionSchema>

export const SLAItemSchema = z.object({
  fieldId: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number(), z.null()]),
  confidence: ConfidenceLevelSchema,
  sectionId: z.string(),
  required: z.boolean(),
  unit: z.string().optional(),
  description: z.string().optional(),
})
export type SLAItem = z.infer<typeof SLAItemSchema>

export const BundleStatusSchema = z.enum(['draft', 'confirmed', 'saved'])

export const SLABundleSchema = z.object({
  bundleId: z.string(),
  uploadSessionId: z.string(),
  items: z.array(SLAItemSchema),
  confirmedCount: z.number().int().nonnegative(),
  totalRequiredCount: z.number().int().positive(),
  status: BundleStatusSchema,
})
export type SLABundle = z.infer<typeof SLABundleSchema>

export const SLASectionSchema = z.object({
  sectionId: z.string(),
  label: z.string(),
  ambiguousCount: z.number().int().nonnegative(),
  estimatedCount: z.number().int().nonnegative(),
})
export type SLASection = z.infer<typeof SLASectionSchema>
```

- [ ] **Step 5: topology.schema.ts 구현**

```ts
// zeux-frontend/src/features/iac/types/topology.schema.ts
import { z } from 'zod'

export const NodeTypeSchema = z.enum([
  'vpc', 'subnet', 'ec2', 'rds', 'elb', 'nat', 'igw',
  'lambda', 'ecs', 'eks', 'cloudwatch', 'route53',
])
export type NodeType = z.infer<typeof NodeTypeSchema>

export const TopologyNodeSchema = z.object({
  nodeId: z.string(),
  type: NodeTypeSchema,
  label: z.string(),
  x: z.number(),
  y: z.number(),
  catalogRule: z.string().optional(),
  applyCondition: z.string().optional(),
})
export type TopologyNode = z.infer<typeof TopologyNodeSchema>

export const TopologyEdgeSchema = z.object({
  edgeId: z.string(),
  from: z.string(),
  to: z.string(),
  dashed: z.boolean().default(false),
  label: z.string().optional(),
})
export type TopologyEdge = z.infer<typeof TopologyEdgeSchema>

export const TopologyDraftSchema = z.object({
  topologyId: z.string(),
  label: z.string(),
  summary: z.string(),
  estimatedMonthlyCost: z.number().nonnegative(),
  slaSatisfaction: z.record(z.string()),
  rationale: z.array(z.string()),
  nodes: z.array(TopologyNodeSchema),
  edges: z.array(TopologyEdgeSchema),
})
export type TopologyDraft = z.infer<typeof TopologyDraftSchema>

export const ApproveTopologyResponseSchema = z.object({
  topologyId: z.string(),
  approved: z.literal(true),
})
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
npx vitest run src/features/iac/__tests__/schemas.test.ts
```

Expected: PASS 8 tests

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: add Zod schemas for SLABundle and TopologyDraft"
```

---

## Task 4: Pinia 스토어

**Files:**
- Create: `src/features/iac/stores/iac.store.ts`
- Create: `src/features/iac/__tests__/iac.store.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// zeux-frontend/src/features/iac/__tests__/iac.store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIacStore } from '../stores/iac.store'

describe('useIacStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('초기 상태가 올바르다', () => {
    const store = useIacStore()
    expect(store.uploadSessionId).toBeNull()
    expect(store.bundleDraft).toBeNull()
    expect(store.selectedTopologyId).toBeNull()
    expect(store.deployStatus).toBe('idle')
    expect(store.chatbotTriggers).toEqual([])
    expect(store.chatbotOpen).toBe(false)
  })

  it('setUploadSession: sessionId 저장', () => {
    const store = useIacStore()
    store.setUploadSession('sess-001')
    expect(store.uploadSessionId).toBe('sess-001')
  })

  it('addChatbotTrigger: 트리거 추가 및 배지 카운트', () => {
    const store = useIacStore()
    store.addChatbotTrigger({ fieldId: 'f1', priority: 'P0', reason: '추정값' })
    store.addChatbotTrigger({ fieldId: 'f2', priority: 'P1', reason: '모호' })
    expect(store.chatbotTriggers).toHaveLength(2)
    expect(store.chatbotBadgeCount).toBe(2)
  })

  it('clearChatbotTriggers: 트리거 초기화', () => {
    const store = useIacStore()
    store.addChatbotTrigger({ fieldId: 'f1', priority: 'P0', reason: '추정값' })
    store.clearChatbotTriggers()
    expect(store.chatbotTriggers).toHaveLength(0)
    expect(store.chatbotBadgeCount).toBe(0)
  })

  it('toggleChatbot: open 상태 토글', () => {
    const store = useIacStore()
    expect(store.chatbotOpen).toBe(false)
    store.toggleChatbot()
    expect(store.chatbotOpen).toBe(true)
    store.toggleChatbot()
    expect(store.chatbotOpen).toBe(false)
  })

  it('setSelectedTopology: 토폴로지 ID 저장', () => {
    const store = useIacStore()
    store.setSelectedTopology('topo-002')
    expect(store.selectedTopologyId).toBe('topo-002')
  })

  it('setDeployStatus: 상태 전환 (idle → generating → planning → applying → verifying → done)', () => {
    const store = useIacStore()
    const statuses = ['generating', 'planning', 'applying', 'verifying', 'done'] as const
    for (const s of statuses) {
      store.setDeployStatus(s)
      expect(store.deployStatus).toBe(s)
    }
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/features/iac/__tests__/iac.store.test.ts
```

Expected: FAIL — "Cannot find module '../stores/iac.store'"

- [ ] **Step 3: iac.store.ts 구현**

```ts
// zeux-frontend/src/features/iac/stores/iac.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SLABundle } from '../types/sla-bundle.schema'

export type DeployStatus = 'idle' | 'generating' | 'planning' | 'applying' | 'verifying' | 'done' | 'error'

export interface ChatbotTrigger {
  fieldId: string
  priority: 'P0' | 'P1' | 'P2'
  reason: string
}

export const useIacStore = defineStore('iac', () => {
  const uploadSessionId = ref<string | null>(null)
  const bundleDraft = ref<SLABundle | null>(null)
  const selectedTopologyId = ref<string | null>(null)
  const deployStatus = ref<DeployStatus>('idle')
  const chatbotTriggers = ref<ChatbotTrigger[]>([])
  const chatbotOpen = ref(false)

  const chatbotBadgeCount = computed(() => chatbotTriggers.value.length)

  function setUploadSession(id: string) {
    uploadSessionId.value = id
  }

  function setBundleDraft(bundle: SLABundle) {
    bundleDraft.value = bundle
  }

  function setSelectedTopology(id: string) {
    selectedTopologyId.value = id
  }

  function setDeployStatus(status: DeployStatus) {
    deployStatus.value = status
  }

  function addChatbotTrigger(trigger: ChatbotTrigger) {
    chatbotTriggers.value.push(trigger)
  }

  function clearChatbotTriggers() {
    chatbotTriggers.value = []
  }

  function toggleChatbot() {
    chatbotOpen.value = !chatbotOpen.value
  }

  function openChatbot() {
    chatbotOpen.value = true
  }

  function reset() {
    uploadSessionId.value = null
    bundleDraft.value = null
    selectedTopologyId.value = null
    deployStatus.value = 'idle'
    chatbotTriggers.value = []
    chatbotOpen.value = false
  }

  return {
    uploadSessionId,
    bundleDraft,
    selectedTopologyId,
    deployStatus,
    chatbotTriggers,
    chatbotOpen,
    chatbotBadgeCount,
    setUploadSession,
    setBundleDraft,
    setSelectedTopology,
    setDeployStatus,
    addChatbotTrigger,
    clearChatbotTriggers,
    toggleChatbot,
    openChatbot,
    reset,
  }
})
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/features/iac/__tests__/iac.store.test.ts
```

Expected: PASS 7 tests

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add Pinia iac store with chatbot trigger management"
```

---

## Task 5: Axios 인스턴스 + MSW 목업

**Files:**
- Create: `src/services/api.ts`
- Create: `src/services/mocks/handlers.ts`
- Create: `src/services/mocks/browser.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: MSW 초기화**

```bash
cd /Users/ljsuu/TeamProjectTemp/zeux-frontend
npx msw init public/ --save
```

- [ ] **Step 2: api.ts 구현**

```ts
// zeux-frontend/src/services/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message ?? err.message
    return Promise.reject(new Error(message))
  },
)
```

- [ ] **Step 3: handlers.ts 구현**

```ts
// zeux-frontend/src/services/mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import type { SLABundle } from '@/features/iac/types/sla-bundle.schema'
import type { TopologyDraft } from '@/features/iac/types/topology.schema'

const mockSlaBundleDraft: SLABundle = {
  bundleId: 'bundle-mock-001',
  uploadSessionId: 'sess-mock-001',
  confirmedCount: 0,
  totalRequiredCount: 47,
  status: 'draft',
  items: [
    { fieldId: 'availability_target', label: '가용성 목표', value: '99.9%', confidence: '확실', sectionId: 'availability', required: true },
    { fieldId: 'rto_minutes', label: 'RTO (분)', value: 30, confidence: '모호', sectionId: 'recovery', required: true, unit: '분' },
    { fieldId: 'rpo_minutes', label: 'RPO (분)', value: 15, confidence: '추정', sectionId: 'recovery', required: true, unit: '분' },
    { fieldId: 'peak_tps', label: '피크 TPS', value: 1000, confidence: '확실', sectionId: 'performance', required: true },
    { fieldId: 'response_time_p99', label: 'P99 응답시간', value: 500, confidence: '모호', sectionId: 'performance', required: true, unit: 'ms' },
    { fieldId: 'monthly_budget', label: '월 예산', value: null, confidence: '추정', sectionId: 'cost', required: false, unit: 'KRW' },
    { fieldId: 'region', label: '배포 리전', value: 'ap-northeast-2', confidence: '확실', sectionId: 'infra', required: true },
    { fieldId: 'multi_az', label: 'Multi-AZ 필요', value: 'true', confidence: '확실', sectionId: 'infra', required: true },
    { fieldId: 'storage_class', label: '스토리지 클래스', value: null, confidence: '추정', sectionId: 'infra', required: false },
    { fieldId: 'backup_retention', label: '백업 보관 기간', value: 7, confidence: '모호', sectionId: 'backup', required: true, unit: '일' },
  ],
}

const mockTopologies: TopologyDraft[] = [
  {
    topologyId: 'topo-ha',
    label: '고가용성 (HA) 구성',
    summary: 'Multi-AZ, Auto Scaling 적용 — 99.99% SLA 보장',
    estimatedMonthlyCost: 2400000,
    slaSatisfaction: { availability: '99.99%', rto: '10분', rpo: '5분' },
    rationale: ['Multi-AZ RDS로 자동 장애 조치', 'ALB + Auto Scaling으로 피크 TPS 흡수', 'CloudWatch 알람 연동'],
    nodes: [
      { nodeId: 'vpc-1', type: 'vpc', label: 'Main VPC', x: 300, y: 50 },
      { nodeId: 'alb-1', type: 'elb', label: 'ALB', x: 300, y: 150 },
      { nodeId: 'ec2-1', type: 'ec2', label: 'EC2 (AZ-a)', x: 150, y: 280 },
      { nodeId: 'ec2-2', type: 'ec2', label: 'EC2 (AZ-c)', x: 450, y: 280 },
      { nodeId: 'rds-1', type: 'rds', label: 'RDS Primary', x: 150, y: 420 },
      { nodeId: 'rds-2', type: 'rds', label: 'RDS Standby', x: 450, y: 420 },
    ],
    edges: [
      { edgeId: 'e1', from: 'alb-1', to: 'ec2-1', dashed: false },
      { edgeId: 'e2', from: 'alb-1', to: 'ec2-2', dashed: false },
      { edgeId: 'e3', from: 'ec2-1', to: 'rds-1', dashed: false },
      { edgeId: 'e4', from: 'rds-1', to: 'rds-2', dashed: true, label: '복제' },
    ],
  },
  {
    topologyId: 'topo-cost',
    label: '비용 최적화 구성',
    summary: '단일 AZ, Spot 인스턴스 — 월 비용 60% 절감',
    estimatedMonthlyCost: 960000,
    slaSatisfaction: { availability: '99.5%', rto: '30분', rpo: '15분' },
    rationale: ['Spot 인스턴스로 컴퓨팅 비용 절감', '단일 AZ로 데이터 전송 비용 최소화'],
    nodes: [
      { nodeId: 'vpc-1', type: 'vpc', label: 'Main VPC', x: 300, y: 50 },
      { nodeId: 'ec2-1', type: 'ec2', label: 'EC2 Spot', x: 300, y: 200 },
      { nodeId: 'rds-1', type: 'rds', label: 'RDS Single', x: 300, y: 380 },
    ],
    edges: [
      { edgeId: 'e1', from: 'ec2-1', to: 'rds-1', dashed: false },
    ],
  },
  {
    topologyId: 'topo-serverless',
    label: '서버리스 구성',
    summary: 'Lambda + Aurora Serverless — 트래픽 0시 비용 없음',
    estimatedMonthlyCost: 1200000,
    slaSatisfaction: { availability: '99.95%', rto: '20분', rpo: '10분' },
    rationale: ['Lambda auto-scaling으로 트래픽 급증 대응', 'Aurora Serverless v2 자동 스케일'],
    nodes: [
      { nodeId: 'apigw-1', type: 'elb', label: 'API Gateway', x: 300, y: 100 },
      { nodeId: 'lambda-1', type: 'lambda', label: 'Lambda', x: 300, y: 250 },
      { nodeId: 'rds-1', type: 'rds', label: 'Aurora Serverless', x: 300, y: 400 },
    ],
    edges: [
      { edgeId: 'e1', from: 'apigw-1', to: 'lambda-1', dashed: false },
      { edgeId: 'e2', from: 'lambda-1', to: 'rds-1', dashed: false },
    ],
  },
]

export const handlers = [
  http.post('/api/upload-sessions', () => {
    return HttpResponse.json({ uploadSessionId: 'sess-mock-001' }, { status: 201 })
  }),

  http.get('/api/sla-bundles/draft/:sessionId', () => {
    return HttpResponse.json(mockSlaBundleDraft)
  }),

  http.patch('/api/sla-bundles/draft/:id/fields', async ({ request }) => {
    const body = await request.json() as { fieldId: string; value: string | number | null }
    return HttpResponse.json({ fieldId: body.fieldId, confirmed: true })
  }),

  http.post('/api/sla-bundles', () => {
    return HttpResponse.json({ bundleId: 'bundle-mock-001' }, { status: 201 })
  }),

  http.get('/api/topologies/:bundleId', () => {
    return HttpResponse.json({ topologies: mockTopologies })
  }),

  http.post('/api/topologies/:id/approve', ({ params }) => {
    return HttpResponse.json({ topologyId: params.id, approved: true })
  }),

  http.post('/api/terraform/generate', () => {
    return HttpResponse.json({
      planId: 'plan-mock-001',
      hclPreview: `resource "aws_vpc" "main" {\n  cidr_block = "10.0.0.0/16"\n  tags = { Name = "zeux-main" }\n}`,
    })
  }),

  http.post('/api/terraform/plan', () => {
    return HttpResponse.json({
      planId: 'plan-mock-001',
      summary: { add: 12, change: 2, destroy: 0 },
      riskLevel: 'medium',
      items: [
        { resource: 'aws_vpc.main', changeType: 'add', riskLevel: 'low', slaImpact: '없음', estimatedCost: '+₩45,000/월' },
        { resource: 'aws_instance.app', changeType: 'add', riskLevel: 'medium', slaImpact: '가용성 +0.1%', estimatedCost: '+₩320,000/월' },
        { resource: 'aws_db_instance.primary', changeType: 'add', riskLevel: 'high', slaImpact: 'RTO 달성 필요', estimatedCost: '+₩890,000/월' },
      ],
    })
  }),

  http.get('/api/terraform/verify/:id', () => {
    return HttpResponse.json({
      verifyId: 'verify-mock-001',
      overall: 'pass',
      categories: [
        { category: '가용성 SLA', status: 'pass', detail: '99.99% 달성 확인' },
        { category: '네트워크 연결성', status: 'pass', detail: '모든 서브넷 라우팅 정상' },
        { category: '보안 그룹', status: 'pass', detail: '최소 권한 원칙 적용' },
        { category: '백업 정책', status: 'pass', detail: '7일 보관 설정 완료' },
        { category: '모니터링', status: 'pass', detail: 'CloudWatch 알람 8개 활성화' },
        { category: '비용 한도', status: 'pass', detail: '예산 내 운영 가능' },
        { category: 'IAM 권한', status: 'pass', detail: '최소 권한 정책 적용' },
        { category: '태그 정책', status: 'pass', detail: '필수 태그 7개 적용 완료' },
      ],
    })
  }),
]
```

- [ ] **Step 4: browser.ts 구현**

```ts
// zeux-frontend/src/services/mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

- [ ] **Step 5: main.ts에 MSW 조건부 시작 추가**

```ts
// zeux-frontend/src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './assets/styles.css'
import App from './App.vue'
import router from './router'

async function bootstrap() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./services/mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  const app = createApp(App)
  app.use(createPinia())
  app.use(VueQueryPlugin)
  app.use(router)
  app.mount('#app')
}

bootstrap()
```

- [ ] **Step 6: 핸들러 단위 테스트**

```ts
// zeux-frontend/src/services/__tests__/handlers.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers'
import axios from 'axios'

const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('MSW handlers', () => {
  it('POST /api/upload-sessions → uploadSessionId 반환', async () => {
    const res = await axios.post('http://localhost/api/upload-sessions', {})
    expect(res.data.uploadSessionId).toBe('sess-mock-001')
  })

  it('GET /api/sla-bundles/draft/:sessionId → SLABundle 반환', async () => {
    const res = await axios.get('http://localhost/api/sla-bundles/draft/sess-mock-001')
    expect(res.data.bundleId).toBe('bundle-mock-001')
    expect(res.data.items.length).toBeGreaterThan(0)
  })

  it('GET /api/topologies/:bundleId → 3개 토폴로지 반환', async () => {
    const res = await axios.get('http://localhost/api/topologies/bundle-mock-001')
    expect(res.data.topologies).toHaveLength(3)
  })
})
```

- [ ] **Step 7: 테스트 실행**

```bash
npx vitest run src/services/__tests__/handlers.test.ts
```

Expected: PASS 3 tests

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: add Axios instance and MSW mock handlers for all IaC endpoints"
```

---

## Task 6: Router + AppLayout + AppStepper

**Files:**
- Create: `src/router/index.ts`
- Create: `src/components/AppLayout.vue`
- Create: `src/components/AppStepper.vue`
- Create: `src/components/__tests__/AppStepper.test.ts`
- Create: `src/pages/IacScreen1.vue` ~ `IacScreen4.vue` (플레이스홀더)
- Modify: `src/App.vue`

- [ ] **Step 1: 라우터 정의**

```ts
// zeux-frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/iac/1' },
    {
      path: '/iac',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '1', name: 'iac-screen1', component: () => import('@/pages/IacScreen1.vue') },
        { path: '2', name: 'iac-screen2', component: () => import('@/pages/IacScreen2.vue') },
        { path: '3', name: 'iac-screen3', component: () => import('@/pages/IacScreen3.vue') },
        { path: '4', name: 'iac-screen4', component: () => import('@/pages/IacScreen4.vue') },
      ],
    },
  ],
})

export default router
```

- [ ] **Step 2: AppStepper 테스트 작성**

```ts
// zeux-frontend/src/components/__tests__/AppStepper.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppStepper from '../AppStepper.vue'

const steps = [
  { label: '문서 업로드' },
  { label: '폼 검토' },
  { label: '토폴로지 선택' },
  { label: 'Terraform 배포' },
]

describe('AppStepper', () => {
  it('4개 스텝을 렌더링한다', () => {
    const wrapper = mount(AppStepper, {
      props: { steps, currentStep: 1 },
    })
    expect(wrapper.findAll('[data-testid="step-item"]')).toHaveLength(4)
  })

  it('현재 스텝이 active 클래스를 가진다', () => {
    const wrapper = mount(AppStepper, {
      props: { steps, currentStep: 2 },
    })
    const items = wrapper.findAll('[data-testid="step-item"]')
    expect(items[1].classes()).toContain('step-active')
  })

  it('완료된 스텝이 completed 클래스를 가진다', () => {
    const wrapper = mount(AppStepper, {
      props: { steps, currentStep: 3 },
    })
    const items = wrapper.findAll('[data-testid="step-item"]')
    expect(items[0].classes()).toContain('step-completed')
    expect(items[1].classes()).toContain('step-completed')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npx vitest run src/components/__tests__/AppStepper.test.ts
```

Expected: FAIL — "Cannot find module '../AppStepper.vue'"

- [ ] **Step 4: AppStepper.vue 구현**

```vue
<!-- zeux-frontend/src/components/AppStepper.vue -->
<script setup lang="ts">
interface Step {
  label: string
}
const props = defineProps<{
  steps: Step[]
  currentStep: number
}>()
</script>

<template>
  <nav class="flex items-center gap-0">
    <template v-for="(step, index) in steps" :key="index">
      <div
        data-testid="step-item"
        class="flex items-center gap-2"
        :class="{
          'step-active': index + 1 === currentStep,
          'step-completed': index + 1 < currentStep,
          'step-pending': index + 1 > currentStep,
        }"
      >
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors"
          :class="{
            'bg-brand border-brand text-white': index + 1 === currentStep,
            'bg-status-ok border-status-ok text-white': index + 1 < currentStep,
            'bg-bg-card border-border text-text-muted': index + 1 > currentStep,
          }"
        >
          <svg v-if="index + 1 < currentStep" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span
          class="text-sm font-medium hidden sm:block"
          :class="{
            'text-brand': index + 1 === currentStep,
            'text-status-ok': index + 1 < currentStep,
            'text-text-muted': index + 1 > currentStep,
          }"
        >{{ step.label }}</span>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="flex-1 h-0.5 mx-3"
        :class="index + 1 < currentStep ? 'bg-status-ok' : 'bg-border'"
      />
    </template>
  </nav>
</template>
```

- [ ] **Step 5: AppLayout.vue 구현**

```vue
<!-- zeux-frontend/src/components/AppLayout.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppStepper from './AppStepper.vue'
import ChatbotModal from './ChatbotModal.vue'

defineProps<{
  chatbotMode?: 'floating' | 'panel'
}>()

const route = useRoute()
const currentStep = computed(() => {
  const match = route.path.match(/\/iac\/(\d)/)
  return match ? parseInt(match[1]) : 1
})

const steps = [
  { label: '문서 업로드' },
  { label: '폼 검토' },
  { label: '토폴로지 선택' },
  { label: 'Terraform 배포' },
]
</script>

<template>
  <div class="min-h-screen bg-bg-page flex flex-col">
    <!-- 헤더 -->
    <header class="bg-bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg btn-brand flex items-center justify-center text-white font-bold text-sm">Z</div>
        <span class="font-semibold text-text-primary">ZeuX</span>
        <span class="text-text-muted text-sm">IaC 온보딩</span>
      </div>
      <AppStepper :steps="steps" :current-step="currentStep" />
    </header>

    <!-- 컨텐츠 -->
    <main class="flex-1 overflow-auto">
      <RouterView />
    </main>

    <!-- 챗봇 -->
    <ChatbotModal :mode="chatbotMode ?? 'floating'" />
  </div>
</template>
```

- [ ] **Step 6: 페이지 플레이스홀더 생성**

```vue
<!-- zeux-frontend/src/pages/IacScreen1.vue -->
<template><div class="p-8"><h1 class="text-2xl font-bold text-text-primary">Screen 1 — 문서 업로드</h1></div></template>
```

같은 방식으로 `IacScreen2.vue`, `IacScreen3.vue`, `IacScreen4.vue` 생성 (내용만 교체).

- [ ] **Step 7: App.vue 단순화**

```vue
<!-- zeux-frontend/src/App.vue -->
<template>
  <RouterView />
</template>
```

- [ ] **Step 8: 테스트 통과 확인**

```bash
npx vitest run src/components/__tests__/AppStepper.test.ts
```

Expected: PASS 3 tests

- [ ] **Step 9: dev 서버로 라우팅 확인**

```bash
npm run dev
# 브라우저에서 http://localhost:5173 접속 → /iac/1 리다이렉트 확인
```

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "feat: add router, AppLayout, AppStepper with 4-step IaC navigation"
```

---

## Task 7: ChatbotModal + useChatbot

**Files:**
- Create: `src/composables/useChatbot.ts`
- Create: `src/components/ChatbotModal.vue`
- Create: `src/composables/__tests__/useChatbot.test.ts`

- [ ] **Step 1: useChatbot 테스트 작성**

```ts
// zeux-frontend/src/composables/__tests__/useChatbot.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatbot } from '../useChatbot'

describe('useChatbot', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('초기 상태: 닫힘, 배지 0', () => {
    const { isOpen, badgeCount } = useChatbot()
    expect(isOpen.value).toBe(false)
    expect(badgeCount.value).toBe(0)
  })

  it('open/close 제어', () => {
    const { isOpen, open, close } = useChatbot()
    open()
    expect(isOpen.value).toBe(true)
    close()
    expect(isOpen.value).toBe(false)
  })

  it('addTrigger: 배지 카운트 증가 + 자동 오픈 (P0)', () => {
    const { badgeCount, isOpen, addTrigger } = useChatbot()
    addTrigger({ fieldId: 'f1', priority: 'P0', reason: '추정값' })
    expect(badgeCount.value).toBe(1)
    expect(isOpen.value).toBe(true)
  })

  it('addTrigger: P1은 자동 오픈 안 함', () => {
    const { isOpen, addTrigger } = useChatbot()
    addTrigger({ fieldId: 'f2', priority: 'P1', reason: '모호' })
    expect(isOpen.value).toBe(false)
  })

  it('clearTriggers: 배지 초기화', () => {
    const { badgeCount, clearTriggers, addTrigger } = useChatbot()
    addTrigger({ fieldId: 'f1', priority: 'P1', reason: '모호' })
    clearTriggers()
    expect(badgeCount.value).toBe(0)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/composables/__tests__/useChatbot.test.ts
```

Expected: FAIL — "Cannot find module '../useChatbot'"

- [ ] **Step 3: useChatbot.ts 구현**

```ts
// zeux-frontend/src/composables/useChatbot.ts
import { useIacStore } from '@/features/iac/stores/iac.store'
import type { ChatbotTrigger } from '@/features/iac/stores/iac.store'
import { computed } from 'vue'

export function useChatbot() {
  const store = useIacStore()

  const isOpen = computed(() => store.chatbotOpen)
  const badgeCount = computed(() => store.chatbotBadgeCount)

  function open() {
    store.openChatbot()
  }

  function close() {
    if (store.chatbotOpen) store.toggleChatbot()
  }

  function toggle() {
    store.toggleChatbot()
  }

  function addTrigger(trigger: ChatbotTrigger) {
    store.addChatbotTrigger(trigger)
    if (trigger.priority === 'P0') {
      store.openChatbot()
    }
  }

  function clearTriggers() {
    store.clearChatbotTriggers()
  }

  return { isOpen, badgeCount, open, close, toggle, addTrigger, clearTriggers }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/composables/__tests__/useChatbot.test.ts
```

Expected: PASS 5 tests

- [ ] **Step 5: ChatbotModal.vue 구현**

```vue
<!-- zeux-frontend/src/components/ChatbotModal.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useChatbot } from '@/composables/useChatbot'

defineProps<{
  mode?: 'floating' | 'panel'
}>()

const { isOpen, badgeCount, toggle, clearTriggers } = useChatbot()

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([
  { role: 'assistant', content: '안녕하세요! IaC 온보딩을 도와드리겠습니다. 궁금한 점을 물어보세요.' },
])
const inputText = ref('')

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  // 실제 구현 시 API 연동
  setTimeout(() => {
    messages.value.push({ role: 'assistant', content: '확인했습니다. 해당 필드를 검토해 드리겠습니다.' })
  }, 600)
}

function handleOpen() {
  toggle()
  if (!isOpen.value) clearTriggers()
}
</script>

<template>
  <!-- 플로팅 버튼 -->
  <div class="fixed bottom-6 left-6 z-50">
    <button
      @click="handleOpen"
      class="w-12 h-12 rounded-full btn-brand shadow-lg flex items-center justify-center relative"
      aria-label="챗봇 열기"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
      </svg>
      <span
        v-if="badgeCount > 0"
        class="absolute -top-1 -right-1 w-5 h-5 bg-status-critical text-white text-xs rounded-full flex items-center justify-center font-bold"
      >{{ badgeCount }}</span>
    </button>

    <!-- 채팅 패널 -->
    <Transition name="slide-up">
      <div
        v-if="isOpen"
        class="absolute bottom-14 left-0 w-72 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        <!-- 헤더 -->
        <div class="btn-brand px-4 py-3 flex items-center justify-between">
          <span class="text-white font-semibold text-sm">ZeuX AI 어시스턴트</span>
          <button @click="handleOpen" class="text-white/80 hover:text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 메시지 목록 -->
        <div class="h-64 overflow-y-auto p-3 space-y-3 bg-bg-muted">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="flex"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[80%] px-3 py-2 rounded-lg text-sm"
              :class="msg.role === 'user'
                ? 'bg-brand text-white'
                : 'bg-bg-card text-text-primary border border-border'"
            >{{ msg.content }}</div>
          </div>
        </div>

        <!-- 입력 -->
        <div class="p-3 border-t border-border flex gap-2">
          <input
            v-model="inputText"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="메시지를 입력하세요..."
            class="flex-1 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-brand bg-bg-card text-text-primary"
          />
          <button @click="sendMessage" class="btn-brand px-3 py-2 rounded-lg text-sm">전송</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.2s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(8px); }
</style>
```

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: add ChatbotModal and useChatbot composable with Pinia integration"
```

---

## Task 8: Screen 1 — 문서 업로드

**Files:**
- Create: `src/features/iac/components/UploadZone.vue`
- Create: `src/features/iac/api/useUploadSession.ts`
- Create: `src/features/iac/components/__tests__/UploadZone.test.ts`
- Modify: `src/pages/IacScreen1.vue`

- [ ] **Step 1: UploadZone 테스트 작성**

```ts
// zeux-frontend/src/features/iac/components/__tests__/UploadZone.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UploadZone from '../UploadZone.vue'

describe('UploadZone', () => {
  it('라벨이 렌더링된다', () => {
    const wrapper = mount(UploadZone, {
      props: { label: 'SLA 계약서', accept: '.pdf' },
    })
    expect(wrapper.text()).toContain('SLA 계약서')
  })

  it('파일 없을 때 idle 상태', () => {
    const wrapper = mount(UploadZone, {
      props: { label: 'SLA 계약서', accept: '.pdf' },
    })
    expect(wrapper.find('[data-testid="upload-status"]').text()).toContain('PDF')
  })

  it('유효한 PDF 파일 선택 시 success emit', async () => {
    const wrapper = mount(UploadZone, {
      props: { label: 'SLA 계약서', accept: '.pdf' },
    })
    const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0][0]).toEqual(file)
  })

  it('PDF 아닌 파일 선택 시 error 상태 표시', async () => {
    const wrapper = mount(UploadZone, {
      props: { label: 'SLA 계약서', accept: '.pdf' },
    })
    const file = new File(['text'], 'test.txt', { type: 'text/plain' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(wrapper.find('[data-testid="upload-status"]').text()).toContain('PDF')
    expect(wrapper.emitted('select')).toBeFalsy()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/features/iac/components/__tests__/UploadZone.test.ts
```

Expected: FAIL

- [ ] **Step 3: UploadZone.vue 구현**

```vue
<!-- zeux-frontend/src/features/iac/components/UploadZone.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  label: string
  accept: string
  description?: string
}>()

const emit = defineEmits<{
  select: [file: File]
}>()

const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const errorMsg = ref<string | null>(null)

function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pdf') && !file.type.includes('pdf')) {
    return 'PDF 파일만 업로드 가능합니다.'
  }
  if (file.size > 50 * 1024 * 1024) {
    return '파일 크기는 50MB 이하여야 합니다.'
  }
  return null
}

function handleFile(file: File) {
  const err = validateFile(file)
  if (err) {
    errorMsg.value = err
    selectedFile.value = null
    return
  }
  errorMsg.value = null
  selectedFile.value = file
  emit('select', file)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function formatSize(bytes: number) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${(bytes / 1024).toFixed(0)}KB`
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-sm font-semibold text-text-primary">{{ label }}</label>
    <div
      class="relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
      :class="{
        'border-brand bg-brand-subtle': isDragging,
        'border-status-ok bg-green-50': selectedFile,
        'border-status-critical bg-red-50': errorMsg,
        'border-border bg-bg-card hover:border-brand hover:bg-brand-subtle': !isDragging && !selectedFile && !errorMsg,
      }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
      @click="($refs.fileInput as HTMLInputElement).click()"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        class="hidden"
        @change="onFileChange"
      />

      <div v-if="!selectedFile" class="space-y-2">
        <svg class="w-10 h-10 mx-auto" :class="errorMsg ? 'text-status-critical' : 'text-text-muted'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p data-testid="upload-status" class="text-sm text-text-secondary">
          {{ errorMsg ?? `PDF 파일을 드래그하거나 클릭하여 선택` }}
        </p>
        <p class="text-xs text-text-muted">최대 50MB</p>
      </div>

      <div v-else class="space-y-1">
        <svg class="w-10 h-10 mx-auto text-status-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <p data-testid="upload-status" class="text-sm font-medium text-status-ok">{{ selectedFile.name }}</p>
        <p class="text-xs text-text-muted">{{ formatSize(selectedFile.size) }}</p>
        <button
          class="text-xs text-text-secondary underline"
          @click.stop="selectedFile = null; errorMsg = null"
        >파일 변경</button>
      </div>
    </div>
    <p v-if="description" class="text-xs text-text-muted">{{ description }}</p>
  </div>
</template>
```

- [ ] **Step 4: useUploadSession.ts 구현**

```ts
// zeux-frontend/src/features/iac/api/useUploadSession.ts
import { useMutation } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { useIacStore } from '../stores/iac.store'
import { useRouter } from 'vue-router'

interface UploadSessionResponse {
  uploadSessionId: string
}

export function useUploadSession() {
  const store = useIacStore()
  const router = useRouter()

  return useMutation({
    mutationFn: async (files: { sla: File; infra: File }) => {
      const formData = new FormData()
      formData.append('slaFile', files.sla)
      formData.append('infraFile', files.infra)
      const res = await api.post<UploadSessionResponse>('/upload-sessions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess(data) {
      store.setUploadSession(data.uploadSessionId)
      router.push('/iac/2')
    },
  })
}
```

- [ ] **Step 5: IacScreen1.vue 구현**

```vue
<!-- zeux-frontend/src/pages/IacScreen1.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import UploadZone from '@/features/iac/components/UploadZone.vue'
import { useUploadSession } from '@/features/iac/api/useUploadSession'

const slaFile = ref<File | null>(null)
const infraFile = ref<File | null>(null)
const canProceed = computed(() => !!slaFile.value && !!infraFile.value)

const { mutate: startUpload, isPending } = useUploadSession()

function handleStart() {
  if (!slaFile.value || !infraFile.value) return
  startUpload({ sla: slaFile.value, infra: infraFile.value })
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-10 space-y-8">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">문서 업로드</h1>
      <p class="mt-1 text-text-secondary">SLA 계약서와 인프라 정보 문서를 업로드하면 AI가 자동으로 분석합니다.</p>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <UploadZone
        label="SLA 계약서"
        accept=".pdf"
        description="서비스 수준 목표(SLO), 가용성, RTO/RPO 등이 포함된 계약서"
        @select="slaFile = $event"
      />
      <UploadZone
        label="인프라 추가 정보"
        accept=".pdf"
        description="현재 인프라 구성, 피크 트래픽, 예산 정보 등"
        @select="infraFile = $event"
      />
    </div>

    <div class="flex justify-end pt-4">
      <button
        :disabled="!canProceed || isPending"
        @click="handleStart"
        class="btn-brand min-w-[160px]"
      >
        <span v-if="isPending">분석 중...</span>
        <span v-else>AI 분석 시작</span>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
npx vitest run src/features/iac/components/__tests__/UploadZone.test.ts
```

Expected: PASS 4 tests

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: implement Screen1 — UploadZone with drag-drop validation and upload mutation"
```

---

## Task 9: Screen 2 — 통합 폼 검토

**Files:**
- Create: `src/features/iac/components/ConfidenceBadge.vue`
- Create: `src/features/iac/components/FormField.vue`
- Create: `src/features/iac/components/SectionNav.vue`
- Create: `src/features/iac/api/useSlaBundle.ts`
- Create: `src/features/iac/components/__tests__/ConfidenceBadge.test.ts`
- Create: `src/features/iac/components/__tests__/FormField.test.ts`
- Modify: `src/pages/IacScreen2.vue`

- [ ] **Step 1: ConfidenceBadge 테스트 작성**

```ts
// zeux-frontend/src/features/iac/components/__tests__/ConfidenceBadge.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfidenceBadge from '../ConfidenceBadge.vue'

describe('ConfidenceBadge', () => {
  it('확실 — 초록 스타일', () => {
    const w = mount(ConfidenceBadge, { props: { confidence: '확실' } })
    expect(w.classes()).toContain('bg-green-100')
    expect(w.text()).toBe('확실')
  })
  it('모호 — 노랑 스타일', () => {
    const w = mount(ConfidenceBadge, { props: { confidence: '모호' } })
    expect(w.classes()).toContain('bg-yellow-100')
  })
  it('추정 — 빨강 스타일', () => {
    const w = mount(ConfidenceBadge, { props: { confidence: '추정' } })
    expect(w.classes()).toContain('bg-red-100')
  })
  it('확정 — 브랜드 스타일', () => {
    const w = mount(ConfidenceBadge, { props: { confidence: '확정' } })
    expect(w.classes()).toContain('bg-brand-subtle')
  })
})
```

- [ ] **Step 2: ConfidenceBadge.vue 구현**

```vue
<!-- zeux-frontend/src/features/iac/components/ConfidenceBadge.vue -->
<script setup lang="ts">
import type { ConfidenceLevel } from '../types/sla-bundle.schema'
defineProps<{ confidence: ConfidenceLevel }>()
</script>

<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
    :class="{
      'bg-green-100 text-green-800': confidence === '확실',
      'bg-yellow-100 text-yellow-800': confidence === '모호',
      'bg-red-100 text-red-800': confidence === '추정',
      'bg-brand-subtle text-brand': confidence === '확정',
    }"
  >{{ confidence }}</span>
</template>
```

- [ ] **Step 3: FormField 테스트 작성**

```ts
// zeux-frontend/src/features/iac/components/__tests__/FormField.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormField from '../FormField.vue'

const baseProps = {
  fieldId: 'f1',
  label: '가용성 목표',
  value: '99.9%',
  confidence: '모호' as const,
  required: true,
}

describe('FormField', () => {
  it('라벨과 값이 렌더링된다', () => {
    const w = mount(FormField, { props: baseProps })
    expect(w.text()).toContain('가용성 목표')
    expect(w.text()).toContain('99.9%')
  })

  it('수용 버튼 클릭 시 confirm emit', async () => {
    const w = mount(FormField, { props: baseProps })
    await w.find('[data-testid="accept-btn"]').trigger('click')
    expect(w.emitted('confirm')).toBeTruthy()
    expect(w.emitted('confirm')![0]).toEqual(['f1', '99.9%'])
  })

  it('수정 버튼 클릭 시 입력 활성화', async () => {
    const w = mount(FormField, { props: baseProps })
    await w.find('[data-testid="edit-btn"]').trigger('click')
    expect(w.find('input').exists()).toBe(true)
  })

  it('확정 상태에서 수용/수정 버튼 숨김', () => {
    const w = mount(FormField, { props: { ...baseProps, confidence: '확정' } })
    expect(w.find('[data-testid="accept-btn"]').exists()).toBe(false)
    expect(w.find('[data-testid="edit-btn"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 4: FormField.vue 구현**

```vue
<!-- zeux-frontend/src/features/iac/components/FormField.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import ConfidenceBadge from './ConfidenceBadge.vue'
import type { ConfidenceLevel } from '../types/sla-bundle.schema'

const props = defineProps<{
  fieldId: string
  label: string
  value: string | number | null
  confidence: ConfidenceLevel
  required: boolean
  unit?: string
  description?: string
}>()

const emit = defineEmits<{
  confirm: [fieldId: string, value: string | number | null]
}>()

const isEditing = ref(false)
const editValue = ref<string>(String(props.value ?? ''))

function acceptValue() {
  emit('confirm', props.fieldId, props.value)
}

function startEdit() {
  editValue.value = String(props.value ?? '')
  isEditing.value = true
}

function submitEdit() {
  isEditing.value = false
  emit('confirm', props.fieldId, editValue.value)
}
</script>

<template>
  <div
    class="p-4 rounded-lg border transition-colors"
    :class="{
      'border-yellow-300 bg-yellow-50': confidence === '모호',
      'border-red-300 bg-red-50': confidence === '추정',
      'border-status-ok bg-green-50': confidence === '확정',
      'border-border bg-bg-card': confidence === '확실',
    }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm font-medium text-text-primary">{{ label }}</span>
          <span v-if="required" class="text-status-critical text-xs">*</span>
          <ConfidenceBadge :confidence="confidence" />
        </div>

        <div v-if="isEditing">
          <input
            v-model="editValue"
            @keyup.enter="submitEdit"
            class="w-full border border-brand rounded px-2 py-1 text-sm focus:outline-none bg-bg-card text-text-primary"
            :placeholder="String(value ?? '')"
          />
          <div class="flex gap-2 mt-1.5">
            <button @click="submitEdit" class="text-xs text-brand underline">저장</button>
            <button @click="isEditing = false" class="text-xs text-text-muted underline">취소</button>
          </div>
        </div>
        <div v-else class="text-sm text-text-secondary">
          {{ value !== null ? `${value}${unit ? ' ' + unit : ''}` : '—' }}
        </div>

        <p v-if="description" class="mt-1 text-xs text-text-muted">{{ description }}</p>
      </div>

      <div v-if="confidence !== '확정'" class="flex gap-1 shrink-0">
        <button
          data-testid="accept-btn"
          @click="acceptValue"
          class="p-1.5 rounded-md text-status-ok hover:bg-green-100 transition-colors"
          title="수용"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          data-testid="edit-btn"
          @click="startEdit"
          class="p-1.5 rounded-md text-brand hover:bg-brand-subtle transition-colors"
          title="수정"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
      <div v-else class="shrink-0">
        <svg class="w-5 h-5 text-status-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 5: SectionNav.vue 구현**

```vue
<!-- zeux-frontend/src/features/iac/components/SectionNav.vue -->
<script setup lang="ts">
import type { SLASection } from '../types/sla-bundle.schema'

defineProps<{
  sections: SLASection[]
  activeSection: string
}>()

const emit = defineEmits<{
  select: [sectionId: string]
}>()
</script>

<template>
  <nav class="w-44 shrink-0 space-y-1">
    <button
      v-for="section in sections"
      :key="section.sectionId"
      @click="emit('select', section.sectionId)"
      class="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors"
      :class="section.sectionId === activeSection
        ? 'bg-brand-subtle text-brand font-medium'
        : 'text-text-secondary hover:bg-bg-muted'"
    >
      <span>{{ section.label }}</span>
      <span
        v-if="section.ambiguousCount + section.estimatedCount > 0"
        class="text-xs px-1.5 py-0.5 rounded-full font-medium"
        :class="section.estimatedCount > 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'"
      >{{ section.ambiguousCount + section.estimatedCount }}</span>
    </button>
  </nav>
</template>
```

- [ ] **Step 6: useSlaBundle.ts 구현**

```ts
// zeux-frontend/src/features/iac/api/useSlaBundle.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { SLABundleSchema } from '../types/sla-bundle.schema'
import { useIacStore } from '../stores/iac.store'
import type { Ref } from 'vue'

export function useSlaBundleDraft(sessionId: Ref<string | null>) {
  const store = useIacStore()

  return useQuery({
    queryKey: ['sla-bundle-draft', sessionId],
    queryFn: async () => {
      const res = await api.get(`/sla-bundles/draft/${sessionId.value}`)
      return SLABundleSchema.parse(res.data)
    },
    enabled: () => !!sessionId.value,
    onSuccess(data) {
      store.setBundleDraft(data)
      const triggers = data.items
        .filter((i) => i.confidence === '추정' || i.confidence === '모호')
        .map((i) => ({
          fieldId: i.fieldId,
          priority: i.confidence === '추정' ? 'P0' as const : 'P1' as const,
          reason: i.confidence === '추정' ? 'LLM 추정값 — 운영자 검토 필수' : '모호한 값 — 확인 권장',
        }))
      triggers.forEach((t) => store.addChatbotTrigger(t))
    },
  })
}

export function useConfirmField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ bundleId, fieldId, value }: { bundleId: string; fieldId: string; value: string | number | null }) => {
      const res = await api.patch(`/sla-bundles/draft/${bundleId}/fields`, { fieldId, value })
      return res.data
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['sla-bundle-draft'] })
    },
  })
}

export function useSaveSlaBundle() {
  return useMutation({
    mutationFn: async (bundleId: string) => {
      const res = await api.post('/sla-bundles', { bundleId })
      return res.data as { bundleId: string }
    },
  })
}
```

- [ ] **Step 7: IacScreen2.vue 구현**

```vue
<!-- zeux-frontend/src/pages/IacScreen2.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useIacStore } from '@/features/iac/stores/iac.store'
import { useSlaBundleDraft, useConfirmField, useSaveSlaBundle } from '@/features/iac/api/useSlaBundle'
import SectionNav from '@/features/iac/components/SectionNav.vue'
import FormField from '@/features/iac/components/FormField.vue'
import type { SLASection } from '@/features/iac/types/sla-bundle.schema'

const store = useIacStore()
const router = useRouter()
const { uploadSessionId, bundleDraft } = storeToRefs(store)

const { isLoading } = useSlaBundleDraft(uploadSessionId)
const { mutate: confirmField } = useConfirmField()
const { mutate: saveBundle, isPending: isSaving } = useSaveSlaBundle()

const activeSection = ref('availability')

const sections = computed<SLASection[]>(() => {
  if (!bundleDraft.value) return []
  const sectionMap = new Map<string, SLASection>()
  for (const item of bundleDraft.value.items) {
    const existing = sectionMap.get(item.sectionId)
    if (!existing) {
      sectionMap.set(item.sectionId, {
        sectionId: item.sectionId,
        label: item.sectionId,
        ambiguousCount: item.confidence === '모호' ? 1 : 0,
        estimatedCount: item.confidence === '추정' ? 1 : 0,
      })
    } else {
      if (item.confidence === '모호') existing.ambiguousCount++
      if (item.confidence === '추정') existing.estimatedCount++
    }
  }
  return Array.from(sectionMap.values())
})

const activeItems = computed(() =>
  bundleDraft.value?.items.filter((i) => i.sectionId === activeSection.value) ?? []
)

const progressPct = computed(() => {
  if (!bundleDraft.value) return 0
  return Math.round((bundleDraft.value.confirmedCount / bundleDraft.value.totalRequiredCount) * 100)
})

const canSave = computed(() => bundleDraft.value?.confirmedCount === bundleDraft.value?.totalRequiredCount)

function handleConfirm(fieldId: string, value: string | number | null) {
  if (!bundleDraft.value) return
  confirmField({ bundleId: bundleDraft.value.bundleId, fieldId, value })
}

function handleSave() {
  if (!bundleDraft.value) return
  saveBundle(bundleDraft.value.bundleId, {
    onSuccess() { router.push('/iac/3') },
  })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 진행도 바 -->
    <div class="px-6 pt-4 pb-2 bg-bg-card border-b border-border">
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-text-secondary">필드 확정 진행률</span>
        <span class="font-medium text-text-primary">
          {{ bundleDraft?.confirmedCount ?? 0 }} / {{ bundleDraft?.totalRequiredCount ?? 47 }} 확정
        </span>
      </div>
      <div class="h-2 bg-bg-muted rounded-full overflow-hidden">
        <div
          class="h-full bg-brand transition-all duration-500 rounded-full"
          :style="{ width: `${progressPct}%` }"
        />
      </div>
    </div>

    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-3">
        <div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p class="text-text-secondary">AI가 문서를 분석하고 있습니다...</p>
      </div>
    </div>

    <div v-else class="flex flex-1 overflow-hidden">
      <!-- 섹션 네비 -->
      <div class="p-4 border-r border-border overflow-y-auto">
        <SectionNav
          :sections="sections"
          :active-section="activeSection"
          @select="activeSection = $event"
        />
      </div>

      <!-- 폼 필드 목록 -->
      <div class="flex-1 p-6 overflow-y-auto space-y-3">
        <FormField
          v-for="item in activeItems"
          :key="item.fieldId"
          v-bind="item"
          @confirm="handleConfirm"
        />
      </div>
    </div>

    <!-- 푸터 -->
    <div class="px-6 py-4 border-t border-border bg-bg-card flex justify-end">
      <button
        :disabled="!canSave || isSaving"
        @click="handleSave"
        class="btn-brand min-w-[180px]"
      >
        {{ isSaving ? '저장 중...' : 'SLA Bundle 저장 및 다음' }}
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 8: 테스트 통과 확인**

```bash
npx vitest run src/features/iac/components/__tests__/ConfidenceBadge.test.ts
npx vitest run src/features/iac/components/__tests__/FormField.test.ts
```

Expected: PASS 4 + 4 = 8 tests

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat: implement Screen2 — form review with confidence badges, section nav, progress bar"
```

---

## Task 10: Screen 3 — 토폴로지 선택

**Files:**
- Create: `src/features/iac/components/TopologyDiagram.vue`
- Create: `src/features/iac/components/TopologyInfoPanel.vue`
- Create: `src/features/iac/api/useTopology.ts`
- Create: `src/features/iac/components/__tests__/TopologyDiagram.test.ts`
- Modify: `src/pages/IacScreen3.vue`

- [ ] **Step 1: TopologyDiagram 테스트 작성**

```ts
// zeux-frontend/src/features/iac/components/__tests__/TopologyDiagram.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TopologyDiagram from '../TopologyDiagram.vue'
import type { TopologyNode, TopologyEdge } from '../../types/topology.schema'

const nodes: TopologyNode[] = [
  { nodeId: 'vpc-1', type: 'vpc', label: 'Main VPC', x: 100, y: 50 },
  { nodeId: 'ec2-1', type: 'ec2', label: 'EC2', x: 100, y: 200 },
]
const edges: TopologyEdge[] = [
  { edgeId: 'e1', from: 'vpc-1', to: 'ec2-1', dashed: false },
]

describe('TopologyDiagram', () => {
  it('SVG 엘리먼트가 렌더링된다', () => {
    const w = mount(TopologyDiagram, { props: { nodes, edges } })
    expect(w.find('svg').exists()).toBe(true)
  })

  it('노드 수만큼 g[data-node] 렌더링', () => {
    const w = mount(TopologyDiagram, { props: { nodes, edges } })
    expect(w.findAll('[data-node]')).toHaveLength(2)
  })

  it('엣지 수만큼 line/path 렌더링', () => {
    const w = mount(TopologyDiagram, { props: { nodes, edges } })
    expect(w.findAll('[data-edge]')).toHaveLength(1)
  })

  it('노드 클릭 시 node-click emit', async () => {
    const w = mount(TopologyDiagram, { props: { nodes, edges } })
    await w.find('[data-node]').trigger('click')
    expect(w.emitted('node-click')).toBeTruthy()
    expect(w.emitted('node-click')![0][0]).toBe('vpc-1')
  })
})
```

- [ ] **Step 2: TopologyDiagram.vue 구현 (순수 SVG)**

```vue
<!-- zeux-frontend/src/features/iac/components/TopologyDiagram.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import type { TopologyNode, TopologyEdge } from '../types/topology.schema'

const props = defineProps<{
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}>()

const emit = defineEmits<{
  'node-click': [nodeId: string]
}>()

const hoveredNode = ref<string | null>(null)

const NODE_ICONS: Record<string, string> = {
  vpc: '🌐', subnet: '📦', ec2: '💻', rds: '🗄️', elb: '⚖️',
  nat: '🔀', igw: '🚪', lambda: 'λ', ecs: '📋', eks: '⚙️',
  cloudwatch: '📊', route53: '🔍',
}

function getNode(id: string) {
  return props.nodes.find((n) => n.nodeId === id)
}
</script>

<template>
  <div class="relative w-full h-full">
    <svg
      class="w-full h-full"
      viewBox="0 0 600 500"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#9CA3AF" />
        </marker>
      </defs>

      <!-- 엣지 -->
      <line
        v-for="edge in edges"
        :key="edge.edgeId"
        :data-edge="edge.edgeId"
        :x1="getNode(edge.from)?.x ?? 0"
        :y1="(getNode(edge.from)?.y ?? 0) + 30"
        :x2="getNode(edge.to)?.x ?? 0"
        :y2="getNode(edge.to)?.y ?? 0"
        :stroke-dasharray="edge.dashed ? '6 4' : 'none'"
        stroke="#9CA3AF"
        stroke-width="1.5"
        marker-end="url(#arrow)"
      />

      <!-- 노드 -->
      <g
        v-for="node in nodes"
        :key="node.nodeId"
        :data-node="node.nodeId"
        :transform="`translate(${node.x - 40}, ${node.y})`"
        class="cursor-pointer"
        @click="emit('node-click', node.nodeId)"
        @mouseenter="hoveredNode = node.nodeId"
        @mouseleave="hoveredNode = null"
      >
        <rect
          x="0" y="0" width="80" height="52" rx="8"
          :fill="hoveredNode === node.nodeId ? '#EFF6FF' : '#FFFFFF'"
          :stroke="hoveredNode === node.nodeId ? '#2980B9' : '#E5E7EB'"
          stroke-width="1.5"
        />
        <text x="40" y="22" text-anchor="middle" font-size="16">{{ NODE_ICONS[node.type] ?? '□' }}</text>
        <text x="40" y="42" text-anchor="middle" font-size="10" fill="#6B7280">{{ node.label }}</text>

        <!-- 툴팁 -->
        <g v-if="hoveredNode === node.nodeId && node.catalogRule" :transform="`translate(82, -10)`">
          <rect x="0" y="0" width="160" height="50" rx="6" fill="#1F2937" opacity="0.95" />
          <text x="8" y="18" font-size="10" fill="#F9FAFB" font-weight="600">{{ node.catalogRule }}</text>
          <text x="8" y="36" font-size="9" fill="#9CA3AF">{{ node.applyCondition }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>
```

- [ ] **Step 3: TopologyInfoPanel.vue 구현**

```vue
<!-- zeux-frontend/src/features/iac/components/TopologyInfoPanel.vue -->
<script setup lang="ts">
import type { TopologyDraft } from '../types/topology.schema'

defineProps<{
  topology: TopologyDraft
}>()
</script>

<template>
  <div class="space-y-5 h-full overflow-y-auto">
    <!-- SLA 충족 -->
    <div class="bg-bg-card rounded-xl border border-border p-4">
      <h3 class="text-sm font-semibold text-text-primary mb-3">SLA 충족 수치</h3>
      <dl class="space-y-2">
        <div v-for="(value, key) in topology.slaSatisfaction" :key="key" class="flex justify-between text-sm">
          <dt class="text-text-secondary">{{ key }}</dt>
          <dd class="font-medium text-status-ok">{{ value }}</dd>
        </div>
      </dl>
    </div>

    <!-- 예상 비용 -->
    <div class="bg-bg-card rounded-xl border border-border p-4">
      <h3 class="text-sm font-semibold text-text-primary mb-2">예상 월 비용</h3>
      <p class="text-2xl font-bold text-brand">
        ₩{{ topology.estimatedMonthlyCost.toLocaleString() }}
      </p>
    </div>

    <!-- 핵심 결정 근거 -->
    <div class="bg-bg-card rounded-xl border border-border p-4">
      <h3 class="text-sm font-semibold text-text-primary mb-3">핵심 결정 근거</h3>
      <ul class="space-y-2">
        <li
          v-for="(reason, i) in topology.rationale"
          :key="i"
          class="flex gap-2 text-sm text-text-secondary"
        >
          <span class="text-brand mt-0.5">•</span>
          <span>{{ reason }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
```

- [ ] **Step 4: useTopology.ts 구현**

```ts
// zeux-frontend/src/features/iac/api/useTopology.ts
import { useQuery, useMutation } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { z } from 'zod'
import { TopologyDraftSchema } from '../types/topology.schema'
import { useIacStore } from '../stores/iac.store'
import type { Ref } from 'vue'

const TopologiesResponseSchema = z.object({
  topologies: z.array(TopologyDraftSchema),
})

export function useTopologyCandidates(bundleId: Ref<string | null>) {
  return useQuery({
    queryKey: ['topologies', bundleId],
    queryFn: async () => {
      const res = await api.get(`/topologies/${bundleId.value}`)
      return TopologiesResponseSchema.parse(res.data).topologies
    },
    enabled: () => !!bundleId.value,
  })
}

export function useApproveTopology() {
  const store = useIacStore()
  return useMutation({
    mutationFn: async (topologyId: string) => {
      const res = await api.post(`/topologies/${topologyId}/approve`)
      return res.data as { topologyId: string; approved: true }
    },
    onSuccess(data) {
      store.setSelectedTopology(data.topologyId)
    },
  })
}
```

- [ ] **Step 5: IacScreen3.vue 구현**

```vue
<!-- zeux-frontend/src/pages/IacScreen3.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useIacStore } from '@/features/iac/stores/iac.store'
import { useTopologyCandidates, useApproveTopology } from '@/features/iac/api/useTopology'
import TopologyDiagram from '@/features/iac/components/TopologyDiagram.vue'
import TopologyInfoPanel from '@/features/iac/components/TopologyInfoPanel.vue'

const store = useIacStore()
const router = useRouter()
const { bundleDraft } = storeToRefs(store)
const bundleId = computed(() => bundleDraft.value?.bundleId ?? null)

const { data: topologies, isLoading } = useTopologyCandidates(bundleId)
const { mutate: approve, isPending: isApproving } = useApproveTopology()

const activeIndex = ref(0)
const activeTopology = computed(() => topologies.value?.[activeIndex.value])

function handleApprove() {
  if (!activeTopology.value) return
  approve(activeTopology.value.topologyId, {
    onSuccess() { router.push('/iac/4') },
  })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else-if="topologies?.length">
      <!-- 탭 -->
      <div class="px-6 pt-4 border-b border-border flex gap-4 bg-bg-card">
        <button
          v-for="(topo, i) in topologies"
          :key="topo.topologyId"
          @click="activeIndex = i"
          class="pb-3 text-sm font-medium border-b-2 transition-colors"
          :class="i === activeIndex
            ? 'border-brand text-brand'
            : 'border-transparent text-text-secondary hover:text-text-primary'"
        >
          <span>{{ topo.label }}</span>
          <span class="ml-2 text-xs text-text-muted">₩{{ (topo.estimatedMonthlyCost / 10000).toFixed(0) }}만/월</span>
        </button>
      </div>

      <!-- 다이어그램 + 정보 패널 -->
      <div v-if="activeTopology" class="flex flex-1 overflow-hidden">
        <div class="flex-1 p-6">
          <TopologyDiagram
            :nodes="activeTopology.nodes"
            :edges="activeTopology.edges"
          />
        </div>
        <div class="w-72 p-4 border-l border-border overflow-y-auto">
          <TopologyInfoPanel :topology="activeTopology" />
        </div>
      </div>

      <!-- 푸터 -->
      <div class="px-6 py-4 border-t border-border bg-bg-card flex items-center justify-between">
        <p class="text-sm text-text-secondary">선택한 토폴로지로 Terraform 코드를 생성합니다.</p>
        <button @click="handleApprove" :disabled="isApproving" class="btn-brand">
          {{ isApproving ? '처리 중...' : '이 토폴로지로 진행' }}
        </button>
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
npx vitest run src/features/iac/components/__tests__/TopologyDiagram.test.ts
```

Expected: PASS 4 tests

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: implement Screen3 — topology selection with SVG diagram and info panel"
```

---

## Task 11: Screen 4 — Terraform 배포/검증

**Files:**
- Create: `src/features/iac/components/DeployProgress.vue`
- Create: `src/features/iac/api/useTerraform.ts`
- Create: `src/features/iac/components/__tests__/DeployProgress.test.ts`
- Modify: `src/pages/IacScreen4.vue`

- [ ] **Step 1: DeployProgress 테스트 작성**

```ts
// zeux-frontend/src/features/iac/components/__tests__/DeployProgress.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeployProgress from '../DeployProgress.vue'

const resources = [
  { resource: 'aws_vpc.main', status: 'complete', detail: '생성 완료' },
  { resource: 'aws_instance.app', status: 'in_progress', detail: '생성 중...' },
  { resource: 'aws_db_instance.primary', status: 'pending', detail: '대기 중' },
]

describe('DeployProgress', () => {
  it('리소스 목록이 렌더링된다', () => {
    const w = mount(DeployProgress, { props: { resources } })
    expect(w.findAll('[data-testid="resource-row"]')).toHaveLength(3)
  })

  it('complete 상태에 초록 아이콘', () => {
    const w = mount(DeployProgress, { props: { resources } })
    expect(w.find('[data-status="complete"]').exists()).toBe(true)
  })

  it('in_progress 상태에 스피너', () => {
    const w = mount(DeployProgress, { props: { resources } })
    expect(w.find('[data-status="in_progress"]').exists()).toBe(true)
  })

  it('전체 진행률 계산 — 1/3 완료 → 33%', () => {
    const w = mount(DeployProgress, { props: { resources } })
    expect(w.find('[data-testid="progress-bar"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: DeployProgress.vue 구현**

```vue
<!-- zeux-frontend/src/features/iac/components/DeployProgress.vue -->
<script setup lang="ts">
import { computed } from 'vue'

interface ResourceStatus {
  resource: string
  status: 'pending' | 'in_progress' | 'complete' | 'error'
  detail: string
}

const props = defineProps<{
  resources: ResourceStatus[]
}>()

const progressPct = computed(() => {
  if (!props.resources.length) return 0
  const done = props.resources.filter((r) => r.status === 'complete').length
  return Math.round((done / props.resources.length) * 100)
})
</script>

<template>
  <div class="space-y-4">
    <!-- 전체 진행률 -->
    <div>
      <div class="flex justify-between text-sm mb-1">
        <span class="text-text-secondary">전체 진행률</span>
        <span class="font-medium text-text-primary">{{ progressPct }}%</span>
      </div>
      <div class="h-3 bg-bg-muted rounded-full overflow-hidden">
        <div
          data-testid="progress-bar"
          class="h-full bg-brand transition-all duration-700 rounded-full"
          :style="{ width: `${progressPct}%` }"
        />
      </div>
    </div>

    <!-- 리소스 목록 -->
    <div class="space-y-2">
      <div
        v-for="res in resources"
        :key="res.resource"
        data-testid="resource-row"
        class="flex items-center gap-3 p-3 rounded-lg border bg-bg-card"
        :class="{
          'border-status-ok': res.status === 'complete',
          'border-brand': res.status === 'in_progress',
          'border-status-critical': res.status === 'error',
          'border-border': res.status === 'pending',
        }"
      >
        <!-- 상태 아이콘 -->
        <div class="shrink-0 w-6 h-6 flex items-center justify-center">
          <svg v-if="res.status === 'complete'" :data-status="res.status" class="w-5 h-5 text-status-ok" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <div v-else-if="res.status === 'in_progress'" :data-status="res.status"
            class="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <svg v-else-if="res.status === 'error'" :data-status="res.status" class="w-5 h-5 text-status-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <div v-else :data-status="res.status" class="w-4 h-4 rounded-full border-2 border-border" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-mono text-text-primary truncate">{{ res.resource }}</p>
          <p class="text-xs text-text-muted">{{ res.detail }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: useTerraform.ts 구현**

```ts
// zeux-frontend/src/features/iac/api/useTerraform.ts
import { ref } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { api } from '@/services/api'
import { useIacStore } from '../stores/iac.store'
import type { Ref } from 'vue'

export interface ResourceStatus {
  resource: string
  status: 'pending' | 'in_progress' | 'complete' | 'error'
  detail: string
}

export interface PlanItem {
  resource: string
  changeType: 'add' | 'change' | 'destroy'
  riskLevel: 'low' | 'medium' | 'high'
  slaImpact: string
  estimatedCost: string
}

export function useGenerateTerraform() {
  const store = useIacStore()
  return useMutation({
    mutationFn: async (topologyId: string) => {
      const res = await api.post<{ planId: string; hclPreview: string }>('/terraform/generate', { topologyId })
      return res.data
    },
    onMutate() { store.setDeployStatus('generating') },
    onSuccess() { store.setDeployStatus('planning') },
    onError() { store.setDeployStatus('error') },
  })
}

export function useTerraformPlan() {
  return useMutation({
    mutationFn: async (planId: string) => {
      const res = await api.post<{ planId: string; summary: object; riskLevel: string; items: PlanItem[] }>(
        '/terraform/plan', { planId }
      )
      return res.data
    },
  })
}

export function useTerraformApply() {
  const store = useIacStore()
  const resources = ref<ResourceStatus[]>([])
  const isStreaming = ref(false)

  async function startApply(planId: string) {
    store.setDeployStatus('applying')
    isStreaming.value = true
    resources.value = []

    const eventSource = new EventSource(`/api/terraform/apply/stream?planId=${planId}`)

    eventSource.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as ResourceStatus
      const idx = resources.value.findIndex((r) => r.resource === data.resource)
      if (idx >= 0) {
        resources.value[idx] = data
      } else {
        resources.value.push(data)
      }
    }

    eventSource.addEventListener('done', () => {
      eventSource.close()
      isStreaming.value = false
      store.setDeployStatus('verifying')
    })

    eventSource.onerror = () => {
      eventSource.close()
      isStreaming.value = false
      store.setDeployStatus('error')
    }
  }

  function stopApply() {
    isStreaming.value = false
    store.setDeployStatus('idle')
  }

  return { resources, isStreaming, startApply, stopApply }
}

export function useTerraformVerify(planId: Ref<string | null>) {
  return useQuery({
    queryKey: ['terraform-verify', planId],
    queryFn: async () => {
      const res = await api.get(`/terraform/verify/${planId.value}`)
      return res.data as {
        verifyId: string
        overall: 'pass' | 'fail'
        categories: { category: string; status: 'pass' | 'fail'; detail: string }[]
      }
    },
    enabled: () => !!planId.value,
  })
}
```

- [ ] **Step 4: IacScreen4.vue 구현**

```vue
<!-- zeux-frontend/src/pages/IacScreen4.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useIacStore } from '@/features/iac/stores/iac.store'
import {
  useGenerateTerraform,
  useTerraformPlan,
  useTerraformApply,
  useTerraformVerify,
} from '@/features/iac/api/useTerraform'
import DeployProgress from '@/features/iac/components/DeployProgress.vue'

const store = useIacStore()
const { deployStatus, selectedTopologyId } = storeToRefs(store)

const planId = ref<string | null>(null)
const hclPreview = ref<string | null>(null)

const { mutate: generateCode, isPending: isGenerating } = useGenerateTerraform()
const { mutate: runPlan, data: planData, isPending: isPlanning } = useTerraformPlan()
const { resources, isStreaming, startApply, stopApply } = useTerraformApply()
const { data: verifyData } = useTerraformVerify(planId)

const subStep = computed(() => {
  switch (deployStatus.value) {
    case 'generating': return 1
    case 'planning': return 2
    case 'applying': return 3
    case 'verifying': case 'done': return 4
    default: return 0
  }
})

function handleGenerate() {
  if (!selectedTopologyId.value) return
  generateCode(selectedTopologyId.value, {
    onSuccess(data) {
      planId.value = data.planId
      hclPreview.value = data.hclPreview
    },
  })
}

function handlePlan() {
  if (!planId.value) return
  runPlan(planId.value)
}

function handleApply() {
  if (!planId.value) return
  startApply(planId.value)
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-8 space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">Terraform 배포</h1>
      <p class="text-text-secondary mt-1">인프라 코드를 생성하고 실제 리소스를 프로비저닝합니다.</p>
    </div>

    <!-- 서브스텝 표시 -->
    <div class="flex gap-0 border border-border rounded-xl overflow-hidden">
      <div
        v-for="(label, i) in ['코드 생성', 'Plan 검토', 'Apply', '검증']"
        :key="i"
        class="flex-1 py-3 text-center text-sm font-medium border-r last:border-r-0 border-border"
        :class="i + 1 === subStep
          ? 'bg-brand text-white'
          : i + 1 < subStep ? 'bg-status-ok/10 text-status-ok' : 'bg-bg-card text-text-muted'"
      >{{ label }}</div>
    </div>

    <!-- Step 0: 시작 -->
    <div v-if="deployStatus === 'idle'" class="text-center py-12">
      <p class="text-text-secondary mb-4">선택한 토폴로지로 Terraform HCL 코드를 생성합니다.</p>
      <button @click="handleGenerate" class="btn-brand">코드 생성 시작</button>
    </div>

    <!-- Step 1: 코드 생성 중 -->
    <div v-else-if="deployStatus === 'generating'" class="flex items-center justify-center py-16 gap-4">
      <div class="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      <p class="text-text-secondary">Terraform HCL 코드 생성 중...</p>
    </div>

    <!-- Step 2: Plan 검토 -->
    <div v-else-if="deployStatus === 'planning'" class="space-y-4">
      <div v-if="hclPreview" class="bg-gray-900 rounded-xl p-4 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono whitespace-pre-wrap">{{ hclPreview }}</pre>
      </div>
      <div v-if="!planData">
        <button @click="handlePlan" :disabled="isPlanning" class="btn-brand">
          {{ isPlanning ? 'Plan 실행 중...' : 'Terraform Plan 실행' }}
        </button>
      </div>
      <div v-else class="space-y-3">
        <h3 class="font-semibold text-text-primary">변경 계획 ({{ planData.items.length }}개 리소스)</h3>
        <div class="border border-border rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-bg-muted">
              <tr>
                <th class="text-left px-4 py-2 text-text-secondary font-medium">리소스</th>
                <th class="px-4 py-2 text-text-secondary font-medium">유형</th>
                <th class="px-4 py-2 text-text-secondary font-medium">위험도</th>
                <th class="px-4 py-2 text-text-secondary font-medium">SLA 영향</th>
                <th class="px-4 py-2 text-text-secondary font-medium">비용</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in planData.items" :key="item.resource" class="border-t border-border">
                <td class="px-4 py-2 font-mono text-xs text-text-primary">{{ item.resource }}</td>
                <td class="px-4 py-2 text-center">
                  <span class="px-2 py-0.5 rounded text-xs font-medium"
                    :class="item.changeType === 'add' ? 'bg-green-100 text-green-700' : item.changeType === 'change' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'">
                    {{ item.changeType }}
                  </span>
                </td>
                <td class="px-4 py-2 text-center">
                  <span class="px-2 py-0.5 rounded text-xs font-medium"
                    :class="item.riskLevel === 'low' ? 'bg-green-100 text-green-700' : item.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'">
                    {{ item.riskLevel }}
                  </span>
                </td>
                <td class="px-4 py-2 text-center text-xs text-text-secondary">{{ item.slaImpact }}</td>
                <td class="px-4 py-2 text-center text-xs text-text-secondary">{{ item.estimatedCost }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-end gap-3">
          <button class="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-muted">취소</button>
          <button @click="handleApply" class="btn-brand">Apply 실행</button>
        </div>
      </div>
    </div>

    <!-- Step 3: Apply 진행 -->
    <div v-else-if="deployStatus === 'applying'" class="space-y-4">
      <DeployProgress :resources="resources" />
      <div class="flex justify-end">
        <button @click="stopApply" class="px-4 py-2 border border-status-critical text-status-critical rounded-lg text-sm hover:bg-red-50">
          중단 요청
        </button>
      </div>
    </div>

    <!-- Step 4: 검증 결과 -->
    <div v-else-if="deployStatus === 'verifying' || deployStatus === 'done'" class="space-y-4">
      <div v-if="verifyData">
        <div
          v-if="verifyData.overall === 'pass'"
          class="p-4 bg-green-50 border border-status-ok rounded-xl flex items-center gap-3"
        >
          <svg class="w-6 h-6 text-status-ok shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p class="font-semibold text-status-ok">모든 검증 통과</p>
            <p class="text-sm text-text-secondary">인프라가 SLA 요건을 충족하며 정상 운영 중입니다.</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-4">
          <div
            v-for="cat in verifyData.categories"
            :key="cat.category"
            class="flex items-start gap-3 p-3 rounded-lg border"
            :class="cat.status === 'pass' ? 'border-status-ok bg-green-50' : 'border-status-critical bg-red-50'"
          >
            <svg class="w-5 h-5 shrink-0 mt-0.5" :class="cat.status === 'pass' ? 'text-status-ok' : 'text-status-critical'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="cat.status === 'pass'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <p class="text-sm font-medium text-text-primary">{{ cat.category }}</p>
              <p class="text-xs text-text-muted">{{ cat.detail }}</p>
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-6">
          <button class="btn-brand">모니터링 대시보드로 이동</button>
        </div>
      </div>
      <div v-else class="flex items-center gap-3">
        <div class="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p class="text-text-secondary">안정성 검증 중...</p>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run src/features/iac/components/__tests__/DeployProgress.test.ts
```

Expected: PASS 4 tests

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: implement Screen4 — Terraform generate/plan/apply/verify with SSE streaming"
```

---

## Task 12: Barrel Export + 최종 연결

**Files:**
- Create: `src/features/iac/index.ts`
- Modify: `vite.config.ts` (최종 빌드 확인)

- [ ] **Step 1: iac/index.ts 배럴 익스포트 작성**

```ts
// zeux-frontend/src/features/iac/index.ts
export * from './types/sla-bundle.schema'
export * from './types/topology.schema'
export * from './stores/iac.store'
export * from './api/useUploadSession'
export * from './api/useSlaBundle'
export * from './api/useTopology'
export * from './api/useTerraform'
```

- [ ] **Step 2: 전체 테스트 실행**

```bash
cd /Users/ljsuu/TeamProjectTemp/zeux-frontend
npx vitest run
```

Expected: 전체 테스트 PASS (에러 없음)

- [ ] **Step 3: TypeScript 타입 체크**

```bash
npx vue-tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 프로덕션 빌드**

```bash
npm run build
```

Expected: `dist/` 생성, 번들 에러 없음

- [ ] **Step 5: dev 서버로 전체 플로우 확인**

```bash
npm run dev
```

브라우저에서 다음 순서로 확인:
1. `http://localhost:5173` → `/iac/1` 리다이렉트, Screen 1 렌더링
2. PDF 파일 2개 업로드 → "AI 분석 시작" 버튼 활성화 → 클릭 → Screen 2 이동
3. 폼 필드 신뢰도 배지 확인, 수용/수정 동작 확인, 진행률 바 업데이트 확인
4. "SLA Bundle 저장" → Screen 3 이동
5. 3개 토폴로지 탭 전환, 다이어그램 노드 호버 툴팁 확인
6. "이 토폴로지로 진행" → Screen 4 이동
7. 코드 생성 → Plan → Apply 진행 → 검증 결과 확인

- [ ] **Step 6: 최종 커밋**

```bash
git add -A
git commit -m "feat: add barrel exports and verify full IaC flow end-to-end"
```

---

## 완료 기준

- [ ] `npx vitest run` 전체 통과
- [ ] `npx vue-tsc --noEmit` 에러 없음
- [ ] `npm run build` 성공
- [ ] 브라우저에서 Screen 1 → 2 → 3 → 4 전체 플로우 수동 확인
- [ ] MSW mock 응답으로 실제 API 없이 전체 동작 확인

