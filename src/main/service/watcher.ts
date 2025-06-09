import chokidar from 'chokidar'
import { FSWatcher } from 'chokidar'
import path from 'path'
import { SUPPORTED_EXTENSIONS } from '../../common/consts'
import * as dao from '../dao'
import { processAndCreatePicture } from './service'
const watcherMap = new Map<string, FSWatcher>()

export function watchDirectory(directory: string): void {
  if (watcherMap.has(directory)) {
    return
  }
  const watcher = chokidar.watch(directory, {
    awaitWriteFinish: true,
    atomic: true,
    ignoreInitial: true,
    ignored: (filepath, stats) => {
      if (stats?.isFile()) {
        const extension = path.extname(filepath).toLowerCase()
        return !SUPPORTED_EXTENSIONS.includes(extension)
      }
      return false
    }
  })
  watcherMap.set(directory, watcher)

  watcher.on('add', async (filepath) => {
    console.log(`add: ${filepath}`)
    const picture = await dao.RepositoryPicture.findOneBy({ filepath })
    if (picture) {
      return
    }
    await processAndCreatePicture(filepath, directory)
  })

  watcher.on('unlink', async (filepath) => {
    console.log(`unlink: ${filepath}`)
    const picture = await dao.RepositoryPicture.findOneBy({ filepath })
    if (picture) {
      await dao.RepositoryPicture.remove(picture)
    }
  })
  console.log(`start watcher: ${directory}`)
}

export function destroyWatcher(directory: string): void {
  const watcher = watcherMap.get(directory)
  if (watcher) {
    watcher.close()
    watcherMap.delete(directory)
    console.log(`close watcher: ${directory}`)
  }
}

export function destroyAllWatchers(): void {
  watcherMap.forEach((watcher, directory) => {
    watcher.close()
    watcherMap.delete(directory)
  })
}
