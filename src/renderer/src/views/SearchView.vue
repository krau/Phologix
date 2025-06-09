<template>
  <div class="search-results h-full flex flex-col relative">
    <search-header
      v-model:search-value="searchQuery"
      :is-searching="isSearching"
      :total-results="totalResults"
      :processing-time-ms="processingTimeMs"
      :initial-semantic-ratio="semanticRatio"
      :initial-ranking-threshold="rankingScoreThreshold"
      :current-page-prop="currentPage"
      :page-size-prop="pageSize"
      @search="search"
      @update:semantic-ratio="semanticRatio = $event"
      @update:ranking-score-threshold="rankingScoreThreshold = $event"
      @update:current-page="handleCurrentChange"
      @update:page-size="handleSizeChange"
    />

    <el-scrollbar class="flex-grow">
      <div
        v-if="pictures.length > 0"
        class="pagination-button pagination-prev"
        :class="{ disabled: currentPage <= 1 }"
        @click="handlePrevPage"
      >
        <el-icon><arrow-left /></el-icon>
      </div>

      <div
        v-if="pictures.length > 0"
        class="pagination-button pagination-next"
        :class="{ disabled: currentPage >= totalPages }"
        @click="handleNextPage"
      >
        <el-icon><arrow-right /></el-icon>
      </div>

      <search-status
        :is-searching="isSearching"
        :is-empty="pictures.length === 0"
        :searched-once="searchedOnce"
      >
        <div v-if="pictures.length > 0" class="mt-2 pb-4 results-container">
          <search-results
            :pictures="pictures"
            @view-image="viewImage"
            @find-related-images="findRelatedImages"
            @view-details="viewDetails"
            @search-tag="searchTag"
          />
        </div>
      </search-status>
    </el-scrollbar>

    <picture-detail-dialog
      v-model:visible="detailDialogVisible"
      :picture="selectedPicture"
      @saved="handlePictureSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import * as common from 'src/common'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

import SearchHeader from '../components/SearchHeader.vue'
import SearchStatus from '../components/SearchStatus.vue'
import SearchResults from '../components/SearchResults.vue'
import PictureDetailDialog from '../components/PictureDetailDialog.vue'

const route = useRoute()
const router = useRouter()

const searchQuery = ref((route.query.q as string) || '')
const isSearching = ref(false)
const pictures = ref<common.DtoPicture[]>([])
const currentPage = ref(1)
const pageSize = ref(12)
const totalResults = ref(0)
const searchedOnce = ref(false)
const semanticRatio = ref(0.5)
const rankingScoreThreshold = ref(0.5)
const processingTimeMs = ref(0)

const totalPages = computed(() => Math.ceil(totalResults.value / pageSize.value))

const detailDialogVisible = ref(false)
const selectedPicture = ref<common.DtoPicture | null>(null)

watch(searchQuery, () => {
  currentPage.value = 1
})

watch(pageSize, () => {
  search()
})

watch(currentPage, () => {
  search()
})

// 监听搜索参数变化
watch([semanticRatio, rankingScoreThreshold], () => {
  if (searchedOnce.value) {
    search()
  }
})

onMounted(() => {
  search()
})

const search = async (): Promise<void> => {
  router.replace({ query: { ...route.query, q: searchQuery.value } })

  try {
    isSearching.value = true
    searchedOnce.value = true

    const result = await window.api.searchPicture(
      searchQuery.value,
      pageSize.value,
      currentPage.value,
      semanticRatio.value,
      rankingScoreThreshold.value
    )
    pictures.value = result.pictures
    totalResults.value = result.totalHits
    processingTimeMs.value = result.processingTimeMs
  } catch (error) {
    console.error('搜索错误:', error)
    ElMessage.error('搜索失败')
  } finally {
    isSearching.value = false
  }
}

const handleSizeChange = (val: number): void => {
  pageSize.value = val
}

const handleCurrentChange = (val: number): void => {
  currentPage.value = val
}

const handlePrevPage = (): void => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const handleNextPage = (): void => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const viewImage = (pic: common.DtoPicture): void => {
  window.api.openPath(pic.filepath)
}

const findRelatedImages = (pic: common.DtoPicture): void => {
  searchQuery.value = `$similar:${pic.md5}`
  currentPage.value = 1
  search()
}

const viewDetails = (pic: common.DtoPicture): void => {
  selectedPicture.value = pic
  detailDialogVisible.value = true
}

const handlePictureSaved = (updatedPicture: common.DtoPicture): void => {
  const index = pictures.value.findIndex((p) => p.id === updatedPicture.id)
  if (index !== -1) {
    pictures.value[index] = updatedPicture
  }
}

const searchTag = (tag: string): void => {
  searchQuery.value = tag
  currentPage.value = 1
  search()
}
</script>

<style scoped>
.el-button.rounded-r-md {
  border-radius: 0 4px 4px 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.el-button.rounded-l-md {
  border-radius: 4px 0 0 4px;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
}

.results-container {
  padding-left: 20px;
  padding-right: 20px;
}

.pagination-button {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 20px;
  background-color: rgba(0, 0, 0, 0.03);
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
}

.pagination-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.pagination-prev {
  left: 0;
  top: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.05);
}

.pagination-next {
  right: 0;
  top: 0;
  border-left: 1px solid rgba(0, 0, 0, 0.05);
}

.pagination-button.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pagination-button .el-icon {
  font-size: 24px;
  color: var(--el-text-color-secondary);
}

.pagination-button:hover .el-icon {
  color: var(--el-text-color-primary);
}
</style>
