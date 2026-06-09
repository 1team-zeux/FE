export const portfolioMockData = [
  { id: 'skt-digital', customer: 'SK telecom', bu: 'Digital Service BU', platform: 'T-Care Connect Platform', status: 'critical', serviceCount: 3, riskCount: 1, lowestBudget: 30, burn: 'Fast', drillable: true, note: 'Subscription Service Availability SLA Violation', riskScore: 82, tier: 'Enterprise', activeEvents: 3 },
  { id: 'hynix-mi', customer: 'SK hynix', bu: 'Manufacturing Intelligence BU', platform: 'Fab Sensing Platform', status: 'warning', serviceCount: 4, riskCount: 1, lowestBudget: 55, burn: 'Slow', drillable: false, note: 'Sensor Ingest Service Latency Warning', riskScore: 54, tier: 'Enterprise', activeEvents: 1 },
  { id: 'bb-media', customer: 'SK broadband', bu: 'Media Delivery BU', platform: 'B tv Streaming Platform', status: 'warning', serviceCount: 3, riskCount: 0, lowestBudget: 64, burn: 'Slow', drillable: false, note: 'VOD Catalog Service Latency Warning', riskScore: 41, tier: 'Business', activeEvents: 1 },
  { id: 'energy-retail', customer: 'SK energy', bu: 'Retail Platform BU', platform: 'EnClean Membership Platform', status: 'healthy', serviceCount: 2, riskCount: 0, lowestBudget: 82, burn: null, drillable: false, note: 'All services meet SLA', riskScore: 18, tier: 'Business', activeEvents: 0 },
  { id: 'sk-planet', customer: 'SK Planet', bu: 'Commerce Platform BU', platform: 'OK Cashbag Platform', status: 'healthy', serviceCount: 5, riskCount: 0, lowestBudget: 91, burn: null, drillable: false, note: 'All services meet SLA', riskScore: 12, tier: 'Starter', activeEvents: 0 },
];

export const servicesMockData = {
  'skt-digital': [
    {
      id: 'subscription', name: 'Subscription Service', tier: 'Tier 1', status: 'critical', burn: 'Fast', budgetConsumed: 70, budgetRemaining: 30, alertStage: 2, drillable: true, availability: 99.91, latencyP95: 470, apiEndpoints: 3,
      slas: [
        { name: 'Availability', cur: '99.91%', tgt: '99.95%', state: 'violation', label: 'Violation' },
        { name: 'Latency p95', cur: '470ms', tgt: '500ms', state: 'warning', label: 'Warning' },
        { name: 'RPO', cur: '3min', tgt: '5min', state: 'met', label: 'Met' },
      ],
      endpoints: [
        { method: 'POST', path: '/subscriptions', state: 'highlight', sla: { name: 'Availability', cur: '99.97%', tgt: '99.99%', state: 'violation', label: 'L3 Violation' } },
        { method: 'GET', path: '/subscriptions', state: 'muted' },
        { method: 'GET', path: '/plans', state: 'muted' },
      ],
    },
    {
      id: 'portal', name: 'Customer Portal Web Service', tier: 'Tier 1', status: 'warning', burn: 'Slow', budgetConsumed: 50, budgetRemaining: 50, alertStage: 1, drillable: false, availability: 99.93, latencyP95: 760, apiEndpoints: 0,
      slas: [
        { name: 'Availability', cur: '99.93%', tgt: '99.90%', state: 'met', label: 'Met' },
        { name: 'Latency p95', cur: '760ms', tgt: '800ms', state: 'warning', label: 'Warning' },
        { name: 'RTO', cur: '18min', tgt: '30min', state: 'met', label: 'Met' },
      ],
      endpoints: [],
      endpointNote: 'No endpoint SLA - measured at service level',
    },
  ],
};

export const serviceDetailMockData = {
  subscription: {
    serviceId: 'subscription', serviceName: 'Subscription Service', window: 'Today 06:00 – 12:00 · 30m',
    times: ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
    slis: [
      { id: 'avail', name: 'Availability SLI', unit: '%', series: [99.99, 99.99, 99.98, 99.99, 99.98, 99.97, 99.97, 99.96, 99.95, 99.93, 99.91, 99.90, 99.91], target: 99.95, targetLabel: 'Target 99.95%', domain: [99.85, 100], state: 'violation', sla: 'Availability', breachFrom: 10 },
      { id: 'latency', name: 'Latency p95 SLI', unit: 'ms', series: [280, 295, 310, 300, 330, 360, 390, 410, 440, 470, 520, 560, 470], target: 500, targetLabel: 'Target 500ms', domain: [200, 620], state: 'warning', sla: 'Latency p95', breachFrom: 10 },
      { id: 'error_rate', name: 'Error Rate', unit: '%', series: [0.12, 0.11, 0.13, 0.10, 0.14, 0.18, 0.22, 0.31, 0.89, 1.24, 2.10, 2.43, 2.10], target: 0.5, targetLabel: 'Target 0.5%', domain: [0, 4], state: 'violation', sla: 'Error Rate', breachFrom: 8 },
      { id: 'traffic', name: 'Traffic', unit: ' RPS', series: [142, 138, 151, 159, 164, 172, 178, 183, 175, 168, 155, 148, 150], domain: [100, 220], state: 'met', sla: 'Traffic' },
    ],
    budget: { name: 'Error Budget Remaining', unit: '%', series: [100, 98, 95, 92, 88, 82, 75, 66, 57, 48, 38, 32, 30], domain: [0, 100] },
    alarms: [
      { id: 'a1', t: '09:30', idx: 7, sev: 'warning', title: 'Latency p95 Threshold Near', desc: 'p95 410ms — reached 82% of target 500ms', sla: 'Latency p95' },
      { id: 'a2', t: '10:30', idx: 9, sev: 'critical', title: 'Availability Fast-burn Detected', desc: '1h burn rate 14.2× — rapid budget exhaustion', sla: 'Availability' },
      { id: 'a3', t: '11:00', idx: 10, sev: 'critical', title: 'Availability SLA Violation', desc: '99.91% < 99.95% · 2nd alert (62% consumed)', sla: 'Availability' },
    ],
  },
};

export const systemMetricsMockData: Record<string, object> = {
  subscription: {
    times: ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30'],
    cpu:       [44, 52, 48, 61, 78, 88, 92, 95, 88, 82],
    memory:    [62, 63, 64, 65, 67, 69, 71, 73, 72, 71],
    networkIn: [120, 135, 128, 145, 167, 189, 201, 195, 188, 180],
    networkOut:[88,  92,  89,  98,  112, 134, 145, 139, 131, 125],
    diskRead:  [23,  28,  25,  31,  42,  89,  124, 118, 98,  87],
    diskWrite: [15,  18,  17,  21,  29,  52,  78,  71,  61,  55],
  },
};

export const serviceMapMockData: Record<string, object> = {
  'skt-digital': {
    nodes: [
      { id: 'order',          name: 'Order',          status: 'critical', x: 80,  y: 180 },
      { id: 'payment',        name: 'Payment',        status: 'healthy',  x: 260, y: 80  },
      { id: 'subscription',   name: 'Subscription',   status: 'critical', x: 260, y: 200 },
      { id: 'recommendation', name: 'Recommend',      status: 'healthy',  x: 260, y: 320 },
      { id: 'db',             name: 'Aurora DB',      status: 'critical', x: 460, y: 200 },
    ],
    edges: [
      { from: 'order',        to: 'payment'       },
      { from: 'order',        to: 'subscription'  },
      { from: 'order',        to: 'recommendation'},
      { from: 'payment',      to: 'db'            },
      { from: 'subscription', to: 'db'            },
    ],
  },
};

export const rcaMockData: Record<string, object> = {
  subscription: {
    incidentId: 'INC-203',
    title: 'Subscription Service P95 Spike',
    severity: 'critical',
    detectedAt: '14:23',
    resolvedAt: null,
    symptoms: [
      { metric: 'P95 Latency', from: '120ms', to: '950ms' },
      { metric: 'Availability', from: '99.99%', to: '99.91%' },
    ],
    relatedAlarms: ['a1', 'a2', 'a3'],
    candidates: [
      {
        rank: 1, description: 'PostgreSQL CPU 95% 과부하', probability: 82,
        evidence: ['CPU spike 감지 (13:58)', 'slow query 로그 급증', '쿼리 응답 시간 850ms'],
        recommendedActions: ['EXPLAIN ANALYZE로 쿼리 실행 계획 분석', 'Connection Pool 크기 조정 (max_pool_size 20→50)', '읽기 전용 레플리카 추가 검토'],
      },
      {
        rank: 2, description: 'Connection Pool 부족', probability: 64,
        evidence: ['pool_wait_time 급등 (avg 1.2s)', 'connection timeout 에러 증가'],
        recommendedActions: ['max_connections 파라미터 증가', 'PgBouncer 풀링 레이어 추가'],
      },
      {
        rank: 3, description: '최근 배포 영향', probability: 37,
        evidence: ['13:50 배포 이력 확인', '배포 후 latency 점진적 증가'],
        recommendedActions: ['배포 전 버전으로 롤백 검토', '변경 사항 리뷰 (N+1 쿼리 확인)'],
      },
    ],
    timeline: [
      { ts: '14:20', event: 'P95 Latency 급증 시작', type: 'metric' },
      { ts: '14:23', event: '#ALARM-203 발생', type: 'detection' },
      { ts: '14:25', event: 'AI RCA 분석 시작', type: 'rca' },
      { ts: '14:31', event: 'PostgreSQL CPU 95% 원인 확정', type: 'rca' },
      { ts: '14:45', event: '스케일업 조치 완료', type: 'action' },
    ],
  },
};

export const eventsMockData = [
  { id: 'evt-001', ts: '14:23', customerId: 'skt-digital', customerName: 'SK telecom', serviceId: 'subscription', serviceName: 'Subscription Service', incidentId: 'INC-203', title: 'DB CPU Spike — P95 950ms', severity: 'critical' },
  { id: 'evt-002', ts: '14:18', customerId: 'hynix-mi', customerName: 'SK hynix', serviceId: 'sensor', serviceName: 'Sensor Ingest', incidentId: 'INC-202', title: 'Latency P95 Warning (680ms)', severity: 'warning' },
  { id: 'evt-003', ts: '13:55', customerId: 'bb-media', customerName: 'SK broadband', serviceId: 'vod', serviceName: 'VOD Catalog', incidentId: 'INC-201', title: '5xx Error Rate 증가 (2.8%)', severity: 'warning' },
  { id: 'evt-004', ts: '13:30', customerId: 'skt-digital', customerName: 'SK telecom', serviceId: 'subscription', serviceName: 'Subscription Service', incidentId: 'INC-200', title: 'Availability Fast-burn (14.2×)', severity: 'critical' },
  { id: 'evt-005', ts: '12:45', customerId: 'hynix-mi', customerName: 'SK hynix', serviceId: 'sensor', serviceName: 'Sensor Ingest', incidentId: 'INC-199', title: 'DB Connection Saturation 98%', severity: 'warning' },
];

export const tracesMockData: Record<string, object> = {
  subscription: {
    traces: [
      {
        traceId: 'trace-001', duration: 1200, status: 'error', label: 'POST /subscriptions (slowest)',
        spans: [
          { name: 'POST /subscriptions', start: 0,   duration: 1200, error: true  },
          { name: 'auth.validate',        start: 5,   duration: 45,   error: false },
          { name: 'payment.charge',       start: 50,  duration: 100,  error: false },
          { name: 'inventory.check',      start: 50,  duration: 850,  error: true  },
          { name: 'db.query (aurora)',     start: 200, duration: 600,  error: false },
        ],
      },
      {
        traceId: 'trace-002', duration: 980, status: 'error', label: 'GET /subscriptions (error)',
        spans: [
          { name: 'GET /subscriptions',   start: 0,   duration: 980,  error: true  },
          { name: 'db.query (aurora)',     start: 10,  duration: 890,  error: false },
          { name: 'cache.get',            start: 10,  duration: 5,    error: false },
        ],
      },
      {
        traceId: 'trace-003', duration: 320, status: 'ok', label: 'GET /plans (normal)',
        spans: [
          { name: 'GET /plans',           start: 0,   duration: 320,  error: false },
          { name: 'cache.get',            start: 5,   duration: 8,    error: false },
          { name: 'db.query (aurora)',     start: 13,  duration: 290,  error: false },
        ],
      },
    ],
  },
};

export const logsMockData: Record<string, object[]> = {
  subscription: [
    { id: 'log-001', timestamp: '14:23:15', level: 'ERROR', message: 'DB connection timeout after 5000ms — pool exhausted', traceId: 'trace-001', container: 'subscription-api-pod-3' },
    { id: 'log-002', timestamp: '14:23:14', level: 'WARN',  message: 'Connection pool utilization 95% (19/20)', traceId: 'trace-001', container: 'subscription-api-pod-3' },
    { id: 'log-003', timestamp: '14:23:12', level: 'ERROR', message: 'SequelizeConnectionError: remaining connection slots are reserved', traceId: 'trace-002', container: 'subscription-api-pod-1' },
    { id: 'log-004', timestamp: '14:22:58', level: 'WARN',  message: 'Slow query detected: 850ms (threshold: 500ms)', traceId: 'trace-001', container: 'subscription-api-pod-3' },
    { id: 'log-005', timestamp: '14:22:45', level: 'INFO',  message: 'Request received: POST /subscriptions (userId: u-9821)', traceId: 'trace-001', container: 'subscription-api-pod-3' },
    { id: 'log-006', timestamp: '14:22:30', level: 'ERROR', message: 'Inventory service timeout — circuit breaker OPEN', traceId: 'trace-002', container: 'subscription-api-pod-2' },
    { id: 'log-007', timestamp: '14:22:10', level: 'WARN',  message: 'Retry attempt 3/3 for inventory.check', traceId: 'trace-002', container: 'subscription-api-pod-2' },
    { id: 'log-008', timestamp: '14:21:55', level: 'INFO',  message: 'Health check: /healthz OK (latency: 12ms)', traceId: null, container: 'subscription-api-pod-1' },
    { id: 'log-009', timestamp: '14:21:40', level: 'WARN',  message: 'CPU usage 88% — approaching threshold 90%', traceId: null, container: 'subscription-api-pod-3' },
    { id: 'log-010', timestamp: '14:21:20', level: 'INFO',  message: 'Subscription created: sub-8821 (plan: premium)', traceId: 'trace-003', container: 'subscription-api-pod-1' },
  ],
};

export const rootCauseMockData = {
  a3: {
    enteredFrom: 'Availability SLA Violation · 11:00',
    cards: [
      {
        id: 'rds', type: 'RDS', kind: 'resource', name: 'tcare-subscription-db', spec: 'Aurora PostgreSQL · db.r6g.xlarge', status: 'critical', headline: 'Connection saturation 98%',
        primary: { label: 'DB Connections', value: '982 / 1000', state: 'critical' },
        metrics: [{ label: 'CPU', value: '88%', state: 'warning' }, { label: 'Replica Lag', value: '12.4s', state: 'warning' }, { label: 'Deadlocks', value: '7 /min', state: 'critical' }],
        link: 'Subscription Service → rds.query span 1.4s contribution',
      },
      {
        id: 'endpoint', type: 'Endpoint · L3', kind: 'endpoint', name: 'POST /subscriptions', spec: 'L3 Specific SLA · Availability 99.99%', status: 'critical', headline: 'p95 1.8s (Target 0.5s)',
        primary: { label: 'p95 Latency', value: '1.82s', state: 'critical' },
        metrics: [{ label: 'Error Rate', value: '4.1%', state: 'critical' }, { label: 'RPS', value: '340', state: 'healthy' }, { label: 'L3 Avail', value: '99.97%', state: 'critical' }],
        link: 'L3 SLA Violation — directly propagated to parent Availability',
      },
      {
        id: 'alb', type: 'ALB', kind: 'resource', name: 'tcare-subscription-alb', spec: 'Application Load Balancer', status: 'warning', headline: 'Slight 5xx increase (2.3%)',
        primary: { label: '5xx Rate', value: '2.3%', state: 'warning' },
        metrics: [{ label: 'Target 4xx', value: '0.8%', state: 'healthy' }, { label: 'Healthy Hosts', value: '5 / 6', state: 'warning' }, { label: 'Req/s', value: '410', state: 'healthy' }],
        link: '1 unhealthy host — causing partial 5xx',
      },
    ],
  },
};
