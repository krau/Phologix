import { app } from 'electron'
import path from 'path'
import { DataSource } from 'typeorm'
import { Picture, PictureTag, Album } from './entity'
import { is } from '@electron-toolkit/utils'
const userDataPath = app.getPath('userData')
const database = is.dev ? 'data/devdata.sqlite' : path.join(userDataPath, 'database.sqlite')

export const AppDBSource = new DataSource({
  type: 'better-sqlite3',
  database: database,
  entities: [Picture, PictureTag, Album],
  synchronize: true
})

export const RepositoryAlbum = AppDBSource.getRepository(Album)
export const RepositoryPicture = AppDBSource.getRepository(Picture)
export const RepositoryPictureTag = AppDBSource.getRepository(PictureTag)
