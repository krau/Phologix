import { MeiliSearch } from 'meilisearch'
import consts from './consts'
import { KonataggerPredictResponse } from './types'
import { net } from 'electron'

export const meilisearchClient = new MeiliSearch({
  host: `http://localhost:${consts.MEILISEARCH_PORT}`
})

export const predictPictureFile = async (
  filePath: string,
  port: number
): Promise<KonataggerPredictResponse> => {
  const url = `http://localhost:${port}/predict`
  const resp = await net.fetch(url, {
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
