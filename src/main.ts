import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './assets/styles.css'
import App from './App.vue'
import router from './router'

async function unregisterMockServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.all(
    registrations
      .filter((registration) => {
        const scriptUrl =
          registration.active?.scriptURL ??
          registration.waiting?.scriptURL ??
          registration.installing?.scriptURL ??
          ''

        return scriptUrl.includes('/mockServiceWorker.js')
      })
      .map((registration) => registration.unregister()),
  )
}

async function bootstrap() {
  const enableMsw = import.meta.env.DEV && String(import.meta.env.VITE_MSW).toLowerCase() === 'true'

  if (enableMsw) {
    const { worker } = await import('./services/mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  } else if (import.meta.env.DEV) {
    await unregisterMockServiceWorkers()
  }
  const app = createApp(App)
  app.use(createPinia())
  app.use(VueQueryPlugin)
  app.use(router)
  app.mount('#app')
}

bootstrap()
