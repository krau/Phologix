import { ElectronAPI } from '@electron-toolkit/preload'
import * as common from '../common'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      request: <T>(
        url: string,
        options?: RequestInit
      ) => Promise<{
        status: number
        data: T
      }>
      dialogOpenFile: () => Promise<string>
      dialogOpenDirectory: () => Promise<string>
      openPath: (path: string) => Promise<void>
      showItemInFolder: (path: string) => Promise<void>
      onKonataggerStarted: (callback: (port: number) => void) => void
      onMeilisearchStarted: (callback: (port: number) => void) => void
      getLocalFilePath: (file: File) => string
      processFiles: (filePaths: string[]) => Promise<common.KonataggerPredictResponse[]>
      getServiceStatus: () => Promise<common.ServiceStatus>
      rescanAlbum: (
        path: string,
        batchSize: number = 5,
        ignoreMd5: boolean = false
      ) => Promise<boolean>
      updateEmbedderSettings: (settings: common.EmbedderSettings) => Promise<boolean>
      getEmbedderSettings: () => Promise<common.EmbedderSettings>
      getAlbumScanningStatus: (path: string) => Promise<boolean>
      searchPicture: (
        query: string,
        hitsPerPage: number,
        page: number,
        semanticRatio: number,
        rankingScoreThreshold: number
      ) => Promise<{
        totalHits: number
        processingTimeMs: number
        pictures: common.DtoPicture[]
      }>
      startExistsDirWatcher: () => Promise<void>
      addWatcher: (path: string) => Promise<void>
      removeWatcher: (path: string) => Promise<void>
      processFile: (filePath: string) => Promise<common.KonataggerPredictResponse>
    }
    db: {
      getAlbum: () => Promise<common.DtoAlbum[]>
      addAlbum: (album: common.DtoAlbum) => Promise<common.DtoAlbum>
      deleteAlbum: (path: string) => Promise<boolean>
      getPicture: (limit: number, offset: number) => Promise<common.DtoPicture[]>
      getPictureById: (pictureId: number) => Promise<common.DtoPicture>
      getAlbumByPath: (path: string) => Promise<common.DtoAlbum | null>
      checkAlbumExist: (path: string) => Promise<boolean>
      updateAlbum: (album: common.DtoAlbum) => Promise<common.DtoAlbum>
      countPictures: () => Promise<number>
      updatePicture: (dto: Partial<common.DtoPicture>) => Promise<common.DtoPicture>
    }
  }
}
