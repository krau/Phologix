import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import router from './router'
import 'element-plus/dist/index.css'
import './assets/base.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'

const app = createApp(App)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
