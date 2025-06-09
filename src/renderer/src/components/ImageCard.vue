<template>
  <div class="image-card">
    <el-card shadow="hover" class="h-full">
      <div
        class="aspect-square overflow-hidden rounded mb-2 bg-blue-50 flex items-center justify-center relative"
      >
        <img
          v-if="picture.thumb_path"
          :src="`phologix-file:///${picture.thumb_path}`"
          class="object-contain w-full h-full"
          :alt="getFilename(picture.filepath)"
        />
        <el-icon v-else class="text-4xl text-gray-300"><PictureIcon /></el-icon>
        <div
          class="absolute inset-0 hover:bg-opacity-10 transition-all duration-300 cursor-pointer"
          @click="viewDetails(picture)"
        ></div>
      </div>
      <div class="space-y-2">
        <div class="flex gap-2 mb-2 w-full">
          <el-button
            size="default"
            type="primary"
            class="flex-1"
            @click="findRelatedImages(picture)"
          >
            相关图片
          </el-button>
          <el-button size="default" class="flex-1" @click="viewImage(picture)">
            查看原图
          </el-button>
        </div>
        <div class="truncate text-sm font-medium" :title="getFilename(picture.filepath)">
          {{ getFilename(picture.filepath) }}
        </div>
        <el-scrollbar height="180px" class="tag-scrollbar">
          <div class="flex flex-wrap gap-1 py-1">
            <el-tag
              v-for="(tag, index) in picture.tags"
              :key="tag.id"
              :type="getTagType(index)"
              class="cursor-pointer mb-1 font-semibold"
              size="large"
              @click="searchTag(tag.name)"
            >
              {{ tag.name }}
            </el-tag>
          </div>
        </el-scrollbar>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Picture as PictureIcon } from '@element-plus/icons-vue'
import * as common from 'src/common'

defineProps<{
  picture: common.DtoPicture
}>()

const emit = defineEmits(['viewImage', 'findRelatedImages', 'viewDetails', 'searchTag'])

const getFilename = (filepath: string): string => {
  return filepath.split(/[/\\]/).pop() || filepath
}

const viewImage = (pic: common.DtoPicture): void => {
  emit('viewImage', pic)
}

const findRelatedImages = (pic: common.DtoPicture): void => {
  emit('findRelatedImages', pic)
}

const viewDetails = (pic: common.DtoPicture): void => {
  emit('viewDetails', pic)
}

const searchTag = (tag: string): void => {
  emit('searchTag', tag)
}

const getTagType = (
  index: number
): 'primary' | 'success' | 'info' | 'warning' | 'danger' | undefined => {
  const types = ['primary', 'success', 'warning', 'info', 'danger']
  return types[index % types.length] as
    | 'primary'
    | 'success'
    | 'info'
    | 'warning'
    | 'danger'
    | undefined
}
</script>

<style scoped>
.image-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.image-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.image-card img {
  transition: transform 0.3s ease;
}

.image-card:hover img {
  transform: scale(1.05);
}

.tag-scrollbar :deep(.el-scrollbar__bar.is-horizontal) {
  display: none;
}
</style>
