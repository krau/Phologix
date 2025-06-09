<template>
  <div class="w-full p-4">
    <div class="mb-4 flex justify-between items-center">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold">Phologix</h1>
        <div class="flex items-center text-gray-500 text-sm">
          <span class="ml-2">共 {{ pictureCount }} 张图片</span>
          <el-button class="ml-2" @click="refreshPictureCount">
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <el-input
          v-model="searchInput"
          placeholder="输入关键词搜索"
          class="w-64"
          clearable
          @keyup.enter="search"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button @click="search">搜索</el-button>
          </template>
        </el-input>
        <el-button type="primary" @click="addAlbum">
          <el-icon class="mr-1"><Folder /></el-icon>
          添加相册目录
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Folder, Search, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ref, onMounted } from 'vue'

const searchInput = ref('')

const emit = defineEmits(['add-album', 'search'])

const search = (): void => {
  if (!searchInput.value.trim()) {
    ElMessage.warning('请输入搜索内容')
    return
  }
  emit('search', searchInput.value.trim())
}

const addAlbum = (): void => {
  emit('add-album')
}

const pictureCount = ref(0)

const refreshPictureCount = async (): Promise<void> => {
  pictureCount.value = await window.db.countPictures()
}

onMounted(async () => {
  await refreshPictureCount()
})
</script>
