<template>
  <div class="flex-shrink-0 mb-4">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <el-input
          v-model="searchQuery"
          placeholder="输入搜索关键词"
          class="w-80"
          clearable
          @keyup.enter="search"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button :loading="isSearching" @click="search">搜索</el-button>
          </template>
        </el-input>
        <el-popover placement="bottom" :width="300" trigger="click">
          <template #reference>
            <el-button type="primary" plain>
              <el-icon><Setting /></el-icon>
              高级选项
            </el-button>
          </template>
          <div class="p-4 space-y-4">
            <div>
              <div class="flex justify-between mb-2">
                <span class="text-sm">语义搜索比重</span>
                <span class="text-sm text-gray-500">{{ semanticRatio }}</span>
              </div>
              <el-slider v-model="semanticRatio" :min="0" :max="1" :step="0.1" show-stops />
            </div>
            <div>
              <div class="flex justify-between mb-2">
                <span class="text-sm">相关度阈值</span>
                <span class="text-sm text-gray-500">{{ rankingScoreThreshold }}</span>
              </div>
              <el-slider
                v-model="rankingScoreThreshold"
                :min="0.1"
                :max="0.95"
                :step="0.05"
                show-stops
              />
            </div>
          </div>
        </el-popover>
        <span v-if="totalResults > 0" class="text-gray-500 whitespace-nowrap">
          找到 {{ totalResults }} 个结果 , 耗时 {{ processingTimeMs }} 毫秒
        </span>
      </div>
      <el-pagination
        v-if="totalResults > 0"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="totalResults"
        :page-sizes="[12, 24, 36, 48]"
        layout="sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
    <el-divider />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, Setting } from '@element-plus/icons-vue'

const props = defineProps({
  searchValue: {
    type: String,
    default: ''
  },
  isSearching: {
    type: Boolean,
    default: false
  },
  totalResults: {
    type: Number,
    default: 0
  },
  processingTimeMs: {
    type: Number,
    default: 0
  },
  initialSemanticRatio: {
    type: Number,
    default: 0.5
  },
  initialRankingThreshold: {
    type: Number,
    default: 0.5
  },
  currentPageProp: {
    type: Number,
    default: 1
  },
  pageSizeProp: {
    type: Number,
    default: 12
  }
})

const emit = defineEmits([
  'update:searchValue',
  'search',
  'update:semanticRatio',
  'update:rankingScoreThreshold',
  'update:currentPage',
  'update:pageSize'
])

const searchQuery = ref(props.searchValue)
const semanticRatio = ref(props.initialSemanticRatio)
const rankingScoreThreshold = ref(props.initialRankingThreshold)

const currentPage = ref(props.currentPageProp)
const pageSize = ref(props.pageSizeProp)

watch(searchQuery, (newValue) => {
  emit('update:searchValue', newValue)
})

watch(
  () => props.searchValue,
  (newValue) => {
    searchQuery.value = newValue
  }
)

watch(semanticRatio, (newValue) => {
  emit('update:semanticRatio', newValue)
})

watch(rankingScoreThreshold, (newValue) => {
  emit('update:rankingScoreThreshold', newValue)
})

watch(
  () => props.currentPageProp,
  (newValue) => {
    currentPage.value = newValue
  }
)

watch(
  () => props.pageSizeProp,
  (newValue) => {
    pageSize.value = newValue
  }
)

watch(currentPage, (newValue) => {
  emit('update:currentPage', newValue)
})

watch(pageSize, (newValue) => {
  emit('update:pageSize', newValue)
})

const search = (): void => {
  emit('search')
}

const handleSizeChange = (val: number): void => {
  emit('update:pageSize', val)
}

const handleCurrentChange = (val: number): void => {
  emit('update:currentPage', val)
}
</script>
