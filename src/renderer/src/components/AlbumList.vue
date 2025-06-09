<template>
  <div>
    <ElDivider>
      <template #default>
        <h2 class="text-xl font-semibold">已添加的相册</h2>
      </template>
    </ElDivider>

    <div class="px-6 py-3" style="height: calc(100vh - 150px)">
      <el-empty v-if="albums.length === 0" description="暂无相册" />
      <el-scrollbar v-else height="100%">
        <div class="rounded-lg shadow-sm">
          <AlbumItem
            v-for="(album, index) in albums"
            :key="album.path"
            :album="album"
            :has-border="index !== albums.length - 1"
            :is-scanning="scanningAlbums.has(album.path)"
            :is-deleting="deletingAlbums.has(album.path)"
            @edit="$emit('edit', $event)"
            @rescan="$emit('rescan', $event)"
            @delete="$emit('delete', $event)"
            @open-dir="$emit('open-dir', $event)"
          />
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElDivider } from 'element-plus'
import type { DtoAlbum } from 'src/common'
import AlbumItem from './AlbumItem.vue'

defineProps<{
  albums: DtoAlbum[]
  scanningAlbums: Set<string>
  deletingAlbums: Set<string>
}>()

defineEmits(['edit', 'rescan', 'delete', 'open-dir'])
</script>
