<template>
  <div>
    <AlbumHeader @add-album="addAlbum" @search="searchInAlbum" />

    <AlbumList
      :albums="albums"
      :scanning-albums="scanningAlbums"
      :deleting-albums="deletingAlbums"
      @edit="editAlbum"
      @rescan="rescanAlbum"
      @delete="deleteAlbum"
      @open-dir="openAlbumDir"
    />

    <AlbumFormDialog
      v-model:visible="showAlbumDialog"
      :album-path="albumForm.path"
      @submit="submitAlbumForm"
      @cancel="showAlbumDialog = false"
    />

    <EditAlbumDialog
      v-model:visible="showEditDialog"
      :album="editForm"
      @submit="submitEditForm"
      @cancel="showEditDialog = false"
    />

    <ScanConfirmDialog
      v-model:visible="showScanDialog"
      :album-path="scanForm.albumPath"
      @confirm="confirmScan"
      @cancel="showScanDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import * as common from 'src/common'
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import AlbumHeader from '../components/AlbumHeader.vue'
import AlbumList from '../components/AlbumList.vue'
import AlbumFormDialog from '../components/AlbumFormDialog.vue'
import EditAlbumDialog from '../components/EditAlbumDialog.vue'
import ScanConfirmDialog from '../components/ScanConfirmDialog.vue'

const router = useRouter()
const albums = ref<common.DtoAlbum[]>([])
const scanningAlbums = ref<Set<string>>(new Set())
const deletingAlbums = ref<Set<string>>(new Set())

const showAlbumDialog = ref(false)
const albumForm = reactive({
  path: '',
  name: '',
  description: '',
  watch: true,
  scanNow: true,
  batchSize: 5
})

const showEditDialog = ref(false)
const editForm = reactive<common.DtoAlbum>({
  path: '',
  name: '',
  description: '',
  watch: true
})

const showScanDialog = ref(false)
const scanForm = reactive({
  albumPath: '',
  batchSize: 5,
  ignoreMd5: false
})

onMounted(async () => {
  const directory = await window.db.getAlbum()
  albums.value = directory
})

const addAlbum = async (): Promise<void> => {
  try {
    const directoryPath = await window.api.dialogOpenDirectory()
    if (!directoryPath) return

    const exist = await window.db.checkAlbumExist(directoryPath)
    if (exist) {
      ElMessage.error('所选路径已存在相册')
      return
    }

    albumForm.path = directoryPath
    albumForm.name =
      directoryPath.split('/').pop() || directoryPath.split('\\').pop() || directoryPath
    albumForm.description = ''
    albumForm.watch = true
    albumForm.scanNow = true

    showAlbumDialog.value = true
  } catch (error) {
    console.error(error)
    ElMessage.error('打开目录失败')
  }
}

const submitAlbumForm = async (formData: typeof albumForm): Promise<void> => {
  try {
    const shouldScanNow = formData.scanNow

    const res = await window.db.addAlbum(Object.assign({}, formData))
    if (res) {
      albums.value = await window.db.getAlbum()
      ElMessage.success('相册创建成功')

      if (formData.watch) {
        await window.api.addWatcher(formData.path)
      }

      if (shouldScanNow) {
        rescanAlbum(formData.path, formData.batchSize)
      }
    }
    showAlbumDialog.value = false
  } catch (error) {
    console.error(error)
    ElMessage.error('创建相册失败')
  }
}

const deleteAlbum = async (path: string): Promise<void> => {
  try {
    const dir = albums.value.find((d) => d.path === path)
    const dirName = dir ? dir.name : path
    await ElMessageBox.confirm(
      `您确定要删除相册"${dirName}"吗？删除后将无法恢复相册信息，但不会删除实际文件。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    deletingAlbums.value.add(path)

    const res = await window.db.deleteAlbum(path)
    if (res) {
      albums.value = await window.db.getAlbum()
      ElMessage.success('相册已删除')
    } else {
      ElMessage.error('相册删除失败')
    }
  } catch (error) {
    if (error === 'cancel') {
      return
    }
    console.error(error)
    ElMessage.error('删除目录失败')
  } finally {
    deletingAlbums.value.delete(path)
  }
}

const rescanAlbum = async (
  path: string,
  batchSize?: number,
  ignoreMd5: boolean = false
): Promise<void> => {
  if (scanningAlbums.value.has(path)) {
    ElMessage.warning('该相册正在扫描中，请稍后再试')
    return
  }
  if (batchSize !== undefined) {
    startScan(path, batchSize, ignoreMd5)
    return
  }

  scanForm.albumPath = path
  scanForm.batchSize = 5
  scanForm.ignoreMd5 = ignoreMd5
  showScanDialog.value = true
}

const confirmScan = (albumPath: string, batchSize: number, ignoreMd5: boolean): void => {
  startScan(albumPath, batchSize, ignoreMd5)
}

const startScan = async (
  path: string,
  batchSize: number,
  ignoreMd5: boolean = false
): Promise<void> => {
  try {
    scanningAlbums.value.add(path)

    ElMessage.info('开始扫描目录，根据相册大小可能需要较长时间')

    const success = await window.api.rescanAlbum(path, batchSize, ignoreMd5)

    if (!success) {
      ElMessage.error(`扫描目录 ${path} 失败`)
      return
    }
  } catch (error) {
    console.error('扫描出错:', error)

    if (error instanceof Error) {
      ElMessage.error(`扫描目录失败: ${error.message}`)
    } else {
      ElMessage.error(`扫描目录失败: ${error}`)
    }
  } finally {
    scanningAlbums.value.delete(path)
  }
}

const searchInAlbum = (query: string): void => {
  router.push({ path: '/search', query: { q: query } })
}

const editAlbum = (album: common.DtoAlbum): void => {
  editForm.id = album.id
  editForm.path = album.path
  editForm.name = album.name ?? ''
  editForm.description = album.description ?? ''
  editForm.watch = album.watch ?? true
  showEditDialog.value = true
}

const submitEditForm = async (formData: common.DtoAlbum): Promise<void> => {
  try {
    const res = await window.db.updateAlbum(Object.assign({}, formData))
    if (res) {
      albums.value = await window.db.getAlbum()
      ElMessage.success('相册修改成功')
      showEditDialog.value = false
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('修改相册失败')
  }
}

const openAlbumDir = (path: string): void => {
  window.api.openPath(path)
}
</script>
