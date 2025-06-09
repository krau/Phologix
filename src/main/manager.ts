import { app, shell, BrowserWindow, Tray, Menu } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/logo.png?asset'

let tray: Tray

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1600,
    minHeight: 900,
    title: 'Phologix',
    icon: icon,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.setSkipTaskbar(false)
  })

  mainWindow.on('close', (event) => {
    if (!is.dev) {
      event.preventDefault()
      mainWindow.hide()
      mainWindow.setSkipTaskbar(true)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function createTray(mainWindow: BrowserWindow): Tray {
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: (): void => mainWindow.show()
    },
    {
      label: '退出',
      click: (): void => {
        mainWindow.removeAllListeners('close')
        app.quit()
      }
    }
  ])
  tray.setToolTip('Phologix')
  tray.on('right-click', (_, bounds) => {
    tray.popUpContextMenu(contextMenu, {
      x: bounds.x,
      y: bounds.y
    })
  })
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
      mainWindow.setSkipTaskbar(true)
    } else {
      mainWindow.show()
      mainWindow.setSkipTaskbar(false)
    }
  })
  return tray
}

function destroyTray(): void {
  if (tray) {
    tray.destroy()
  }
}

export default {
  createWindow,
  createTray,
  destroyTray
}
