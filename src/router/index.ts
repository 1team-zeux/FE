import { createRouter, createWebHistory } from 'vue-router'
import { pageTransition } from '@/composables/usePageTransition'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard',                    name: 'portfolio',       component: () => import('@/pages/PortfolioPage.vue') },
        { path: 'dashboard/bu/:buId',           name: 'sla-status',      component: () => import('@/pages/SlaStatusPage.vue') },
        { path: 'dashboard/service/:svcId',     name: 'service-detail',  component: () => import('@/pages/ServiceDetailPage.vue') },
        { path: 'dashboard/trace/:alarmId',     name: 'root-cause',      component: () => import('@/pages/RootCausePage.vue') },
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
  const toStep  = parseInt(to.path.match(/\/iac\/(\d)/)?.[1]   ?? '0')
  const fromStep = parseInt(from.path.match(/\/iac\/(\d)/)?.[1] ?? '0')
  if (toStep && fromStep) {
    pageTransition.value = toStep > fromStep ? 'iac-forward' : 'iac-backward'
  } else {
    pageTransition.value = ''
  }
})

export default router
