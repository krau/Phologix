export interface KonataggerPredictResponse {
  file_path: string
  predicted_tags: string[]
  scores: Record<string, number>
  error?: string
}

export interface ServiceStatus {
  konatagger: {
    ready: boolean
    port: number
  }
  meilisearch: {
    ready: boolean
    port: number
  }
}

export interface EmbedderSettings {
  source: string
  url: string
  model: string
  apiKey?: string
  dimensions: number
  documentTemplate?: string
  documentTemplateMaxBytes?: number
}

export interface DtoAlbum {
  id?: number
  path: string
  name?: string
  watch: boolean
  description?: string
}

export interface DtoPicture {
  id?: number
  filepath: string
  md5: string
  width: number
  height: number
  thumb_path?: string
  description?: string
  tags: DtoPictureTag[]
  album?: DtoAlbum
  updated_at?: Date
}

export interface DtoPictureTag {
  id?: number
  name: string
  translate?: string
}
