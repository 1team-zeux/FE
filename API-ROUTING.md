# API Routing Reference

## TL;DR — ECONNREFUSED 발생 시

| 에러 경로 | 원인 서비스 | 포트 | 해결 |
|---|---|---|---|
| `/api/v1/*` | sla-agent-service | 8090 | `docker compose up -d` |
| `/auth/*` | auth-server | 8081 | `docker compose up -d` |
| `/monitoring/*` | monitoring-api | 8091 | `docker compose -f monitoring-service/docker-compose.yml up -d` |
| `/terraform/*` 등 | api-gateway | 8080 | `docker compose up -d` |

---

## 서비스 기동 순서

```bash
# 1. 모니터링 스택 — zeux-net 네트워크 + monitoring-api 포함
docker compose -f monitoring-service/docker-compose.yml up -d

# 2. DB
docker compose -f docker-compose.db.yaml up -d

# 3. 앱 스택 (eureka → auth → gateway → sla-agent)
docker compose up -d
```

---

## Vite Dev Proxy → 서비스 매핑

| FE 경로 prefix | 로컬 포트 | 서비스 |
|---|---|---|
| `/auth` | 8081 | auth-server |
| `/api/v1` | 8090 | sla-agent-service (FastAPI) |
| `/tenants` | 8090 | sla-agent-service (FastAPI) |
| `/monitoring` | 8091 | monitoring-api (FastAPI, prefix strip) |
| `/terraform` | 8080 | api-gateway → iac-service |
| `/sla-bundles` | 8080 | api-gateway → sla-agent (IaC) |
| `/topologies` | 8080 | api-gateway → sla-agent (IaC) |
| `/upload-sessions` | 8080 | api-gateway → sla-agent (IaC) |

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

### api-gateway (`:8080`) — IaC 관련만
```
GET  /terraform/**
POST /terraform/**
GET  /sla-bundles/**
POST /topologies/**
POST /upload-sessions/**
```

---

## 전체 서비스 포트 맵

| Container | Host Port | 역할 |
|---|---|---|
| eureka-server | 8761 | Spring 서비스 레지스트리 |
| auth-server | 8081 | JWT 인증 |
| api-gateway | 8080 | Spring Cloud Gateway |
| sla-agent-service | 8090 | 온보딩/대시보드 FastAPI |
| monitoring-api | 8091 | Prometheus/Tempo/Loki 쿼리 FastAPI |
| prometheus | 9090 | 메트릭 저장 |
| grafana | 3001 | 대시보드 UI |
| loki | 3100 | 로그 저장 |
| tempo | 3200 | 트레이스 저장 |
| mariadb | 3306 | auth/aiops DB |
| zeux-db (MySQL) | 3307 | sla-agent DB |

---

## Production (Docker) — FE nginx 라우팅

FE 컨테이너 nginx가 직접 백엔드로 프록시 (api-gateway 미경유):

```
/auth/        → auth-server:8081/auth/
/api/v1/      → sla-agent-service:8090/api/v1/
/tenants      → sla-agent-service:8090/tenants
/monitoring/  → monitoring-api:8091/         (prefix strip)
/terraform/   → api-gateway:8080/terraform/
/sla-bundles/ → api-gateway:8080/sla-bundles/
/topologies/  → api-gateway:8080/topologies/
/upload-sessions/ → api-gateway:8080/upload-sessions/
```
