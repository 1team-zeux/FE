# API Routing Reference

## TL;DR — ECONNREFUSED 발생 시

| 에러 경로 | 원인 서비스 | 포트 | 해결 |
|---|---|---|---|
| `/api/v1/*` | sla-agent-service | 8090 | `docker compose -f server/docker-compose.local.yml up -d --build` |
| `/auth/*` | auth-server | 8081 | `docker compose -f server/docker-compose.local.yml up -d --build` |
| `/monitoring/*` | monitoring-api | 8091 | `docker compose -f server/docker-compose.local.yml up -d --build` |
| `/terraform/*`, `/topologies/*` | sla-agent-service legacy compatibility | 8090 | `docker compose -f server/docker-compose.local.yml up -d --build` |
| `/upload-sessions`, `/sla-bundles*` | sla-agent-service | 8090 | `docker compose -f server/docker-compose.local.yml up -d --build` |

---

## 서비스 기동 순서

```bash
# app + db만 기동하고 기존 monitoring-service 스택 재사용
docker compose -f server/docker-compose.local.yml up -d --build

# observability까지 이 파일로 같이 올릴 때만
docker compose -f server/docker-compose.local.yml --profile observability up -d --build

# FE dev server
cd FE
npm run dev
```

---

## Vite Dev Proxy → 서비스 매핑

| FE 경로 prefix | 로컬 포트 | 서비스 |
|---|---|---|
| `/auth` | 8081 | auth-server |
| `/api/v1` | 8090 | sla-agent-service (FastAPI) |
| `/tenants` | 8090 | sla-agent-service (FastAPI) |
| `/monitoring` | 8091 | monitoring-api (FastAPI, prefix strip) |
| `/terraform` | 8090 | sla-agent-service local compatibility |
| `/api/terraform` | 8090 | sla-agent-service local compatibility |
| `/sla-bundles` | 8090 | sla-agent-service |
| `/topologies` | 8090 | sla-agent-service local compatibility |
| `/api/topologies` | 8090 | sla-agent-service local compatibility |
| `/upload-sessions` | 8090 | sla-agent-service |

> `/monitoring/api/v1/...` → Vite strips `/monitoring` → monitoring-api receives `/api/v1/...`

---

## FE API 호출 → 담당 서비스

### sla-agent-service (`:8090`)
```
GET  /api/v1/global/dashboard
GET  /api/v1/tenants/{id}/services
GET  /api/v1/tenants/{id}/contract
POST /api/v1/onboard
GET  /api/v1/customers
GET  /api/v1/customers/{code}/setup
GET  /tenants
POST /upload-sessions
GET  /sla-bundles/draft/{session_id}
PATCH /sla-bundles/draft/{bundle_id}/fields
POST /sla-bundles
```

### auth-server (`:8081`)
```
POST /auth/login
POST /auth/register
POST /auth/admin/register
```

### monitoring-api (`:8091`) — 경로는 `/monitoring` prefix 제거 후 전달
```
GET /monitoring/api/v1/services/{name}/sli-metrics?tenant_id=&range=
GET /monitoring/api/v1/services/{name}/system-metrics?tenant_id=&range=
GET /monitoring/api/v1/services/{name}/traces?tenant_id=
GET /monitoring/api/v1/services/{name}/logs?tenant_id=
GET /monitoring/api/v1/events
```

### sla-agent-service (`:8090`) — Terraform / Topology local compatibility
```
GET  /topologies/{bundle_id}
POST /topologies/{topology_id}/approve
POST /terraform/generate
POST /terraform/plan
GET  /api/terraform/apply/stream
GET  /terraform/verify/{plan_id}
```

---

## 전체 서비스 포트 맵

| Container | Host Port | 역할 |
|---|---|---|
| auth-server | 8081 | JWT 인증 |
| sla-agent-service | 8090 | 온보딩/대시보드/FE legacy compatibility |
| monitoring-api | 8091 | Prometheus/Tempo/Loki 쿼리 FastAPI |
| prometheus | 9090 | 메트릭 저장 |
| grafana | 3001 | 대시보드 UI |
| loki | 3100 | 로그 저장 |
| tempo | 3200 | 트레이스 저장 |
| mariadb | 3306 | auth/aiops DB |
| zeux-db (MySQL) | 3306 | sla-agent DB |

---

## Docker FE nginx 라우팅

FE 컨테이너 nginx가 직접 백엔드로 프록시:

```
/auth/        → auth-server:8081/auth/
/api/v1/      → sla-agent-service:8090/api/v1/
/tenants      → sla-agent-service:8090/tenants
/monitoring/  → monitoring-api:8091/         (prefix strip)
/terraform/   → sla-agent-service:8090/terraform/
/api/terraform/ → sla-agent-service:8090/api/terraform/
/sla-bundles  → sla-agent-service:8090/sla-bundles
/topologies/  → sla-agent-service:8090/topologies/
/api/topologies/ → sla-agent-service:8090/api/topologies/
/upload-sessions → sla-agent-service:8090/upload-sessions
```
