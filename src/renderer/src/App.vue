<template>
  <div class="h-screen w-screen overflow-hidden">
    <Transition name="el-fade-in">
      <div v-show="loading" class="h-full w-full">
        <LoadingScreen />
      </div>
    </Transition>
    <Layout v-show="!loading" class="h-full w-full">
      <template v-if="!loading" #sidebar>
        <Sidebar />
      </template>
      <template #default>
        <div class="h-full overflow-hidden">
          <router-view v-slot="{ Component }">
            <KeepAlive :exclude="['SettingsView']" max="10">
              <component :is="Component" />
            </KeepAlive>
          </router-view>
        </div>
      </template>
    </Layout>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import Layout from './components/Layout.vue'
import Sidebar from './components/Sidebar.vue'
import LoadingScreen from './components/LoadingScreen.vue'
import { useDark } from '@vueuse/core'

const loadingKonatagger = ref(true)
const loadingMeilisearch = ref(true)
const loading = computed(() => loadingKonatagger.value || loadingMeilisearch.value)

watch(loading, async (val) => {
  if (!val) {
    window.api.startExistsDirWatcher()
  }
})

const checkServiceStatus = async (): Promise<void> => {
  try {
    const status = await window.api.getServiceStatus()
    console.log('Service status:', status)

    if (status.konatagger.ready) {
      console.log('Konatagger already started on port:', status.konatagger.port)
      loadingKonatagger.value = false
    }

    if (status.meilisearch.ready) {
      console.log('Meilisearch already started on port:', status.meilisearch.port)
      loadingMeilisearch.value = false
    }
  } catch (error) {
    console.error('Failed to check service status:', error)
  }
}

onMounted(() => {
  checkServiceStatus()
})

window.api.onKonataggerStarted((port: number) => {
  console.log('Konatagger started on port:', port)
  loadingKonatagger.value = false
})

window.api.onMeilisearchStarted((port: number) => {
  console.log('Meilisearch started on port:', port)
  loadingMeilisearch.value = false
})

useDark()
</script>
