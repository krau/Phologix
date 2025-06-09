<template>
  <el-dialog
    v-model="dialogVisible"
    :title="getFilename(picture?.filepath || '')"
    :before-close="handleClose"
    center
    fullscreen-on-mobile
    width="90%"
    max-width="1000px"
    destroy-on-close
    class="picture-detail-dialog"
  >
    <div class="flex flex-col md:flex-row gap-4">
      <div class="md:w-1/2 flex-shrink-0 flex flex-col">
        <div
          class="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
          style="height: 55vh"
        >
          <el-image-viewer
            v-if="showViewer && picture?.filepath"
            :url-list="[`phologix-picture-file-id:///${picture.id}`]"
            hide-on-click-modal
            @close="showViewer = false"
          />

          <img
            v-if="picture?.filepath"
            :src="`phologix-picture-file-id:///${picture.id}`"
            class="object-contain max-w-full max-h-full cursor-zoom-in"
            :alt="getFilename(picture.filepath)"
            @click="showViewer = true"
          />
          <el-icon v-else class="text-6xl text-gray-300"><Picture /></el-icon>
        </div>
        <div class="mt-2 text-sm text-gray-500 overflow-hidden text-ellipsis">
          <p v-if="picture?.filepath" class="truncate cursor-pointer" @click="openFile">
            路径：{{ picture.filepath }}
          </p>
          <p v-if="picture?.width && picture?.height">
            分辨率：{{ picture.width }} x {{ picture.height }}
          </p>
        </div>
      </div>

      <div class="md:w-1/2 flex flex-col" style="height: 60vh">
        <div class="mb-3">
          <h3 class="text-lg font-medium mb-1">描述</h3>
          <el-input
            v-model="description"
            type="textarea"
            :rows="3"
            placeholder="添加图片描述..."
            resize="none"
          />
        </div>

        <div class="flex flex-col flex-grow overflow-hidden">
          <h3 class="text-lg font-medium mb-1">标签</h3>
          <div class="mb-2">
            <div class="flex items-center gap-2">
              <el-input v-model="newTag" placeholder="添加新标签" @keyup.enter="addTag" />
              <el-button :disabled="!newTag.trim()" @click="addTag">
                <el-icon><Plus /></el-icon>
              </el-button>
              <el-button type="warning" :disabled="resetingTags" @click="resetTags">
                <el-tooltip v-if="!resetingTags" content="重置标签" placement="top">
                  <el-icon><Refresh /></el-icon>
                </el-tooltip>
                <el-icon v-else><Loading /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="flex-grow overflow-auto h-0">
            <el-scrollbar>
              <el-tag
                v-for="tag in tags"
                :key="tag"
                closable
                disable-transitions
                :type="getRandomTagType()"
                size="large"
                class="mb-1 py-1 px-3 mr-1 font-medium"
                @close="removeTag(tag)"
              >
                {{ tag }}
              </el-tag>
              <div v-if="tags.length === 0" class="text-gray-400 italic">
                暂无标签，请添加新标签
              </div>
            </el-scrollbar>
          </div>
        </div>

        <div class="mt-3">
          <div class="flex justify-end gap-3">
            <el-button @click="handleClose">取消</el-button>
            <el-button type="primary" :loading="isSaving" @click="saveChanges">
              保存修改
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture, Plus, Refresh, Loading } from '@element-plus/icons-vue'
import * as common from 'src/common'

const showViewer = ref(false)

const props = defineProps<{
  visible: boolean
  picture?: common.DtoPicture | null
}>()

const emit = defineEmits(['update:visible', 'saved'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const description = ref('')
const tags = ref<string[]>([])
const newTag = ref('')
const isSaving = ref(false)

watch(
  () => props.picture,
  (newPicture) => {
    if (newPicture) {
      description.value = newPicture.description || ''
      tags.value = newPicture.tags ? newPicture.tags.map((tag) => tag.name) : []
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm(): void {
  description.value = ''
  tags.value = []
  newTag.value = ''
}

function getFilename(filepath: string): string {
  return filepath.split(/[/\\]/).pop() || filepath
}

function addTag(): void {
  const trimmedTag = newTag.value.trim()
  if (trimmedTag && !tags.value.includes(trimmedTag)) {
    tags.value.push(trimmedTag)
    newTag.value = ''
  }
}

function removeTag(tag: string): void {
  const index = tags.value.indexOf(tag)
  if (index !== -1) {
    tags.value.splice(index, 1)
  }
}

async function saveChanges(): Promise<void> {
  if (!props.picture || props.picture.id === undefined) return

  try {
    isSaving.value = true

    const resp = await window.db.updatePicture({
      id: props.picture.id,
      description: description.value,
      tags: tags.value.map((name) => ({ name }))
    })
    console.log(resp)

    ElMessage.success('保存成功')
    emit('saved', {
      ...props.picture,
      description: description.value,
      tags: tags.value.map((name) => ({ name }))
    })

    handleClose()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    isSaving.value = false
  }
}

function handleClose(): void {
  dialogVisible.value = false
}

const resetingTags = ref(false)

const resetTags = async (): Promise<void> => {
  if (!props.picture || props.picture.id === undefined) return

  resetingTags.value = true
  try {
    const resp = await window.api.processFile(props.picture.filepath)
    tags.value = resp.predicted_tags
    ElMessage.success('已重新生成标签')
  } catch (error) {
    console.error('重置标签失败:', error)
    ElMessage.error('重置标签失败')
  } finally {
    resetingTags.value = false
  }
}

enum TagType {
  Success = 'success',
  Warning = 'warning',
  Primary = 'primary',
  Danger = 'danger'
}

const tagTypes = [TagType.Success, TagType.Warning, TagType.Primary, TagType.Danger]

function getRandomTagType(): TagType {
  return tagTypes[Math.floor(Math.random() * tagTypes.length)]
}

function openFile(): void {
  if (props.picture?.filepath) {
    window.api.showItemInFolder(props.picture.filepath)
  }
}
</script>

<style>
.picture-detail-dialog .el-dialog__body {
  overflow: hidden;
  padding: 16px;
}
</style>
