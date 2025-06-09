export enum IpcChannel {
  Request = 'request',
  DialogOpenFile = 'dialog:open-file',
  DialogOpenDirectory = 'dialog:open-directory',
  OpenPath = 'open-path',
  ShowItemInFolder = 'show-item-in-folder',
  KonataggerStarted = 'konatagger:started',
  ProcessFiles = 'process-files',
  ProcessFile = 'process-file',
  MeilisearchStarted = 'meilisearch:started',
  GetServiceStatus = 'get-service-status',
  GetAlbum = 'get-album',
  AddAlbum = 'add-album',
  DeleteAlbum = 'delete-album',
  GetAlbumByPath = 'get-album-by-path',
  CheckAlbumExist = 'check-album-exist',
  RescanAlbum = 'rescan-album',
  GetPicture = 'get-picture',
  GetPictureById = 'get-picture-by-id',
  UpdateEmbedderSettings = 'update-embedder-settings',
  GetEmbedderSettings = 'get-embedder-settings',
  SearchPicture = 'search-picture',
  StartExistsDirWatcher = 'start-exists-dir-watcher',
  AddWatcher = 'add-watcher',
  RemoveWatcher = 'remove-watcher',
  UpdateAlbum = 'update-album',
  GetAlbumScanningStatus = 'get-album-scanning-status',
  CountPictures = 'count-pictures',
  UpdatePicture = 'update-picture'
}

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif']

export const KONATAGGER_PORT = 39070
export const MEILISEARCH_PORT = 39071

export const defaultEmbedderSettings = {
  source: 'ollama',
  url: 'http://localhost:11434/api/embed',
  model: 'bge-m3',
  dimensions: 1024,
  apiKey: '',
  documentTemplate: `A picture with tags {{doc.tags}} {% if doc.description %} and description {{doc.description}} {% endif %}`,
  documentTemplateMaxBytes: 2000
}

export default {
  IpcChannel,
  SUPPORTED_EXTENSIONS,
  KONATAGGER_PORT,
  MEILISEARCH_PORT,
  defaultEmbedderSettings
}
