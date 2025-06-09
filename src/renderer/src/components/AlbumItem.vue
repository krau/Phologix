<template>
  <div
    class="flex justify-between items-center py-4 px-5 transition-colors"
    :class="{ 'border-b': hasBorder }"
  >
    <div class="flex items-center">
      <el-icon class="mr-3"><Folder /></el-icon>
      <span class="text-xl font-semibold">{{ album.name }}</span>
      <span class="ml-3 mt-1 text-sm cursor-pointer" @click="openAlbumDir(album.path)">{{
        album.path
      }}</span>
    </div>
    <div class="flex gap-3">
      <el-tooltip content="修改" placement="top">
        <el-button type="warning" size="large" circle @click="edit">
          <el-icon><Edit /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip :content="isScanning ? '正在扫描中...' : '重新扫描'" placement="top">
        <el-button type="primary" size="large" circle :disabled="isScanning" @click="rescan">
          <el-icon v-if="!isScanning"><Refresh /></el-icon>
          <el-icon v-else><Loading /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip :content="isDeleting ? '正在删除中...' : '删除'" placement="top">
        <el-button type="danger" size="large" circle :disabled="isDeleting" @click="deleteAlbum">
          <el-icon v-if="!isDeleting"><Delete /></el-icon>
          <el-icon v-else><Loading /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Folder, Refresh, Delete, Edit, Loading } from '@element-plus/icons-vue'
import type { DtoAlbum } from 'src/common'

const props = defineProps<{
  album: DtoAlbum
  hasBorder: boolean
  isScanning: boolean
  isDeleting: boolean
}>()

const emit = defineEmits(['edit', 'rescan', 'delete', 'open-dir'])

const edit = (): void => {
  emit('edit', props.album)
}

const rescan = (): void => {
  emit('rescan', props.album.path)
}

const deleteAlbum = (): void => {
  emit('delete', props.album.path)
}

const openAlbumDir = (path: string): void => {
  emit('open-dir', path)
}
</script>
