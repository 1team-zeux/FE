import { createRouter, createWebHistory } from 'vue-router'
import { pageTransition } from '@/composables/usePageTransition'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard',                    name: 'portfolio',       component: () => import('@/pages/PortfolioPage.vue') },
        { path: 'dashboard/bu/:buId',           name: 'sla-status',      component: () => import('@/pages/SlaStatusPage.vue') },
        { path: 'dashboard/service/:svcId',     name: 'service-detail',  component: () => import('@/pages/ServiceDetailPage.vue') },
        { path: 'dashboard/trace/:alarmId',     name: 'root-cause',      component: () => import('@/pages/RootCausePage.vue') },
        { path: 'dashboard/events',             name: 'event-center',    component: () => import('@/pages/EventCenterPage.vue') },
        { path: 'dashboard/finops/:runId?',     name: 'finops',          component: () => import('@/pages/FinOpsPage.vue') },
        { path: 'admin/customers',              name: 'customers',        component: () => import('@/pages/CustomerManagementPage.vue'), meta: { requiresAdmin: true } },
        { path: 'guide',                        name: 'customer-guide',   component: () => import('@/pages/CustomerGuidePage.vue') },
        // 장애 대응 섹션 (5 pages)
        { path: 'incident/feed',                name: 'incident-feed',     component: () => import('@/pages/incident/AlarmFeedPage.vue') },
        { path: 'incident/triage/:incidentId?', name: 'incident-triage',   component: () => import('@/pages/incident/TriagePage.vue') },
        { path: 'incident/rca/:incidentId',     name: 'incident-rca',      component: () => import('@/pages/RootCausePage.vue') },
        { path: 'incident/recovery/:incidentId',name: 'incident-recovery', component: () => import('@/pages/incident/RecoveryPage.vue') },
        { path: 'incident/history',             name: 'incident-history',  component: () => import('@/pages/incident/IncidentHistoryPage.vue') },
        { path: 'incident/compare/demo',        name: 'incident-compare-demo', component: () => import('@/pages/incident/CompareDemoPage.vue') },
      ],
    },
    {
      path: '/iac',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '1',   name: 'iac-document-upload',  component: () => import('@/pages/IacDocumentUploadPage.vue') },
        { path: '2',   name: 'iac-sla-review',       component: () => import('@/pages/IacSlaReviewPage.vue') },
        { path: '3',   name: 'iac-topology-select',  component: () => import('@/pages/IacTopologySelectPage.vue') },
        { path: '4',   name: 'iac-deploy',           component: () => import('@/pages/IacDeployPage.vue') },
      ],
    },
  ],
})

router.beforeEach((to, from) => {
  // IaC 페이지 전환 애니메이션
  const toStep  = parseInt(to.path.match(/\/iac\/(\d)/)?.[1]   ?? '0')
  const fromStep = parseInt(from.path.match(/\/iac\/(\d)/)?.[1] ?? '0')
  if (toStep && fromStep) {
    pageTransition.value = toStep > fromStep ? 'iac-forward' : 'iac-backward'
  } else {
    pageTransition.value = ''
  }

  // 인증 가드
  const token = localStorage.getItem('zeux_token')
  const isPublic = to.meta.public === true

  if (!token && !isPublic) {
    return { name: 'login' }
  }

  if (token && to.name === 'login') {
    return { name: 'portfolio' }
  }

  // Admin 전용 페이지
  if (to.meta.requiresAdmin) {
    try {
      const user = JSON.parse(localStorage.getItem('zeux_user') ?? 'null')
      if (user?.role !== 'ADMIN') return { name: 'customer-guide' }
    } catch {
      return { name: 'customer-guide' }
    }
  }

  // CUSTOMER 역할: admin 경로 + portfolio 페이지 차단 → guide로
  if (token) {
    try {
      const user = JSON.parse(localStorage.getItem('zeux_user') ?? 'null')
      if (user?.role === 'CUSTOMER') {
        if (to.path.startsWith('/admin')) return { name: 'customer-guide' }
        // 전체 고객사 포트폴리오 뷰는 운영자 전용
        if (to.name === 'portfolio') return { name: 'customer-guide' }
      }
    } catch { /* ignore */ }
  }
})

export default router
