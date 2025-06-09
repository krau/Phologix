import AboutView from '@renderer/views/AboutView.vue'
import HomeView from '@renderer/views/HomeView.vue'
import SettingsView from '@renderer/views/SettingsView.vue'
import SearchView from '@renderer/views/SearchView.vue'
import { createMemoryHistory, createRouter } from 'vue-router'

const routes = [
  { path: '/about', component: AboutView },
  { path: '/', component: HomeView },
  { path: '/settings', component: SettingsView },
  { path: '/search', component: SearchView }
]

const router = createRouter({
  history: createMemoryHistory(),
  routes
})

export default router
