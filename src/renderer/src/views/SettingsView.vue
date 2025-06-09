<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">设置</h2>
    <el-divider />
    <el-scrollbar height="calc(100vh - 120px)">
      <div class="grid gap-4">
        <el-card>
          <el-text class="text-lg font-semibold">嵌入器</el-text>
          <el-divider />
          <el-form :model="embedderSettings">
            <el-form-item label="类型" class="mb-4">
              <el-select v-model="embedderSettings.source">
                <el-option label="Ollama" value="ollama" />
                <el-option label="OpenAI" value="openAi" />
              </el-select>
            </el-form-item>
            <el-form-item label="URL" class="mb-4">
              <el-input v-model="embedderSettings.url" />
            </el-form-item>
            <el-form-item label="模型" class="mb-4">
              <el-input v-model="embedderSettings.model" />
            </el-form-item>
            <el-form-item label="API Key" class="mb-4">
              <el-input v-model="embedderSettings.apiKey" />
            </el-form-item>
            <el-form-item label="维度" class="mb-4">
              <el-input v-model="embedderSettings.dimensions" />
            </el-form-item>
            <el-form-item label="文档模板" class="mb-4">
              <el-input v-model="embedderSettings.documentTemplate" />
            </el-form-item>
            <el-form-item label="文档模板最大字节数" class="mb-4">
              <el-input v-model="embedderSettings.documentTemplateMaxBytes" />
            </el-form-item>

            <el-form-item class="flex justify-end gap-2 mt-6">
              <el-tooltip
                :content="isSaving ? '检查中' : '更改嵌入器可能会对已有数据进行重新处理!'"
                placement="top"
              >
                <el-button
                  type="primary"
                  :loading="isSaving"
                  :disabled="isSaving"
                  @click="saveSettings"
                >
                  {{ isSaving ? '检查中' : '保存' }}
                </el-button>
              </el-tooltip>
              <el-button type="default" :disabled="isSaving" @click="resetSettings">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card>
          <el-text class="text-lg font-semibold">标签标注器</el-text>
          <el-divider />
          <el-form :model="taggerSettings">
            <el-form-item label="类型" class="mb-4">
              <el-select v-model="taggerSettings.source">
                <el-option label="Konatagger" value="konatagger" />
              </el-select>
            </el-form-item>
            <el-form-item label="URL" class="mb-4">
              <el-input v-model="taggerSettings.url" disabled />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card>
          <el-text class="text-lg font-semibold">搜索引擎</el-text>
          <el-divider />
          <el-form :model="searchEngineSettings">
            <el-form-item label="类型" class="mb-4">
              <el-select v-model="searchEngineSettings.source">
                <el-option label="Meilisearch" value="meilisearch" />
              </el-select>
            </el-form-item>
            <el-form-item label="URL" class="mb-4">
              <el-input v-model="searchEngineSettings.url" disabled />
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
const defaultEmbedderSettings = {
  source: 'ollama',
  url: 'http://localhost:11434/api/embed',
  model: 'bge-m3',
  dimensions: 1024,
  apiKey: '',
  documentTemplate: `A picture with tags {{doc.tags}} {% if doc.description %} and description {{doc.description}} {% endif %}`,
  documentTemplateMaxBytes: 2000
}

const embedderSettings = ref(defaultEmbedderSettings)
const isSaving = ref(false)

const saveSettings = async (): Promise<void> => {
  isSaving.value = true
  try {
    if (await checkStatus()) {
      if (await window.api.updateEmbedderSettings(Object.assign({}, embedderSettings.value))) {
        ElMessage.success('设置保存成功')
      } else {
        ElMessage.error('设置保存失败')
      }
    } else {
      ElMessage.error('嵌入器连接测试失败，请检查配置')
    }
  } catch (error) {
    console.error('保存设置失败', error)
    ElMessage.error('保存设置失败')
  } finally {
    isSaving.value = false
  }
}

const resetSettings = (): void => {
  embedderSettings.value = Object.assign({}, defaultEmbedderSettings)
  console.log('重置设置', embedderSettings.value)
}

const checkStatus = async (): Promise<boolean> => {
  try {
    const resp = await window.api.request(`${embedderSettings.value.url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${embedderSettings.value.apiKey}`
      },
      body: JSON.stringify({
        input: 'Hello, world!',
        model: embedderSettings.value.model
      })
    })
    if (resp.status !== 200) {
      console.error('检查嵌入器状态失败', resp.data)
      return false
    }
    return true
  } catch (error) {
    console.error('检查嵌入器状态失败', error)
    return false
  }
}

onMounted(async () => {
  try {
    const currentEmbedderSettings = await window.api.getEmbedderSettings()
    embedderSettings.value = {
      source: currentEmbedderSettings.source,
      url: currentEmbedderSettings.url,
      model: currentEmbedderSettings.model,
      apiKey: currentEmbedderSettings.apiKey || '',
      dimensions: currentEmbedderSettings.dimensions,
      documentTemplate: currentEmbedderSettings.documentTemplate || '',
      documentTemplateMaxBytes: currentEmbedderSettings.documentTemplateMaxBytes || 4000
    }
  } catch (error) {
    console.error('获取嵌入器设置失败', error)
  }
})

const taggerSettings = ref({
  source: 'konatagger',
  url: 'http://localhost:39070/predict'
})

const searchEngineSettings = ref({
  source: 'meilisearch',
  url: 'http://localhost:39071'
})
</script>
