import fs from 'fs'
import axios from 'axios'
import path from 'path'
import konatagger_install_ps1 from '../../resources/bin/konatagger/install.ps1?asset&asarUnpack'
import konatagger_install_sh from '../../resources/bin/konatagger/install.sh?asset&asarUnpack'
import { ChildProcess, exec, spawn } from 'child_process'
import treeKill from 'tree-kill'
import { which } from 'shelljs'
import { is } from '@electron-toolkit/utils'
import { app } from 'electron'
import consts from '../common/consts'

const isWindows = process.platform === 'win32'
const shellCommand: string = isWindows
  ? which('powershell.exe')
    ? 'powershell.exe'
    : 'pwsh'
  : process.env.SHELL || '/bin/bash'

const scriptFile = shellCommand.includes('bash') ? konatagger_install_sh : konatagger_install_ps1

const normalizedScriptFile =
  isWindows && scriptFile === konatagger_install_sh ? scriptFile.replaceAll('\\', '/') : scriptFile

const isPowershell = shellCommand.toLowerCase().includes('powershell')

const konataggerPath = path
  .join(__dirname, '../../resources/bin/konatagger')
  .replace('app.asar', 'app.asar.unpacked')
const konataggerStandalonePath = path
  .join(__dirname, '../../resources/bin/konatagger-standalone')
  .replace('app.asar', 'app.asar.unpacked')

const pyPath = path.join(
  konataggerPath,
  '.venv',
  isWindows ? 'Scripts' : 'bin',
  isWindows ? 'python.exe' : 'python'
)

const meilisearchPath = path
  .join(__dirname, '../../resources/bin/meilisearch')
  .replace('app.asar', 'app.asar.unpacked')

const meilisearchGhApi = 'https://api.github.com/repos/meilisearch/meilisearch/releases/latest'
const githubRelease = 'https://github.com/meilisearch/meilisearch/releases/download/'
const meilisearchExeName = isWindows ? 'meilisearch.exe' : 'meilisearch'

const extraEnv =
  !isWindows && process.env.PATH ? { PATH: `/usr/local/bin:${process.env.PATH}` } : {}

const envs = { ...process.env, ...extraEnv }

const ollamaPath = path
  .join(__dirname, '../../resources/bin/ollama')
  .replace('app.asar', 'app.asar.unpacked')

class ProcessManager {
  private static instance: ProcessManager
  private processes: Map<string, ChildProcess> = new Map()
  private tempFiles: Set<string> = new Set()
  private isShuttingDown: boolean = false
  private killTimeout: number = 8000

  private constructor() {
    return
  }

  public static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager()
    }
    return ProcessManager.instance
  }

  public registerProcess(name: string, process: ChildProcess): void {
    this.killProcess(name)

    this.processes.set(name, process)
    console.log(`Process ${name} registered, PID: ${process.pid}`)

    process.once('exit', (code) => {
      console.log(`Process ${name} exited with code: ${code}`)
      if (this.processes.get(name) === process) {
        this.processes.delete(name)
      }
    })
  }

  public registerTempFile(filePath: string): void {
    this.tempFiles.add(filePath)
  }

  public unregisterTempFile(filePath: string): void {
    this.tempFiles.delete(filePath)
  }

  public killProcess(name: string): Promise<boolean> {
    const process = this.processes.get(name)
    if (!process || process.killed) {
      return Promise.resolve(true)
    }

    console.log(`Stopping process ${name}...`)

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.log(`Process ${name} termination timeout, using SIGKILL`)

        this.forceKillProcess(process, name)
          .then(() => resolve(true))
          .catch(() => resolve(false))
      }, this.killTimeout)

      this.gracefulKillProcess(process, name)
        .then(() => {
          clearTimeout(timeoutId)
          this.processes.delete(name)
          resolve(true)
        })
        .catch(() => {
          this.forceKillProcess(process, name)
            .then(() => {
              clearTimeout(timeoutId)
              this.processes.delete(name)
              resolve(true)
            })
            .catch(() => {
              clearTimeout(timeoutId)
              console.error(`Failed to terminate process ${name}, PID: ${process.pid}`)
              resolve(false)
            })
        })
    })
  }

  private gracefulKillProcess(process: ChildProcess, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!process.pid) {
        console.log(`Process ${name} has no valid PID`)
        return resolve()
      }

      treeKill(process.pid, 'SIGTERM', (err) => {
        if (err) {
          console.error(`Failed to terminate process ${name} with SIGTERM: ${err.message}`)
          reject(err)
        } else {
          console.log(`Process ${name} terminated gracefully`)
          resolve()
        }
      })
    })
  }

  private forceKillProcess(process: ChildProcess, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!process.pid) {
        return resolve()
      }

      treeKill(process.pid, 'SIGKILL', (err) => {
        if (err) {
          console.error(`Failed to force terminate process ${name} with SIGKILL: ${err.message}`)
          reject(err)
        } else {
          console.log(`Process ${name} force terminated`)
          resolve()
        }
      })
    })
  }
  public cleanupTempFiles(): void {
    for (const tempFile of this.tempFiles) {
      if (fs.existsSync(tempFile)) {
        console.log(`Cleaning temporary file: ${tempFile}`)
        try {
          fs.unlinkSync(tempFile)
        } catch (err: Error | unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          console.error(`Failed to clean temporary file: ${tempFile}, error: ${errorMessage}`)
        }
      }
    }
    this.tempFiles.clear()
  }

  public async stopAllProcesses(): Promise<boolean> {
    if (this.isShuttingDown) {
      return true
    }

    this.isShuttingDown = true
    console.log(`Starting to terminate all processes, total: ${this.processes.size}`)

    this.cleanupTempFiles()

    let allStopped = true

    const processNames = Array.from(this.processes.keys()).sort((a, b) => {
      if (a.includes('install') && !b.includes('install')) return 1
      if (!a.includes('install') && b.includes('install')) return -1
      return 0
    })

    const results = await Promise.all(
      processNames.map(async (name) => {
        const success = await this.killProcess(name)
        if (!success) {
          console.error(`Failed to terminate process: ${name}`)
          allStopped = false
        }
        return success
      })
    )

    this.isShuttingDown = false

    if (this.processes.size > 0) {
      console.warn(`Still have ${this.processes.size} processes not terminated`)
      allStopped = false
    }

    return allStopped && results.every(Boolean)
  }

  public getProcessList(): string[] {
    return Array.from(this.processes.keys())
  }
}

const processManager = ProcessManager.getInstance()

async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (percentage: number) => void
): Promise<void> {
  const tempPath = `${destPath}.downloading`

  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath)
  }

  const writer = fs.createWriteStream(tempPath)
  processManager.registerTempFile(tempPath)

  try {
    const response = await axios.get(url, {
      responseType: 'stream'
    })

    const totalLength = response.headers['content-length']
    let downloadedLength = 0

    response.data.pipe(writer)

    if (totalLength && onProgress) {
      response.data.on('data', (chunk: Buffer) => {
        downloadedLength += chunk.length
        const percentage = Math.round((downloadedLength / parseInt(totalLength)) * 100)
        onProgress(percentage)
      })
    }

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    fs.renameSync(tempPath, destPath)
    processManager.unregisterTempFile(tempPath)

    return
  } catch (err) {
    processManager.unregisterTempFile(tempPath)
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
    throw err
  }
}

async function downloadKonataggerModel(): Promise<void> {
  const modelPath = path.join(konataggerPath, 'models')
  if (!fs.existsSync(modelPath)) {
    fs.mkdirSync(modelPath, { recursive: true })
  }

  const modelUrl =
    process.env.KONATAGGER_MODEL_URL ||
    'https://huggingface.co/fancyfeast/joytag/resolve/main/model.safetensors?download=true'
  const modelFilePath = path.join(modelPath, 'model.safetensors')

  if (fs.existsSync(modelFilePath) && fs.statSync(modelFilePath).size > 0) {
    console.log(`Model file already exists: ${modelFilePath}`)
    return
  }

  console.log(`Starting to download model: ${modelUrl}`)

  try {
    await downloadFile(modelUrl, modelFilePath, (percentage) => {
      if (percentage % 10 === 0 && percentage !== 0) {
        console.log(`Model download progress: ${percentage}%`)
      }
    })

    console.log(`Model download completed: ${modelFilePath}`)
  } catch (err: Error | unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Model download failed: ${errorMessage}`)
    throw new Error(`Model download failed: ${errorMessage}`)
  }
}

export function installKonatagger(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isWindows && fs.existsSync(path.join(konataggerStandalonePath, 'api.exe'))) {
      resolve()
      console.log(`Konatagger standalone executable found: ${konataggerStandalonePath}`)
      return
    }

    if (!fs.existsSync(normalizedScriptFile)) {
      reject(new Error(`Installation script not found: ${normalizedScriptFile}`))
      return
    }

    const args = isPowershell
      ? ['-ExecutionPolicy', 'Bypass', '-File', normalizedScriptFile]
      : [normalizedScriptFile]
    console.log(`Executing command: ${shellCommand} ${args.join(' ')}`)

    const installProcess = spawn(shellCommand, args, {
      cwd: konataggerPath,
      env: envs,
      shell: shellCommand
    })

    processManager.registerProcess('installKonatagger', installProcess)

    installProcess.stderr.on('data', (data) => {
      console.error(`Installation error: ${data}`)
    })

    installProcess.stdout.on('data', (data) => {
      console.log(`Installation output: ${data}`)
    })

    installProcess.on('exit', (code) => {
      console.log(`Installation script exited with code: ${code}`)
      if (code !== 0) {
        reject(new Error(`Installation failed with code: ${code}`))
      } else {
        resolve()
      }
    })

    installProcess.on('error', (error) => {
      console.error(`Installation process error: ${error.message}`)
      reject(new Error(`Installation error: ${error.message}`))
    })
  })
}

export async function startKonatagger(port: number): Promise<number> {
  try {
    const useStandalone =
      !is.dev && isWindows && fs.existsSync(path.join(konataggerStandalonePath, 'api.exe'))
    let command = ''
    if (useStandalone) {
      command = `${path.join(konataggerStandalonePath, 'api.exe')} --port ${port}`
    } else {
      await downloadKonataggerModel()
      command = `${pyPath} ${path.join(konataggerPath, 'api.py')} --port ${port}`
    }

    return await new Promise<number>((resolve, reject) => {
      if (!fs.existsSync(pyPath) && !useStandalone) {
        reject(new Error(`Python interpreter not found: ${pyPath}`))
        return
      }

      const konataggerProcess = spawn(command, {
        cwd: useStandalone ? konataggerStandalonePath : konataggerPath,
        env: envs,
        shell: shellCommand
      })

      processManager.registerProcess('konatagger', konataggerProcess)

      let isReady = false

      konataggerProcess.stdout.on('data', (data) => {
        const message: string = data.toString().trim()
        console.log(`Konatagger: ${message}`)

        if (!isReady && message.includes('SERVER_READY')) {
          isReady = true
          resolve(port)
        }
      })

      konataggerProcess.stderr.on('data', (data) => {
        console.error(`Konatagger error: ${data}`)
      })

      konataggerProcess.on('error', (error) => {
        console.error(`Failed to start Konatagger: ${error.message}`)
        reject(new Error(`Failed to start Konatagger: ${error.message}`))
      })

      konataggerProcess.on('exit', (code) => {
        if (!isReady) {
          console.error(`Konatagger process exited abnormally with code: ${code}`)
          reject(new Error(`Konatagger process exited abnormally with code: ${code}`))
        }
      })

      setTimeout(() => {
        if (!isReady) {
          console.error('Konatagger startup timeout')
          reject(new Error('Konatagger startup timeout'))
        }
      }, 60000)
    })
  } catch (err: Error | unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Konatagger startup process error: ${errorMessage}`)
    throw new Error(`Konatagger startup process error: ${errorMessage}`)
  }
}

export async function installMeilisearch(): Promise<void> {
  if (!fs.existsSync(meilisearchPath)) {
    fs.mkdirSync(meilisearchPath, { recursive: true })
  }

  const meilisearchExecPath = path.join(meilisearchPath, meilisearchExeName)

  if (fs.existsSync(meilisearchExecPath) && fs.statSync(meilisearchExecPath).size > 0) {
    console.log(`Meilisearch executable already exists: ${meilisearchExecPath}`)
    return
  }

  try {
    console.log('Fetching latest Meilisearch release info...')
    const response = await axios.get(meilisearchGhApi)
    const latestVersion = response.data.tag_name
    console.log(`Latest Meilisearch version: ${latestVersion}`)

    let platform: string
    let arch: string = process.arch

    if (isWindows) {
      platform = 'windows'
      // meilisearch 只支持 amd64 windows
      arch = 'amd64'
    } else if (process.platform === 'darwin') {
      platform = 'macos'
      arch = arch === 'x64' ? 'amd64' : 'apple-silicon'
    } else {
      platform = 'linux'
      arch = arch === 'x64' ? 'amd64' : 'aarch64'
    }

    let fileName = `meilisearch-${platform}-${arch}`
    if (platform === 'windows') {
      fileName += '.exe'
    }

    const downloadUrl =
      process.env.MEILISEARCH_DOWNLOAD_URL || `${githubRelease}${latestVersion}/${fileName}`
    console.log(`Starting to download Meilisearch from: ${downloadUrl}`)

    await downloadFile(downloadUrl, meilisearchExecPath)

    if (!isWindows) {
      fs.chmodSync(meilisearchExecPath, 0o755)
    }

    console.log(`Meilisearch download completed: ${meilisearchExecPath}`)
  } catch (err: Error | unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`Meilisearch installation failed: ${errorMessage}`)
    throw new Error(`Meilisearch installation failed: ${errorMessage}`)
  }
}

export async function startMeilisearch(): Promise<void> {
  const meilisearchExecPath = path.join(meilisearchPath, meilisearchExeName)

  if (!fs.existsSync(meilisearchExecPath)) {
    throw new Error(`Meilisearch executable not found: ${meilisearchExecPath}`)
  }
  const args = [
    '--db-path',
    is.dev
      ? path.join(app.getAppPath(), 'data/meilisearch')
      : path.join(app.getPath('userData'), 'meilisearch'),
    '--env',
    'development',
    '--http-addr',
    `localhost:${consts.MEILISEARCH_PORT}`
  ]

  return await new Promise<void>((resolve, reject) => {
    console.log(`Starting Meilisearch: ${meilisearchExecPath}`)

    const meilisearchProcess = spawn(meilisearchExecPath, args, {
      cwd: meilisearchPath
    })

    processManager.registerProcess('meilisearch', meilisearchProcess)

    let isReady = false

    const checkReady = (message: string): void => {
      if (!isReady && (message.includes('Server listening on') || message.includes('Ready'))) {
        isReady = true
        console.log('Meilisearch started successfully')
        resolve()
      }
    }

    meilisearchProcess.stdout.on('data', (data) => {
      const message: string = data.toString().trim()
      console.log(`Meilisearch: ${message}`)
      checkReady(message)
    })

    meilisearchProcess.stderr.on('data', (data) => {
      const message: string = data.toString().trim()
      console.error(`Meilisearch error: ${message}`)
      checkReady(message)
    })

    meilisearchProcess.on('error', (error) => {
      console.error(`Failed to start Meilisearch: ${error.message}`)
      reject(new Error(`Failed to start Meilisearch: ${error.message}`))
    })

    meilisearchProcess.on('exit', (code) => {
      if (!isReady) {
        console.error(`Meilisearch process exited abnormally with code: ${code}`)
        reject(new Error(`Meilisearch process exited abnormally with code: ${code}`))
      }
    })

    setTimeout(() => {
      if (!isReady) {
        console.error('Meilisearch startup timeout')
        reject(new Error('Meilisearch startup timeout'))
      }
    }, 30000)
  })
}

export async function installAndStartOllama(): Promise<void> {
  const ollamaExecPath = path.join(ollamaPath, 'ollama.exe')
  if (!fs.existsSync(ollamaExecPath)) {
    return
  }
  if (which('ollama')) {
    return
  }

  const bgeModelPath = path.join(ollamaPath, 'Modelfile')
  exec(`${ollamaExecPath} create bge-m3 -f ${bgeModelPath}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Failed to create bge-m3 model: ${err.message}`)
      throw new Error(`Failed to create bge-m3 model: ${err.message}`)
    }
    console.log(`ollama stdout: ${stdout}`)
    console.log(`ollama stderr: ${stderr}`)
  })
  const ollamaProcess = spawn(ollamaExecPath, ['start'], {
    cwd: ollamaPath
  })
  processManager.registerProcess('ollama', ollamaProcess)
  ollamaProcess.stdout.on('data', (data) => {
    console.log(`Ollama: ${data}`)
  })
  ollamaProcess.stderr.on('data', (data) => {
    console.error(`Ollama error: ${data}`)
  })
  ollamaProcess.on('error', (error) => {
    console.error(`Failed to start Ollama: ${error.message}`)
    throw new Error(`Failed to start Ollama: ${error.message}`)
  })
  ollamaProcess.on('exit', (code) => {
    console.log(`Ollama exited with code: ${code}`)
  })
}

export function cleanupTempFiles(): void {
  processManager.cleanupTempFiles()
}

export async function stopAll(): Promise<boolean> {
  return await processManager.stopAllProcesses()
}

export function getRunningProcesses(): string[] {
  return processManager.getProcessList()
}
