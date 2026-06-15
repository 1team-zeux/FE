# ZeuX Frontend

## Key Documentation
- `docs/시나리오.md` — 서비스 시연 시나리오 (SLA Bundle → 토폴로지 → Terraform → 모니터링 → 장애 대응 → 최적화)
- `docs/FE_CONVENTIONS.md` — 프론트엔드 코드 컨벤션
- `docs/superpowers/specs/2026-06-15-architecture-layout-standard.md` — 표준 인프라 가시화 레이아웃 정책

## Topology Generation Conventions
- **Layer Mapping:** Always assign `layer_id` to nodes: `G_ENTRY`, `G_MGMT`, `G_EXT_API`, `G_STORAGE`, `V1_CONNECT`, `V2_PUBLIC`, `V3_APP`, `V4_DATA`.
- **AZ Mapping:** Always assign `az` property: `ap-northeast-2a` (top) or `ap-northeast-2b` (bottom).
- **Layout Logic:** Follow the 4-column standard defined in the layout spec.

## Coding Standards
- Vue 3 with `<script setup>` and TypeScript.
- Tailwind CSS for styling.
- Component-based architecture in `src/features/`.
- Use `useQuery` and `useMutation` for API calls.

## Testing
- Unit tests with Vitest: `npm run test`.
