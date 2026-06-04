import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '', redirect: '/iac/1' },
        { path: 'dashboard',                    name: 'portfolio',       component: () => import('@/pages/PortfolioPage.vue') },
        { path: 'dashboard/bu/:buId',           name: 'sla-status',      component: () => import('@/pages/SlaStatusPage.vue') },
        { path: 'dashboard/service/:svcId',     name: 'service-detail',  component: () => import('@/pages/ServiceDetailPage.vue') },
        { path: 'dashboard/trace/:alarmId',     name: 'root-cause',      component: () => import('@/pages/RootCausePage.vue') },
        { path: 'iac/1',                        name: 'iac-screen1',     component: () => import('@/pages/IacScreen1.vue') },
        { path: 'iac/1.1',                      name: 'iac-screen1-v2',  component: () => import('@/pages/variants/IacScreen1.v2.vue') },
        { path: 'iac/2',                        name: 'iac-screen2',     component: () => import('@/pages/IacScreen2.vue') },
        { path: 'iac/3',                        name: 'iac-screen3',     component: () => import('@/pages/IacScreen3.vue') },
        { path: 'iac/4',                        name: 'iac-screen4',     component: () => import('@/pages/IacScreen4.vue') },
      ],
    },
  ],
})

export default router
