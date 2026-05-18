import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, screen, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import * as db from './database'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let autoHideOnBlur = true

const WINDOW_WIDTH = 420
const WINDOW_HEIGHT = 460

function stateFile(): string {
  return path.join(app.getPath('userData'), 'window-state.json')
}

interface WindowState {
  x: number
  y: number
}

function loadState(): WindowState | null {
  try {
    const raw = fs.readFileSync(stateFile(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveState(state: WindowState): void {
  try {
    fs.mkdirSync(path.dirname(stateFile()), { recursive: true })
    fs.writeFileSync(stateFile(), JSON.stringify(state))
  } catch { /* best effort */ }
}

function isPositionValid(x: number, y: number): boolean {
  const displays = screen.getAllDisplays()
  return displays.some(d => {
    const bounds = d.workArea
    return (
      x >= bounds.x - WINDOW_WIDTH / 2 &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y - WINDOW_HEIGHT / 2 &&
      y <= bounds.y + bounds.height
    )
  })
}

function iconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'tray-icon.png')
    : path.join(__dirname, '../../build/tray-icon.png')
}

function createIcon(): Electron.NativeImage {
  const img = nativeImage.createFromPath(iconPath())
  if (!img.isEmpty()) return img
  const size = 24
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const d = Math.sqrt((x - size / 2 + 0.5) ** 2 + (y - size / 2 + 0.5) ** 2)
      if (d > size / 2 - 1) { buf[i + 3] = 0; continue }
      buf[i] = 0xeb; buf[i + 1] = 0x63; buf[i + 2] = 0x25; buf[i + 3] = 255
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size })
}

function windowIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'window-icon.png')
    : path.join(__dirname, '../../build/window-icon.png')
}

function createWindow(): void {
  const saved = loadState()
  let windowOpts: Electron.BrowserWindowConstructorOptions = {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: true,
    icon: windowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  }

  if (saved && isPositionValid(saved.x, saved.y)) {
    windowOpts.x = saved.x
    windowOpts.y = saved.y
  }

  mainWindow = new BrowserWindow(windowOpts)

  const url = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173'

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  } else {
    mainWindow.loadURL(url)
  }

  let moveTimer: NodeJS.Timeout | null = null
  mainWindow.on('move', () => {
    if (moveTimer) clearTimeout(moveTimer)
    moveTimer = setTimeout(() => {
      if (!mainWindow) return
      const [x, y] = mainWindow.getPosition()
      saveState({ x, y })
    }, 300)
  })

  mainWindow.on('blur', () => {
    if (autoHideOnBlur && mainWindow && !mainWindow.isFocused() && mainWindow.isVisible()) {
      mainWindow.hide()
    }
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray(): void {
  const icon = createIcon()
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => toggleWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('Whid')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => toggleWindow())
}

function toggleWindow(): void {
  if (!mainWindow) return

  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    const saved = loadState()
    if (saved && isPositionValid(saved.x, saved.y)) {
      mainWindow.setPosition(saved.x, saved.y)
    } else {
      const trayBounds = tray?.getBounds()
      if (trayBounds) {
        const x = Math.round(trayBounds.x + trayBounds.width / 2 - WINDOW_WIDTH / 2)
        const y = Math.round(trayBounds.y - WINDOW_HEIGHT)
        mainWindow.setPosition(x, y)
      }
    }
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('window-shown')
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('db:getTodayEntries', () => db.getTodayEntries())
  ipcMain.handle('db:getEntriesByDate', (_e, date: string) => db.getEntriesByDate(date))
  ipcMain.handle('db:createEntry', (_e, content: string, tagIds: number[]) => db.createEntry(content, tagIds))
  ipcMain.handle('db:updateEntry', (_e, id: number, content: string) => db.updateEntry(id, content))
  ipcMain.handle('db:deleteEntry', (_e, id: number) => db.deleteEntry(id))
  ipcMain.handle('db:setEntryTags', (_e, entryId: number, tagIds: number[]) => db.setEntryTags(entryId, tagIds))
  ipcMain.handle('db:getAllTags', () => db.getAllTags())
  ipcMain.handle('db:createTag', (_e, name: string, color: string) => db.createTag(name, color))
  ipcMain.handle('db:updateTag', (_e, id: number, name: string, color: string) => db.updateTag(id, name, color))
  ipcMain.handle('db:deleteTag', (_e, id: number) => db.deleteTag(id))
  ipcMain.handle('db:getDateRange', () => db.getDateRange())
  ipcMain.handle('db:getContributionData', (_e, days: number) => db.getContributionData(days))
  ipcMain.handle('db:getTagBreakdown', (_e, start: string, end: string) => db.getTagBreakdown(start, end))
  ipcMain.handle('window:hide', () => mainWindow?.hide())
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:setAlwaysOnTop', (_e, value: boolean) => {
    mainWindow?.setAlwaysOnTop(value)
  })
  ipcMain.handle('window:setAutoHideOnBlur', (_e, value: boolean) => {
    autoHideOnBlur = value
  })

  ipcMain.handle('db:getPath', () => db.getDbInfo())

  ipcMain.handle('db:selectPath', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose Data Folder'
    })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle('db:setPath', (_e, newDir: string) => {
    return db.setDbDir(newDir)
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createTray()
  createWindow()

  globalShortcut.register('CommandOrControl+Alt+L', () => {
    toggleWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
