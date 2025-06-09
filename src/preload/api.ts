import { ipcRenderer, webUtils } from 'electron'
import { IpcChannel } from '../common/consts'
import * as common from '../common'

export default {
  request: <T>(
    url: string,
    options?: RequestInit
  ): Promise<{
    status: number
    data: T
  }> => {
    return ipcRenderer.invoke(IpcChannel.Request, url, options)
  },
  dialogOpenFile: (): Promise<string> => ipcRenderer.invoke(IpcChannel.DialogOpenFile),
  dialogOpenDirectory: (): Promise<string> => ipcRenderer.invoke(IpcChannel.DialogOpenDirectory),
  openPath: (path: string): Promise<void> => ipcRenderer.invoke(IpcChannel.OpenPath, path),
  showItemInFolder: (path: string): Promise<void> =>
    ipcRenderer.invoke(IpcChannel.ShowItemInFolder, path),
  onKonataggerStarted: (callback: (port: number) => void): void => {
    ipcRenderer.on(IpcChannel.KonataggerStarted, (_, port: number) => {
      callback(port)
    })
  },
  onMeilisearchStarted: (callback: (port: number) => void): void => {
    ipcRenderer.on(IpcChannel.MeilisearchStarted, (_, port: number) => {
      callback(port)
    })
  },
  getServiceStatus: (): Promise<{
    konatagger: { ready: boolean; port: number }
    meilisearch: { ready: boolean; port: number }
  }> => {
    return ipcRenderer.invoke(IpcChannel.GetServiceStatus)
  },
  getLocalFilePath: (file: File): string => {
    return webUtils.getPathForFile(file)
  },
  processFiles: (filePaths: string[]): Promise<common.KonataggerPredictResponse[]> => {
    return ipcRenderer.invoke(IpcChannel.ProcessFiles, filePaths)
  },
  processFile: (filePath: string): Promise<common.KonataggerPredictResponse> => {
    return ipcRenderer.invoke(IpcChannel.ProcessFile, filePath)
  },
  rescanAlbum: (
    path: string,
    batchSize: number = 5,
    ignoreMd5: boolean = false
  ): Promise<boolean> => {
    return ipcRenderer.invoke(IpcChannel.RescanAlbum, path, batchSize, ignoreMd5)
  },
  updateEmbedderSettings: (settings: common.EmbedderSettings): Promise<boolean> => {
    return ipcRenderer.invoke(IpcChannel.UpdateEmbedderSettings, settings)
  },
  getEmbedderSettings: (): Promise<common.EmbedderSettings> => {
    return ipcRenderer.invoke(IpcChannel.GetEmbedderSettings)
  },
  getAlbumScanningStatus: (path: string): Promise<boolean> => {
    return ipcRenderer.invoke(IpcChannel.GetAlbumScanningStatus, path)
  },
  searchPicture: (
    query: string,
    hitsPerPage: number,
    page: number,
    semanticRatio?: number,
    rankingScoreThreshold?: number
  ): Promise<{
    totalHits: number
    processingTimeMs: number
    pictures: common.DtoPicture[]
  }> => {
    return ipcRenderer.invoke(
      IpcChannel.SearchPicture,
      query,
      hitsPerPage,
      page,
      semanticRatio,
      rankingScoreThreshold
    )
  },
  startExistsDirWatcher: (): Promise<void> => {
    return ipcRenderer.invoke(IpcChannel.StartExistsDirWatcher)
  },
  addWatcher: (path: string): Promise<void> => {
    return ipcRenderer.invoke(IpcChannel.AddWatcher, path)
  },
  removeWatcher: (path: string): Promise<void> => {
    return ipcRenderer.invoke(IpcChannel.RemoveWatcher, path)
  }
}
