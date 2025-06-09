<template>
  <div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <image-card
        v-for="pic in pictures"
        :key="pic.id"
        :picture="pic"
        @view-image="handleViewImage"
        @find-related-images="handleFindRelatedImages"
        @view-details="handleViewDetails"
        @search-tag="handleSearchTag"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ImageCard from './ImageCard.vue'
import * as common from 'src/common'

defineProps<{
  pictures: common.DtoPicture[]
}>()

const emit = defineEmits(['viewImage', 'findRelatedImages', 'viewDetails', 'searchTag'])

const handleViewImage = (pic: common.DtoPicture): void => {
  emit('viewImage', pic)
}

const handleFindRelatedImages = (pic: common.DtoPicture): void => {
  emit('findRelatedImages', pic)
}

const handleViewDetails = (pic: common.DtoPicture): void => {
  emit('viewDetails', pic)
}

const handleSearchTag = (tag: string): void => {
  emit('searchTag', tag)
}
</script>
