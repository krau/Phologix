<template>
  <el-dialog v-model="dialogVisible" title="扫描确认" @closed="onDialogClosed">
    <div class="m-1">
      <div class="mb-4">
        <p>重新扫描相册可能比较耗时，尤其是包含大量图片的相册。</p>
        <p>您可以调整批处理大小来平衡扫描速度和系统资源占用：</p>
      </div>
      <el-form :model="form" label-width="120px" label-position="left">
        <el-form-item label="相册路径">
          <el-input disabled :model-value="albumPath" />
        </el-form-item>
        <el-form-item label="批处理大小">
          <el-tooltip
            content="较大的值可以提高处理速度，但会增加系统资源占用。推荐值：5-20"
            placement="right"
          >
            <el-slider
              v-model="form.batchSize"
              :min="1"
              :max="30"
              :step="1"
              :marks="{ 1: '1', 5: '5', 10: '10', 20: '20', 30: '30' }"
              show-input
            />
          </el-tooltip>
        </el-form-item>
        <el-form-item label="忽略MD5查找">
          <el-switch v-model="form.ignoreMd5" />
          <span class="text-xs text-gray-500 ml-2">开启后将跳过MD5计算, 仅靠路径判断已有图片</span>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmScan">开始扫描</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  albumPath: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', albumPath: string, batchSize: number, ignoreMd5: boolean): void
  (e: 'cancel'): void
}>()

const dialogVisible = ref(props.visible)

const form = ref({
  batchSize: 5,
  ignoreMd5: false
})

watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal
  }
)

watch(
  () => dialogVisible.value,
  (newVal) => {
    emit('update:visible', newVal)
  }
)

const confirmScan = (): void => {
  emit('confirm', props.albumPath, form.value.batchSize, form.value.ignoreMd5)
  dialogVisible.value = false
}

const onDialogClosed = (): void => {
  emit('cancel')
}
</script>
