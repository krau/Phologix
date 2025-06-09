import { dialog, Notification, powerSaveBlocker } from 'electron'
import { promises as fs } from 'fs'
import { EmbedderSettings, KonataggerPredictResponse } from '../../common/types'
import { In } from 'typeorm'
import * as common from '../../common'
import * as dao from '../dao'
import * as service from '../service'
import { SearchResponse, SearchParams, OllamaEmbedder, RestEmbedder } from 'meilisearch'
import icon from '../../../resources/logo.png?asset'

export const dialogOpenFile = async (): Promise<string> => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: '图片', extensions: ['jpg', 'webp', 'avif', 'png', 'jpeg'] },
      { name: '所有', extensions: ['*'] }
    ]
  })
  if (canceled) return ''
  return filePaths[0]
}

export const dialogOpenDirectory = async (): Promise<string> => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (canceled) return ''
  return filePaths[0]
}

export const processFiles = async (
  filePaths: string[],
  port: number
): Promise<KonataggerPredictResponse[]> => {
  const url = `http://localhost:${port}/predict/batch`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(filePaths)
  })
  if (!resp.ok) {
    throw new Error(`Failed to process files: ${resp.statusText}`)
  }
  const data = await resp.json()
  if (!Array.isArray(data)) {
    throw new Error(`Invalid response format: ${JSON.stringify(data)}`)
  }
  return data as KonataggerPredictResponse[]
}

export const processFile = async (
  filePath: string,
  port: number
): Promise<KonataggerPredictResponse> => {
  const url = `http://localhost:${port}/predict`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file_path: filePath })
  })
  if (!resp.ok) {
    throw new Error(`Failed to process file: ${resp.statusText}`)
  }
  const data = await resp.json()
  return data as KonataggerPredictResponse
}

export const rescanAlbum = async (
  path: string,
  batchSize: number = 5,
  ignoreMd5: boolean = false
): Promise<boolean> => {
  let blocker: number | null = null
  try {
    blocker = powerSaveBlocker.start('prevent-app-suspension')

    if (service.isScanning(path)) {
      service.cancelScan(path)

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    await fs.access(path)

    console.log(`scanning: ${path}`)
    const result = await service.processDirectory(path, batchSize, ignoreMd5)
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: '目录扫描完成',
        icon,
        body: `目录 ${path} 扫描完成，总图片数: ${result.totalCount}，处理失败图片数: ${result.errorCount}`
      })
      notification.show()
    }
    return true
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`扫描目录失败 ${path}: ${errorMsg}`)
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: '目录扫描失败',
        icon,
        body: `目录 ${path} 扫描失败: ${errorMsg}`
      })
      notification.show()
    }

    if (service.isScanning(path)) {
      service.cancelScan(path)
    }

    return false
  } finally {
    if (blocker) {
      powerSaveBlocker.stop(blocker)
    }
  }
}

export const updateEmbedderSettings = async (settings: EmbedderSettings): Promise<boolean> => {
  const embedderSource = settings.source === 'openAi' ? 'rest' : (settings.source as 'ollama')
  let embedderSetting: RestEmbedder | OllamaEmbedder
  if (embedderSource === 'rest') {
    embedderSetting = {
      source: 'rest',
      url: settings.url,
      request: {
        input: ['{{text}}', '{{..}}'],
        model: settings.model
      },
      response: {
        data: [{ embedding: '{{embedding}}' }, '{{..}}']
      },
      apiKey: settings.apiKey,
      dimensions: settings.dimensions,
      documentTemplate: settings.documentTemplate,
      documentTemplateMaxBytes: settings.documentTemplateMaxBytes
    }
  } else {
    embedderSetting = {
      source: 'ollama',
      url: settings.url,
      apiKey: settings.apiKey,
      model: settings.model,
      documentTemplate: settings.documentTemplate,
      dimensions: settings.dimensions,
      documentTemplateMaxBytes: settings.documentTemplateMaxBytes
    }
  }
  try {
    await common.meilisearchClient.index('phologix').updateSettings({
      embedders: {
        default: embedderSetting
      }
    })
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export const getEmbedderSettings = async (): Promise<EmbedderSettings> => {
  const settings = await common.meilisearchClient.index('phologix').getSettings()
  const embedders = settings.embedders
  if (!embedders) {
    throw new Error('embedders not found')
  }
  const defaultEmbedder = embedders.default
  if (!defaultEmbedder) {
    throw new Error('default embedder not found')
  }
  switch (defaultEmbedder.source) {
    case 'rest':
      return {
        source: 'openAi',
        url: defaultEmbedder.url,
        model: defaultEmbedder.request.model,
        dimensions: defaultEmbedder.dimensions || 0,
        apiKey: defaultEmbedder.apiKey,
        documentTemplate: defaultEmbedder.documentTemplate,
        documentTemplateMaxBytes: defaultEmbedder.documentTemplateMaxBytes
      }
    default:
      return defaultEmbedder as EmbedderSettings
  }
}

export const startExistsDirWatcher = (): void => {
  dao.RepositoryAlbum.find({
    where: {
      watch: true
    }
  }).then((dirs) => {
    dirs.forEach((dir) => {
      service.watchDirectory(dir.path)
    })
  })
}

export const addWatcher = async (path: string): Promise<void> => {
  const album = await dao.RepositoryAlbum.findOne({
    where: { path }
  })
  if (!album) {
    throw new Error('album not found')
  }
  service.watchDirectory(album.path)
}

export const removeWatcher = async (path: string): Promise<void> => {
  service.destroyWatcher(path)
}

export const getAlbumScanningStatus = async (path: string): Promise<boolean> => {
  return service.isScanning(path)
}

export const searchPictures = async (
  query: string,
  hitsPerPage: number = 10,
  page: number = 1,
  semanticRatio: number = 0.8,
  rankingScoreThreshold: number = 0.95
): Promise<{
  totalHits: number
  processingTimeMs: number
  pictures: common.DtoPicture[]
}> => {
  if (query === '') {
    const pictures = await dao.RepositoryPicture.find({
      relations: ['tags'],
      skip: (page - 1) * hitsPerPage,
      take: hitsPerPage
    })
    const pictureCount = await dao.RepositoryPicture.count()
    return {
      totalHits: pictureCount,
      processingTimeMs: 0,
      pictures
    }
  }
  let results:
    | SearchResponse<Record<string, unknown>, SearchParams>
    | SearchResponse<
        Record<string, unknown>,
        { hitsPerPage: number; page: number; rankingScoreThreshold: number }
      >

  let totalHits = 0

  if (query.startsWith('$similar:')) {
    console.log('search similar pictures')
    const similarTargetMd5 = query.slice('$similar:'.length)
    const picture = await dao.RepositoryPicture.findOne({
      where: { md5: similarTargetMd5 }
    })
    if (!picture) {
      throw new Error('picture not found')
    }
    results = await common.meilisearchClient.index('phologix').searchSimilarDocuments({
      id: picture.md5,
      limit: hitsPerPage,
      offset: (page - 1) * hitsPerPage,
      rankingScoreThreshold,
      embedder: 'default'
    })
    totalHits = results.estimatedTotalHits
  } else if (semanticRatio === 0) {
    console.log('search by query')
    results = await common.meilisearchClient.index('phologix').search(query, {
      hitsPerPage,
      page,
      rankingScoreThreshold
    })
    totalHits = results.totalHits
  } else {
    console.log('search by hybrid')
    results = await common.meilisearchClient.index('phologix').search(query, {
      hitsPerPage,
      page,
      hybrid: {
        embedder: 'default',
        semanticRatio
      },
      rankingScoreThreshold
    })
    totalHits = results.totalHits
  }
  const pictureMd5s = results.hits.map((hit) => hit.md5)
  const pictures = await dao.RepositoryPicture.find({
    where: {
      md5: In(pictureMd5s)
    },
    relations: ['tags']
  })
  return {
    totalHits,
    processingTimeMs: results.processingTimeMs,
    pictures
  }
}
