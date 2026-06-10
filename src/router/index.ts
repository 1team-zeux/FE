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
        { path: 'admin/customers',              name: 'customers',        component: () => import('@/pages/CustomerManagementPage.vue'), meta: { requiresAdmin: true } },
      ],
    },
    {
      path: '/iac',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '1',   name: 'iac-screen1',    component: () => import('@/pages/IacScreen1.vue') },
        { path: '2',   name: 'iac-screen2',    component: () => import('@/pages/IacScreen2.vue') },
        { path: '3',   name: 'iac-screen3',    component: () => import('@/pages/IacScreen3.vue') },
        { path: '4',   name: 'iac-screen4',    component: () => import('@/pages/IacScreen4.vue') },
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
      if (user?.role !== 'ADMIN') return { name: 'portfolio' }
    } catch {
      return { name: 'portfolio' }
    }
  }
})

export default router
