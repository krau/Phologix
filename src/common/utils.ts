import { md5 } from 'js-md5'
import fs from 'fs/promises'
import { createReadStream } from 'fs'

const FILE_SIZE_LIMIT = 1024 * 1024 * 10

export async function calculateFileMD5(filePath: string, fileSize?: number): Promise<string> {
  if (!fileSize || fileSize < FILE_SIZE_LIMIT) {
    const fileBuffer = await fs.readFile(filePath)
    return md5(fileBuffer)
  }
  const fileStream = createReadStream(filePath, {
    autoClose: true,
    highWaterMark: 1024 * 1024
  })
  return await calculateMD5Stream(fileStream)
}

const calculateMD5Stream = async (stream: NodeJS.ReadableStream): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = md5.create()
    stream.on('data', (chunk) => {
      hash.update(chunk)
    })
    stream.on('end', () => {
      resolve(hash.hex())
    })
    stream.on('error', (err) => {
      reject(err)
    })
  })
}
