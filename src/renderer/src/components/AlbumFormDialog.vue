<template>
  <el-dialog
    v-model="dialogVisible"
    title="创建相册"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      label-width="120px"
      label-position="left"
    >
      <el-form-item label="相册路径" required>
        <el-input v-model="form.path" disabled />
      </el-form-item>

      <el-form-item label="相册名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入相册名称" />
      </el-form-item>

      <el-form-item label="相册描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入相册描述（可选）"
        />
      </el-form-item>

      <el-form-item label="自动监听">
        <el-switch v-model="form.watch" />
        <span class="text-xs text-gray-500 ml-2">开启后会自动检测目录变化并更新</span>
      </el-form-item>

      <el-form-item label="立即扫描">
        <el-switch v-model="form.scanNow" />
        <span class="text-xs text-gray-500 ml-2">开启后会立即扫描目录</span>
      </el-form-item>

      <el-form-item v-if="form.scanNow" label="批处理大小">
        <el-tooltip
          content="较大的值可以提高处理速度，但会增加系统资源占用。推荐值：5-20"
          placement="right"
        >
          <el-slider
            v-model="form.batchSize"
            :min="1"
            :max="30"
            :step="1"
            :marks="{ 1: '1', 10: '10', 20: '20', 30: '30' }"
            show-input
          />
        </el-tooltip>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" :loading="loading" @click="submit"> 确认创建 </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { type FormInstance } from 'element-plus'
import { ref, reactive, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  albumPath: string
}>()

const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const dialogVisible = ref(props.visible)
const loading = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  path: props.albumPath,
  name: props.albumPath.split('/').pop() || props.albumPath,
  description: '',
  watch: true,
  scanNow: true,
  batchSize: 5
})

const formRules = {
  name: [{ required: true, message: '请输入相册名称', trigger: 'blur' }]
}

watch(
  () => props.visible,
  (val) => {
    dialogVisible.value = val
  }
)

watch(
  () => props.albumPath,
  (val) => {
    form.path = val
    form.name = val.split('/').pop() || val
  }
)

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

const submit = async (): Promise<void> => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true
    emit('submit', { ...form })
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const cancel = (): void => {
  emit('cancel')
  dialogVisible.value = false
}
</script>
