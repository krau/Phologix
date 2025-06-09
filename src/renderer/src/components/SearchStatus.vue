<template>
  <div>
    <div v-if="isSearching" class="flex justify-center items-center py-20">
      <el-icon class="text-3xl animate-spin mr-3"><Loading /></el-icon>
      <span class="text-xl">搜索中...</span>
    </div>

    <el-empty v-else-if="!isSearching && isEmpty && searchedOnce" description="未找到匹配的图片">
      <template #image>
        <el-icon class="text-6xl text-gray-300"><PictureRounded /></el-icon>
      </template>
    </el-empty>

    <slot v-else></slot>
  </div>
</template>

<script setup lang="ts">
import { Loading, PictureRounded } from '@element-plus/icons-vue'

defineProps<{
  isSearching: boolean
  isEmpty: boolean
  searchedOnce: boolean
}>()
</script>
