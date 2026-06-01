import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/iac/1' },
    {
      path: '/iac',
      component: () => import('@/components/AppLayout.vue'),
      children: [
        { path: '1', name: 'iac-screen1', component: () => import('@/pages/IacScreen1.vue') },
        { path: '2', name: 'iac-screen2', component: () => import('@/pages/IacScreen2.vue') },
        { path: '3', name: 'iac-screen3', component: () => import('@/pages/IacScreen3.vue') },
        { path: '4', name: 'iac-screen4', component: () => import('@/pages/IacScreen4.vue') },
      ],
    },
  ],
})

export default router
