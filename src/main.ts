import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './assets/styles.css'
import App from './App.vue'
import router from './router'

function bootstrap() {
  const app = createApp(App)
  app.use(createPinia())
  app.use(VueQueryPlugin)
  app.use(router)
  app.mount('#app')
}

bootstrap()
