import { ipcRenderer } from 'electron'
import { IpcChannel } from '../common/consts'
import * as common from '../common'

export default {
  getAlbum: (): Promise<common.DtoAlbum[]> => {
    return ipcRenderer.invoke(IpcChannel.GetAlbum)
  },
  addAlbum: (album: common.DtoAlbum): Promise<common.DtoAlbum> => {
    return ipcRenderer.invoke(IpcChannel.AddAlbum, album)
  },
  deleteAlbum: (path: string): Promise<boolean> => {
    return ipcRenderer.invoke(IpcChannel.DeleteAlbum, path)
  },
  getAlbumByPath: (path: string): Promise<common.DtoAlbum | null> => {
    return ipcRenderer.invoke(IpcChannel.GetAlbumByPath, path)
  },
  checkAlbumExist: (path: string): Promise<boolean> => {
    return ipcRenderer.invoke(IpcChannel.CheckAlbumExist, path)
  },
  getPicture: (limit: number = 10, offset: number = 0): Promise<common.DtoPicture[]> => {
    return ipcRenderer.invoke(IpcChannel.GetPicture, limit, offset)
  },
  getPictureById: (pictureId: number): Promise<common.DtoPicture> => {
    return ipcRenderer.invoke(IpcChannel.GetPictureById, pictureId)
  },
  updateAlbum: (album: common.DtoAlbum): Promise<common.DtoAlbum> => {
    return ipcRenderer.invoke(IpcChannel.UpdateAlbum, album)
  },
  countPictures: (): Promise<number> => {
    return ipcRenderer.invoke(IpcChannel.CountPictures)
  },
  updatePicture: (dto: Partial<common.DtoPicture>): Promise<common.DtoPicture> => {
    return ipcRenderer.invoke(IpcChannel.UpdatePicture, dto)
  }
}
