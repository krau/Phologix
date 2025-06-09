import { DtoAlbum, DtoPicture } from '../../common'
import * as dao from '../dao'
import path from 'path'
import * as service from '../service'

export const getAlbum = async (): Promise<DtoAlbum[]> => {
  const albums = await dao.RepositoryAlbum.find()
  return albums
}

export const addAlbum = async (album: DtoAlbum): Promise<DtoAlbum> => {
  if (await checkAlbumExist(album.path)) {
    throw new Error('Album already exists')
  }
  return await dao.RepositoryAlbum.save(album)
}

export const getAlbumByPath = async (path: string): Promise<DtoAlbum | null> => {
  const album = await dao.RepositoryAlbum.findOneBy({ path })
  return album
}

export const checkAlbumExist = async (albumPath: string): Promise<boolean> => {
  const normalizedPath = path.normalize(albumPath)

  const parts = normalizedPath.split(path.sep).filter(Boolean)
  let currentPath = ''

  for (let i = 0; i < parts.length; i++) {
    currentPath = i === 0 ? parts[i] + path.sep : path.join(currentPath, parts[i])

    const existingAlbum = await getAlbumByPath(currentPath)
    if (existingAlbum) {
      return true
    }
  }

  const allAlbums = await getAlbum()
  for (const album of allAlbums) {
    if (album.path.startsWith(normalizedPath + path.sep) || album.path === normalizedPath) {
      return true
    }
  }

  return false
}

export const getPicture = async (limit: number = 10, offset: number = 0): Promise<DtoPicture[]> => {
  const pics = await dao.RepositoryPicture.find({
    skip: offset,
    take: limit
  })
  return pics
}

export const getPictureById = async (pictureId: number): Promise<DtoPicture> => {
  const pic = await dao.RepositoryPicture.findOne({
    where: { id: pictureId }
  })
  if (!pic) {
    throw new Error('Picture not found')
  }
  return pic
}

export const deleteAlbum = async (path: string): Promise<boolean> => {
  if (service.isScanning(path)) {
    service.cancelScan(path)

    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (service.isScanning(path)) {
      service.cancelScan(path)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  service.destroyWatcher(path)

  return await dao.AppDBSource.transaction(async (transactionalEntityManager) => {
    const album = await transactionalEntityManager.findOne(dao.Album, {
      where: { path },
      relations: ['pictures']
    })
    if (!album) {
      console.log(`相册不存在: ${path}`)
      return false
    }

    if (album.pictures && album.pictures.length > 0) {
      const chunkSize = 10

      for (let i = 0; i < album.pictures.length; i += chunkSize) {
        const chunk = album.pictures.slice(i, i + chunkSize)
        await Promise.all(chunk.map((pic) => transactionalEntityManager.remove(pic)))
      }
    }

    await transactionalEntityManager.remove(album)
    return true
  })
}

export const updateAlbum = async (album: DtoAlbum): Promise<DtoAlbum> => {
  const albumEntity = await dao.RepositoryAlbum.findOneBy({ id: album.id })
  if (!albumEntity) {
    throw new Error('Album not found')
  }
  if (albumEntity.watch !== album.watch) {
    if (album.watch) {
      service.watchDirectory(album.path)
    } else {
      service.destroyWatcher(album.path)
    }
  }
  album.id = albumEntity.id
  return await dao.RepositoryAlbum.save(album)
}

export const countPictures = async (): Promise<number> => {
  const count = await dao.RepositoryPicture.count()
  return count
}

export const updatePicture = async (dto: Partial<DtoPicture>): Promise<DtoPicture> => {
  const pictureEntity = await dao.RepositoryPicture.findOne({
    where: { id: dto.id }
  })
  if (!pictureEntity) {
    throw new Error('Picture not found')
  }
  const tagEntities = await Promise.all(
    dto.tags?.map(async (tag) => {
      let tagEntity = await dao.RepositoryPictureTag.findOneBy({ name: tag.name })
      if (!tagEntity) {
        tagEntity = new dao.PictureTag()
        tagEntity.name = tag.name
        tagEntity = await dao.RepositoryPictureTag.save(tagEntity)
      }
      return tagEntity
    }) ?? pictureEntity.tags
  )

  const updatedPicture = await dao.RepositoryPicture.save({
    ...pictureEntity,
    ...dto,
    tags: tagEntities
  })

  await service.updateMeilisearchPicture(updatedPicture)

  return updatedPicture
}
