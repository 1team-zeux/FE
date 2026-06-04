# ZeuX FE — IaC 플로우 구현 설계

**날짜**: 2026-06-01  
**범위**: IaC 온보딩 플로우 화면 1~4 (FR-iac-001~011)  
**타입**: FE 전용 (백엔드 없음, MSW mock)  
**기준 문서**: ZeuX_프로젝트_기획서_v5.md, 요구사항_명세서_V04.md, FE_CONVENTIONS.md

---

## 1. 결정 사항 요약

| 항목 | 결정 |
|---|---|
| 테마 | 라이트 (흰색/연회색 배경 + 블루 그라디언트 액센트) |
| 브랜드 컬러 | `#6DD5FA → #2980B9` (blue.html 기준) |
| 아키텍처 | FE_CONVENTIONS.md 완전 준수 — feature-based, TanStack Query, Pinia, Zod |
| 구현 범위 | IaC 화면 1~4 + 공통 레이아웃 (모니터링/대시보드는 다음 이터레이션) |
| 챗봇 레이아웃 | 플로팅 모달 (기본). 추후 항상 열린 좌측 패널로 전환 가능하도록 설계 |
| 프로젝트 위치 | `/zeux-frontend/` (새 디렉토리, wireframeVue와 분리) |
| Mock 전략 | MSW (Mock Service Worker) |

---

## 2. 색상 시스템

CSS 커스텀 프로퍼티를 단일 진실 공급원으로 사용. 색상 변경은 `src/assets/styles.css` 한 곳만 수정.

```css
/* src/assets/styles.css */
:root {
  /* 브랜드 */
  --color-brand:        #2980B9;
  --color-brand-light:  #6DD5FA;
  --color-brand-subtle: #EFF6FF;

  /* 서피스 */
  --color-bg-page:  #F8F9FA;
  --color-bg-card:  #FFFFFF;
  --color-bg-muted: #F3F4F6;
  --color-border:   #E5E7EB;

  /* 텍스트 */
  --color-text-primary:   #111111;
  --color-text-secondary: #6B7280;
  --color-text-muted:     #9CA3AF;

  /* 상태 */
  --color-status-critical: #ED213A;
  --color-status-warning:  #F37335;
  --color-status-ok:       #56ab2f;
  --color-status-pending:  #F59E0B;
}
```

Tailwind config는 `var(--color-*)` 참조만 함:

```ts
// tailwind.config.ts
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
}
```

신뢰도 배지 색상 (FR-iac-002 기준):
- **확실**: `bg-green-100 text-green-800` (문서에서 명확히 추출)
- **모호**: `bg-yellow-100 text-yellow-800` (운영자 우선 검토 대상)
- **추정**: `bg-red-100 text-red-800` (LLM 추천값, 강제 검토)

---

## 3. 프로젝트 구조

```
zeux-frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── assets/
    │   └── styles.css              # CSS 변수 중앙 정의
    ├── components/                 # 공용 UI
    │   ├── AppLayout.vue           # 헤더 + 라우터뷰 래퍼
    │   ├── AppStepper.vue          # IaC 4단계 진행 표시
    │   └── ChatbotModal.vue        # 플로팅 챗봇 (모든 IaC 화면 공용)
    ├── composables/
    │   └── useChatbot.ts           # 열기/닫기/알림 배지 제어
    ├── features/
    │   └── iac/
    │       ├── api/
    │       │   ├── useUploadSession.ts   # 문서 업로드 mutation
    │       │   ├── useSlaBundle.ts       # 폼 draft 조회·저장
    │       │   ├── useTopology.ts        # 토폴로지 3개 후보 조회
    │       │   └── useTerraform.ts       # plan/apply/verify (SSE 스트림 포함)
    │       ├── components/
    │       │   ├── UploadZone.vue        # 드래그앤드롭 업로드 존
    │       │   ├── FormField.vue         # 신뢰도 배지 + 수용/수정 액션
    │       │   ├── ConfidenceBadge.vue   # 확실/모호/추정 배지
    │       │   ├── SectionNav.vue        # 좌측 섹션 네비게이터 (모호/추정 배지)
    │       │   ├── TopologyDiagram.vue   # SVG 다이어그램 + 노드 호버 툴팁
    │       │   ├── TopologyInfoPanel.vue # 우측 SLA충족/비용/근거 패널
    │       │   └── DeployProgress.vue    # 리소스별 실시간 상태 목록
    │       ├── stores/
    │       │   └── iac.store.ts          # Pinia (uploadSessionId, bundleDraft, selectedTopologyId, deployStatus, chatbotTriggers)
    │       ├── types/
    │       │   ├── sla-bundle.schema.ts  # Zod 스키마 (SLABundle, SLAItem, ConfidenceLevel...)
    │       │   └── topology.schema.ts    # Zod 스키마 (TopologyDraft, TopologyNode...)
    │       └── index.ts                  # Barrel export
    ├── services/
    │   ├── api.ts                  # Axios 인스턴스 (baseURL, interceptors)
    │   └── mocks/
    │       ├── browser.ts          # MSW browser worker 설정
    │       └── handlers.ts         # 화면별 mock 응답 핸들러
    ├── pages/
    │   ├── IacScreen1.vue          # 문서 업로드
    │   ├── IacScreen2.vue          # 통합 폼 검토
    │   ├── IacScreen3.vue          # 토폴로지 선택
    │   └── IacScreen4.vue          # Terraform 배포/검증
    └── router/
        └── index.ts
```

---

## 4. 패키지

```json
{
  "dependencies": {
    "vue": "^3.4",
    "vue-router": "^4.3",
    "@tanstack/vue-query": "^5",
    "pinia": "^2",
    "zod": "^3",
    "axios": "^1"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5",
    "vite": "^5",
    "typescript": "^5",
    "vue-tsc": "^2",
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "postcss": "^8",
    "msw": "^2"
  }
}
```

---

## 5. 상태 흐름

```
IacScreen1
  └─ useUploadSession.mutate(files)
       → iac.store.uploadSessionId 저장
       → router.push('/iac/2')

IacScreen2
  ├─ useSlaBundle.query(uploadSessionId)  ← LLM 파싱 결과 폴링
  ├─ iac.store.bundleDraft 실시간 업데이트
  └─ ChatbotModal ← iac.store.chatbotTriggers 감시 (모호/추정 필드 감지 시 배지)

IacScreen3
  ├─ useTopology.query(bundleId)          ← 3개 토폴로지 조회
  └─ iac.store.selectedTopologyId 저장

IacScreen4
  ├─ useTerraform.generate(topologyId)    ← HCL 코드 생성
  ├─ useTerraform.plan()                  ← plan 실행·결과 조회
  ├─ useTerraform.apply()                 ← SSE 스트림으로 리소스 상태 수신
  └─ useTerraform.verify()                ← 8개 카테고리 검증 결과 조회
```

---

## 6. 화면별 설계

### Screen 1 — 문서 업로드 (FR-iac-001)

**레이아웃**: 헤더 + 스테퍼 + 2열 업로드 존 + 하단 푸터

**주요 동작**:
- 좌: SLA 계약서 PDF / 우: 인프라 추가 정보 문서
- 드래그앤드롭 + 파일 선택 버튼
- 업로드 즉시 검증 (PDF 타입, 텍스트 여부, 50MB 한도) → 통과/실패 배지
- 두 파일 모두 통과 시에만 "AI 분석 시작" 버튼 활성화
- 플로팅 챗봇 아이콘 상시 노출 (초기 닫힘)

**컴포넌트**: `UploadZone.vue` × 2, `AppStepper.vue`, `ChatbotModal.vue`

---

### Screen 2 — 통합 폼 검토 (FR-iac-002/003/004/005)

**레이아웃**: 헤더 + 스테퍼 + 진행도 바 + 2열 (좌: 섹션 네비 180px / 우: 폼 필드)

**주요 동작**:
- 화면 진입 시 LLM 파싱 자동 트리거 (로딩 인디케이터)
- 좌측 섹션 네비에 모호/추정 건수 배지 표시
- 필드별 신뢰도 스타일: 확실(기본) / 모호(노랑 테두리) / 추정(빨강 테두리) / 확정(초록 fade)
- 액션: 수용(체크) / 수정(입력 활성화 → 확정) / 직접 입력
- 필드 확정마다 진행도 바 업데이트 (X / 47 확정)
- 모든 필수 필드 확정 시 "SLA Bundle 저장" 버튼 활성화
- 챗봇: 모호/추정 필드 감지 시 알림 배지 → 클릭 시 슬라이딩 패널 확장, 자연어 Q&A로 폼 자동 반영

**컴포넌트**: `SectionNav.vue`, `FormField.vue`, `ConfidenceBadge.vue`, `ChatbotModal.vue`

---

### Screen 3 — 토폴로지 선택 (FR-iac-006/007)

**레이아웃**: 헤더 + 스테퍼 + 3탭 + 2분할 (좌: 다이어그램 70% / 우: 정보 패널 30%)

**주요 동작**:
- 3탭 전환 (main / 보조1 / 보조2) → 다이어그램 + 우측 패널 전체 교체 (0.3s fade)
- 탭 레이블에 한 줄 요약 + 예상 비용
- 좌측 다이어그램: VPC/서브넷/서비스 SVG, 모니터링 송출 점선 화살표
- 노드 호버 → 툴팁 (카탈로그 규칙 + 적용 조건)
- 우측 패널: SLA 충족 수치 / 예상 월 비용 / 핵심 결정 근거 3섹션
- 챗봇: 결정 근거 질의 + 부분 수정 요청 (SLA 침해 시 거절 + 사유)
- "이 토폴로지로 진행" → approved 저장 후 Screen 4 이동

**컴포넌트**: `TopologyDiagram.vue`, `TopologyInfoPanel.vue`, `ChatbotModal.vue`

---

### Screen 4 — Terraform 배포/검증 (FR-iac-008~011)

**레이아웃**: 헤더 + 스테퍼 + 서브스텝 표시 + 컨텐츠 (서브스텝별 변환)

**서브스텝 4단계**:

1. **코드 생성** (FR-iac-008): HCL 코드 자동 생성 중 로딩 → 완료 시 코드 미리보기
2. **Plan 검토** (FR-iac-009): 4차원 분류 표 (변경 유형/위험도/SLA 영향/비용) → 위험도 높음 시 3가지 선택지
3. **Apply 진행** (FR-iac-010): 전체 진행률 바 + 리소스별 실시간 상태 (SSE 스트림) → 중단 요청 버튼
4. **안정성 검증** (FR-iac-011): 8개 카테고리 결과 그리드 → 전체 통과 시 완료 배너 + 모니터링 화면 이동 버튼

**컴포넌트**: `DeployProgress.vue`, `ChatbotModal.vue`

---

## 7. ChatbotModal 설계 (공통)

**기본 상태**: 좌측 하단 고정 원형 버튼 (40px). 알림 배지(빨강 숫자)로 명확화 필요 신호.

**확장 상태**: 클릭 시 슬라이딩 패널 (너비 ~280px, 화면 좌하단). 폼/다이어그램 위에 오버레이.

**Pinia 연결**:
- `iac.store.chatbotTriggers`: 명확화 필요 필드 목록 (P0/P1/P2 우선순위)
- `iac.store.chatbotOpen`: 패널 열림/닫힘 상태

**전환 유연성**: `AppLayout.vue`의 prop으로 `chatbotMode: 'floating' | 'panel'` 지원. `'panel'` 선택 시 항상 열린 좌측 패널 레이아웃으로 전환 가능.

---

## 8. MSW Mock 시나리오

| 엔드포인트 | 메서드 | Mock 응답 |
|---|---|---|
| `POST /api/upload-sessions` | mutation | uploadSessionId 반환 |
| `GET /api/sla-bundles/draft/:sessionId` | query | 신뢰도 믹스된 47개 필드 초기값 |
| `PATCH /api/sla-bundles/draft/:id/fields` | mutation | 필드 확정 결과 |
| `POST /api/sla-bundles` | mutation | bundleId 반환 |
| `GET /api/topologies/:bundleId` | query | 3개 토폴로지 JSON |
| `POST /api/topologies/:id/approve` | mutation | topologyId 반환 |
| `POST /api/terraform/generate` | mutation | HCL 코드 미리보기 |
| `POST /api/terraform/plan` | mutation | plan_summary JSON |
| `GET /api/terraform/apply/stream` | SSE | 리소스별 상태 이벤트 스트림 |
| `GET /api/terraform/verify/:id` | query | 8개 카테고리 결과 |

---

## 9. 미결 사항 (구현 중 결정)

- TopologyDiagram SVG 렌더링 라이브러리 선택 (순수 SVG 직접 작성 vs @vue-flow/core 도입)
- Apply SSE 스트림 mock 방식 (MSW ReadableStream 지원 여부 확인 필요)
- FormField 섹션 수가 많아 가상 스크롤 필요 여부
