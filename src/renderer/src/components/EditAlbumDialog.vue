<template>
  <el-dialog
    v-model="dialogVisible"
    title="修改相册"
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
      <el-form-item label="相册路径">
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
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" :loading="loading" @click="submit"> 确认修改 </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { type FormInstance } from 'element-plus'
import { ref, reactive, watch } from 'vue'
import type { DtoAlbum } from 'src/common'

const props = defineProps<{
  visible: boolean
  album: DtoAlbum
}>()

const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const dialogVisible = ref(props.visible)
const loading = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<DtoAlbum>({
  id: props.album.id,
  path: props.album.path,
  name: props.album.name ?? '',
  description: props.album.description ?? '',
  watch: props.album.watch ?? true
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
  () => props.album,
  (val) => {
    form.id = val.id
    form.path = val.path
    form.name = val.name ?? ''
    form.description = val.description ?? ''
    form.watch = val.watch ?? true
  },
  { deep: true }
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
