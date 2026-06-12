import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './assets/styles.css'
import App from './App.vue'
import router from './router'

async function bootstrap() {
  const mswEnabled = import.meta.env.DEV && import.meta.env.VITE_MSW !== 'false'
  if (mswEnabled) {
    const { worker } = await import('./services/mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }
  const app = createApp(App)
  app.use(createPinia())
  app.use(VueQueryPlugin)
  app.use(router)
  app.mount('#app')
}

bootstrap()
