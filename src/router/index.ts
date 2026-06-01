import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: () => import('@/pages/PortfolioPage.vue') },
    { path: '/dashboard/bu/:buId', component: () => import('@/pages/SlaStatusPage.vue') },
    { path: '/dashboard/service/:svcId', component: () => import('@/pages/ServiceDetailPage.vue') },
    { path: '/dashboard/trace/:alarmId', component: () => import('@/pages/RootCausePage.vue') },
  ],
});

export default router;
