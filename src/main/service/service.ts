import fs from 'fs/promises'
import { Dirent } from 'fs'
import path from 'path'
import * as dao from '../dao'
import fsSync from 'fs'
import { app } from 'electron'
import sharp from 'sharp'
import { is } from '@electron-toolkit/utils'
import * as common from '../../common'
import { In } from 'typeorm'

const thumbnailPath = is.dev
  ? path.join(app.getAppPath(), 'data/thumbnails')
  : path.join(app.getPath('userData'), 'thumbnails')

if (!fsSync.existsSync(thumbnailPath)) {
  fsSync.mkdirSync(thumbnailPath, { recursive: true })
}

const scanningPaths = new Set<string>()

export function addScanningPath(albumPath: string): void {
  scanningPaths.add(albumPath)
  console.log(`Added scanning task for: ${albumPath}, total tasks: ${scanningPaths.size}`)
}

export function isScanning(albumPath: string): boolean {
  return scanningPaths.has(albumPath)
}

export function cancelScan(albumPath: string): boolean {
  if (scanningPaths.has(albumPath)) {
    scanningPaths.delete(albumPath)
    console.log(`Cancelled scanning task for: ${albumPath}`)
    return true
  }
  return false
}

export async function processDirectory(
  directoryPath: string,
  batchSize: number = 5,
  ignoreMd5: boolean = false
): Promise<{ totalCount: number; errorCount: number }> {
  const result = await recursiveProcessDirectory(directoryPath, batchSize, ignoreMd5, 0, 0)
  return result
}

const recursiveProcessDirectory = async (
  directoryPath: string,
  batchSize: number,
  ignoreMd5: boolean,
  lastTotalCount: number,
  lastErrorCount: number,
  rootDir?: string,
  isRecursiveCall: boolean = false
): Promise<{ totalCount: number; errorCount: number }> => {
  const parentDir = rootDir || directoryPath

  if (!isRecursiveCall) {
    addScanningPath(parentDir)
  }

  try {
    let files: Dirent[] = []
    try {
      files = await fs.readdir(directoryPath, { withFileTypes: true })
    } catch (error: unknown) {
      console.error(`scan error: ${error instanceof Error ? error.message : String(error)}`)
      return { totalCount: lastTotalCount, errorCount: lastErrorCount }
    }
    const imagePaths: string[] = []
    const subDirectories: string[] = []

    for (const file of files) {
      if (!scanningPaths.has(parentDir)) {
        console.log(`scan canceled: ${parentDir}`)
        return { totalCount: lastTotalCount, errorCount: lastErrorCount }
      }

      const fullPath = path.join(directoryPath, file.name)

      if (file.isDirectory()) {
        subDirectories.push(fullPath)
      } else if (file.isFile()) {
        const extension = path.extname(file.name).toLowerCase()
        if (common.SUPPORTED_EXTENSIONS.includes(extension)) {
          imagePaths.push(fullPath)
        }
      }
    }

    const currentDirTotal = imagePaths.length
    let currentDirErrors = 0

    for (let i = 0; i < imagePaths.length; i += batchSize) {
      if (!scanningPaths.has(parentDir)) {
        return { totalCount: lastTotalCount, errorCount: lastErrorCount }
      }

      const batch = imagePaths.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (filePath) => {
          try {
            await processAndCreatePicture(filePath, parentDir, ignoreMd5)
          } catch (error: unknown) {
            console.error(
              `error while processing picture: ${error instanceof Error ? error.message : String(error)}`
            )
            currentDirErrors++
          }
        })
      )
    }

    let subDirTotal = 0
    let subDirErrors = 0

    for (const subDir of subDirectories) {
      if (!scanningPaths.has(parentDir)) {
        return { totalCount: lastTotalCount, errorCount: lastErrorCount }
      }

      const result = await recursiveProcessDirectory(
        subDir,
        batchSize,
        ignoreMd5,
        0,
        0,
        parentDir,
        true
      )
      subDirTotal += result.totalCount
      subDirErrors += result.errorCount
    }

    const totalCount = lastTotalCount + currentDirTotal + subDirTotal
    const errorCount = lastErrorCount + currentDirErrors + subDirErrors

    return { totalCount, errorCount }
  } finally {
    if (!isRecursiveCall) {
      scanningPaths.delete(parentDir)
    }
  }
}

export const processAndCreatePicture = async (
  filepath: string,
  albumPath: string,
  ignoreMd5: boolean = false
): Promise<dao.Picture> => {
  let picAlbumEntity: dao.Album | null | undefined
  let md5: string | undefined
  if (!ignoreMd5) {
    picAlbumEntity = await dao.RepositoryAlbum.findOneBy({
      path: albumPath
    })
    if (!picAlbumEntity) {
      throw new Error(`album ${albumPath} not found`)
    }
    md5 = await common.calculateFileMD5(filepath)
    const picture = await dao.RepositoryPicture.findOneBy({
      md5
    })
    if (picture) {
      return picture
    }
  }
  const picDb = await dao.RepositoryPicture.findOneBy({
    filepath
  })
  if (picDb) {
    return picDb
  }
  const res = await common.predictPictureFile(filepath, common.KONATAGGER_PORT)
  const tags = res.predicted_tags

  const tagEntitiesMap = new Map<string, dao.PictureTag>()

  const existingTags = await dao.RepositoryPictureTag.findBy({
    name: In(tags)
  })

  existingTags.forEach((tag) => {
    tagEntitiesMap.set(tag.name, tag)
  })

  const newTagEntities: dao.PictureTag[] = []
  for (const tag of tags) {
    if (!tagEntitiesMap.has(tag)) {
      const newTagEntity = new dao.PictureTag()
      newTagEntity.name = tag
      newTagEntities.push(newTagEntity)
      tagEntitiesMap.set(tag, newTagEntity)
    }
  }

  if (newTagEntities.length > 0) {
    try {
      const savedTags = await dao.RepositoryPictureTag.save(newTagEntities)
      savedTags.forEach((tag) => {
        tagEntitiesMap.set(tag.name, tag)
      })
    } catch (error: unknown) {
      console.error(`saving tags failed: ${error instanceof Error ? error.message : String(error)}`)
      for (const newTag of newTagEntities) {
        try {
          let tagEntity = await dao.RepositoryPictureTag.findOneBy({
            name: newTag.name
          })

          if (!tagEntity) {
            tagEntity = await dao.RepositoryPictureTag.save(newTag)
          }

          tagEntitiesMap.set(newTag.name, tagEntity)
        } catch (saveError) {
          const fallbackTag = await dao.RepositoryPictureTag.findOneBy({
            name: newTag.name
          })

          if (fallbackTag) {
            tagEntitiesMap.set(newTag.name, fallbackTag)
          } else {
            console.error(
              `Failed to save tag ${newTag.name}: ${saveError instanceof Error ? saveError.message : String(saveError)}`
            )
          }
        }
      }
    }
  }

  const tagEntities = tags.map((tag) => tagEntitiesMap.get(tag)).filter(Boolean) as dao.PictureTag[]

  const metadata = await sharp(filepath).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0
  if (width === 0 || height === 0) {
    throw new Error(`picture ${filepath} has invalid size`)
  }
  if (!picAlbumEntity) {
    picAlbumEntity = await dao.RepositoryAlbum.findOneBy({
      path: albumPath
    })
    if (!picAlbumEntity) {
      throw new Error(`album ${albumPath} not found`)
    }
  }
  if (!md5) {
    md5 = await common.calculateFileMD5(filepath)
  }
  const picThumbnailDir = path.join(thumbnailPath, md5.slice(0, 2))
  if (!fsSync.existsSync(picThumbnailDir)) {
    fsSync.mkdirSync(picThumbnailDir, { recursive: true })
  }
  const picThumbnailPath = path.join(picThumbnailDir, `${md5}.webp`)

  await sharp(filepath)
    .rotate()
    .resize(1280, 1280, { fit: 'inside' })
    .toFormat('webp')
    .toFile(picThumbnailPath)
  const pictureDb = new dao.Picture()
  pictureDb.filepath = filepath
  pictureDb.md5 = md5
  pictureDb.width = width
  pictureDb.height = height
  pictureDb.tags = tagEntities
  pictureDb.thumb_path = picThumbnailPath
  pictureDb.album = picAlbumEntity
  const savedPicture = await dao.RepositoryPicture.save(pictureDb)
  return savedPicture
}

export const updateMeilisearchPicture = async (picture: dao.Picture): Promise<void> => {
  await common.meilisearchClient.index('phologix').updateDocuments([
    {
      md5: picture.md5,
      tags: picture.tags.map((tag) => tag.name),
      description: picture.description
    }
  ])
}
