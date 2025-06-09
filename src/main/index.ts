import 'reflect-metadata'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import consts, { IpcChannel } from '../common/consts'
import manager from './manager'
import * as ipcHandler from './ipc-handler'
import {
  installKonatagger,
  startKonatagger,
  stopAll,
  cleanupTempFiles,
  installMeilisearch,
  startMeilisearch,
  installAndStartOllama
} from './installer'
import { AppDBSource } from './dao/db'
import * as common from '../common'
import { DtoPicture, EmbedderSettings } from '../common/types'
import url from 'node:url'
import { OllamaEmbedder } from 'meilisearch'

const serviceStatus = {
  konatagger: {
    ready: false,
    port: 0
  },
  meilisearch: {
    ready: false,
    port: 0
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('app.unv.phologix')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  protocol.handle('phologix-file', (request) => {
    const filePath = request.url.slice('phologix-file:///'.length)
    const fileurl = url.pathToFileURL(filePath).toString()
    return net.fetch(fileurl)
  })

  protocol.handle('phologix-picture-file-id', async (request) => {
    const pictureId = request.url.slice('phologix-picture-file-id:///'.length)
    const picture = await ipcHandler.getPictureById(parseInt(pictureId))
    const filePath = picture.filepath
    const fileurl = url.pathToFileURL(filePath).toString()
    return net.fetch(fileurl)
  })

  if (!AppDBSource.isInitialized) {
    await AppDBSource.initialize()
  }
  ///////////////////////////////////////////////////////////////////////
  // IPC HANDLERS
  ///////////////////////////////////////////////////////////////////////

  ipcMain.handle(IpcChannel.DialogOpenFile, ipcHandler.dialogOpenFile)
  ipcMain.handle(IpcChannel.DialogOpenDirectory, ipcHandler.dialogOpenDirectory)
  ipcMain.handle(IpcChannel.OpenPath, (_, path: string) => {
    shell.openPath(path)
  })
  ipcMain.handle(IpcChannel.ShowItemInFolder, (_, path: string) => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle(IpcChannel.ProcessFiles, (_, filePaths: string[]) => {
    return ipcHandler.processFiles(filePaths, consts.KONATAGGER_PORT)
  })
  ipcMain.handle(IpcChannel.ProcessFile, (_, filePath: string) => {
    return ipcHandler.processFile(filePath, consts.KONATAGGER_PORT)
  })
  ipcMain.handle(IpcChannel.Request, async (_, url: string, options: RequestInit) => {
    const resp = await net.fetch(url, options)
    return {
      status: resp.status,
      data: await resp.json()
    }
  })
  ipcMain.handle(IpcChannel.GetServiceStatus, () => serviceStatus)
  ipcMain.handle(IpcChannel.GetAlbum, ipcHandler.getAlbum)
  ipcMain.handle(IpcChannel.AddAlbum, (_, album: common.DtoAlbum) => {
    return ipcHandler.addAlbum(album)
  })
  ipcMain.handle(IpcChannel.GetPicture, (_, limit = 10, offset = 0) => {
    return ipcHandler.getPicture(limit, offset)
  })
  ipcMain.handle(IpcChannel.GetPictureById, (_, pictureId: number) => {
    return ipcHandler.getPictureById(pictureId)
  })
  ipcMain.handle(IpcChannel.DeleteAlbum, (_, path: string) => {
    return ipcHandler.deleteAlbum(path)
  })
  ipcMain.handle(
    IpcChannel.RescanAlbum,
    (_, path: string, batchSize: number = 5, ignoreMd5: boolean = false) => {
      return ipcHandler.rescanAlbum(path, batchSize, ignoreMd5)
    }
  )
  ipcMain.handle(IpcChannel.GetAlbumByPath, (_, path: string) => {
    return ipcHandler.getAlbumByPath(path)
  })
  ipcMain.handle(IpcChannel.CheckAlbumExist, (_, path: string) => {
    return ipcHandler.checkAlbumExist(path)
  })
  ipcMain.handle(IpcChannel.UpdateAlbum, (_, album: common.DtoAlbum) => {
    return ipcHandler.updateAlbum(album)
  })
  ipcMain.handle(IpcChannel.UpdateEmbedderSettings, (_, settings: EmbedderSettings) => {
    return ipcHandler.updateEmbedderSettings(settings)
  })
  ipcMain.handle(IpcChannel.GetEmbedderSettings, () => {
    return ipcHandler.getEmbedderSettings()
  })
  ipcMain.handle(
    IpcChannel.SearchPicture,
    (
      _,
      query: string,
      offset: number,
      limit: number,
      semanticRatio: number,
      rankingScoreThreshold: number
    ) => {
      return ipcHandler.searchPictures(query, offset, limit, semanticRatio, rankingScoreThreshold)
    }
  )
  ipcMain.handle(IpcChannel.StartExistsDirWatcher, () => {
    return ipcHandler.startExistsDirWatcher()
  })
  ipcMain.handle(IpcChannel.AddWatcher, (_, path: string) => {
    return ipcHandler.addWatcher(path)
  })
  ipcMain.handle(IpcChannel.RemoveWatcher, (_, path: string) => {
    return ipcHandler.removeWatcher(path)
  })
  ipcMain.handle(IpcChannel.GetAlbumScanningStatus, (_, path: string) => {
    return ipcHandler.getAlbumScanningStatus(path)
  })
  ipcMain.handle(IpcChannel.CountPictures, () => {
    return ipcHandler.countPictures()
  })
  ipcMain.handle(IpcChannel.UpdatePicture, (_, dto: Partial<DtoPicture>) => {
    return ipcHandler.updatePicture(dto)
  })
  ///////////////////////////////////////////////////////////////////////
  // END OF IPC HANDLERS
  ///////////////////////////////////////////////////////////////////////

  const mainWindow = manager.createWindow()
  manager.createTray(mainWindow)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) manager.createWindow()
  })

  const notifyServiceStarted = (channel: string, port: number): void => {
    if (mainWindow.webContents.isLoading()) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send(channel, port)
      })
    } else {
      mainWindow.webContents.send(channel, port)
    }
  }

  const startKonataggerService = async (): Promise<void> => {
    try {
      await installKonatagger()
      const port = await startKonatagger(consts.KONATAGGER_PORT)
      console.log(`Konatagger started on port ${port}`)

      serviceStatus.konatagger.ready = true
      serviceStatus.konatagger.port = port

      notifyServiceStarted(IpcChannel.KonataggerStarted, port)
    } catch (error: unknown) {
      console.error(
        'Failed to start Konatagger:',
        error instanceof Error ? error.message : String(error)
      )
      dialog.showErrorBox(
        'Failed to start Konatagger',
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  const startMeilisearchService = async (): Promise<void> => {
    try {
      await installMeilisearch()
      console.log('Meilisearch installed')
      await startMeilisearch()
      console.log(`Meilisearch started on port ${consts.MEILISEARCH_PORT}`)

      try {
        const settings = await common.meilisearchClient.index('phologix').getSettings()
        if (!settings.embedders?.default) {
          throw new Error('default embedder not found')
        }
        console.log(
          'meilisearch already configured with default embedder: ',
          settings.embedders.default.source
        )
      } catch {
        await common.meilisearchClient.index('phologix').updateSettings({
          embedders: {
            default: common.defaultEmbedderSettings as OllamaEmbedder
          }
        })
      }
      try {
        await common.meilisearchClient.index('phologix').updatePagination({
          maxTotalHits: 10000
        })
      } catch {
        console.warn('failed to update pagination maxTotalHits')
      }
      try {
        await common.meilisearchClient
          .index('phologix')
          .updateSearchableAttributes(['tags', 'description'])
      } catch {
        console.warn('failed to update searchable attributes')
      }

      serviceStatus.meilisearch.ready = true
      serviceStatus.meilisearch.port = consts.MEILISEARCH_PORT

      notifyServiceStarted(IpcChannel.MeilisearchStarted, consts.MEILISEARCH_PORT)
    } catch (error: unknown) {
      console.error(
        'Failed to start Meilisearch:',
        error instanceof Error ? error.message : String(error)
      )
      dialog.showErrorBox(
        'Failed to install Meilisearch',
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  const startOllamaService = async (): Promise<void> => {
    try {
      await installAndStartOllama()
    } catch (error: unknown) {
      console.error(
        'Failed to start Ollama:',
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  Promise.all([startKonataggerService(), startMeilisearchService(), startOllamaService()]).catch(
    (error) => {
      console.error('Error during services startup:', error)
      app.quit()
    }
  )
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  cleanupTempFiles()
  const success = await stopAll()
  if (!success) {
    console.log('Failed to stop all processes', 'Please close the application manually.')
  }
})
