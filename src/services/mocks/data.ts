export const portfolioMockData = [
  { id: 'skt-digital', customer: 'SK telecom', bu: 'Digital Service BU', platform: 'T-Care Connect Platform', status: 'critical', serviceCount: 3, riskCount: 1, lowestBudget: 30, burn: 'Fast', drillable: true, note: 'Subscription Service Availability SLA Violation' },
  { id: 'hynix-mi', customer: 'SK hynix', bu: 'Manufacturing Intelligence BU', platform: 'Fab Sensing Platform', status: 'warning', serviceCount: 4, riskCount: 1, lowestBudget: 55, burn: 'Slow', drillable: false, note: 'Sensor Ingest Service Latency Warning' },
  { id: 'bb-media', customer: 'SK broadband', bu: 'Media Delivery BU', platform: 'B tv Streaming Platform', status: 'warning', serviceCount: 3, riskCount: 0, lowestBudget: 64, burn: 'Slow', drillable: false, note: 'VOD Catalog Service Latency Warning' },
  { id: 'energy-retail', customer: 'SK energy', bu: 'Retail Platform BU', platform: 'EnClean Membership Platform', status: 'healthy', serviceCount: 2, riskCount: 0, lowestBudget: 82, burn: null, drillable: false, note: 'All services meet SLA' },
];

export const servicesMockData = {
  'skt-digital': [
    {
      id: 'subscription', name: 'Subscription Service', tier: 'Tier 1', status: 'critical', burn: 'Fast', budgetConsumed: 70, budgetRemaining: 30, alertStage: 2, drillable: true,
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
      id: 'portal', name: 'Customer Portal Web Service', tier: 'Tier 1', status: 'warning', burn: 'Slow', budgetConsumed: 50, budgetRemaining: 50, alertStage: 1, drillable: false,
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
    ],
    budget: { name: 'Error Budget Remaining', unit: '%', series: [100, 98, 95, 92, 88, 82, 75, 66, 57, 48, 38, 32, 30], domain: [0, 100] },
    alarms: [
      { id: 'a1', t: '09:30', idx: 7, sev: 'warning', title: 'Latency p95 Threshold Near', desc: 'p95 410ms — reached 82% of target 500ms', sla: 'Latency p95' },
      { id: 'a2', t: '10:30', idx: 9, sev: 'critical', title: 'Availability Fast-burn Detected', desc: '1h burn rate 14.2× — rapid budget exhaustion', sla: 'Availability' },
      { id: 'a3', t: '11:00', idx: 10, sev: 'critical', title: 'Availability SLA Violation', desc: '99.91% < 99.95% · 2nd alert (62% consumed)', sla: 'Availability' },
    ],
  },
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
