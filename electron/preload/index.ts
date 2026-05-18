import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getTodayEntries: () => ipcRenderer.invoke('db:getTodayEntries'),
  getEntriesByDate: (date: string) => ipcRenderer.invoke('db:getEntriesByDate', date),
  createEntry: (content: string, tagIds: number[]) => ipcRenderer.invoke('db:createEntry', content, tagIds),
  updateEntry: (id: number, content: string) => ipcRenderer.invoke('db:updateEntry', id, content),
  deleteEntry: (id: number) => ipcRenderer.invoke('db:deleteEntry', id),
  setEntryTags: (entryId: number, tagIds: number[]) => ipcRenderer.invoke('db:setEntryTags', entryId, tagIds),
  getAllTags: () => ipcRenderer.invoke('db:getAllTags'),
  createTag: (name: string, color: string) => ipcRenderer.invoke('db:createTag', name, color),
  updateTag: (id: number, name: string, color: string) => ipcRenderer.invoke('db:updateTag', id, name, color),
  deleteTag: (id: number) => ipcRenderer.invoke('db:deleteTag', id),
  getDateRange: () => ipcRenderer.invoke('db:getDateRange'),
  getContributionData: (days?: number) => ipcRenderer.invoke('db:getContributionData', days ?? 365),
  getTagBreakdown: (start: string, end: string) => ipcRenderer.invoke('db:getTagBreakdown', start, end),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  setAlwaysOnTop: (value: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', value),
  setAutoHideOnBlur: (value: boolean) => ipcRenderer.invoke('window:setAutoHideOnBlur', value),
  getDbPath: () => ipcRenderer.invoke('db:getPath'),
  selectDbPath: () => ipcRenderer.invoke('db:selectPath'),
  setDbPath: (dir: string) => ipcRenderer.invoke('db:setPath', dir),
  onWindowShown: (cb: () => void) => {
    ipcRenderer.on('window-shown', cb)
    return () => ipcRenderer.removeListener('window-shown', cb)
  },

  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  onUpdateChecking: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('update:checking', handler)
    return () => ipcRenderer.removeListener('update:checking', handler)
  },
  onUpdateAvailable: (cb: (info: { version: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },
  onUpdateNotAvailable: (cb: (info: { version: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info)
    ipcRenderer.on('update:not-available', handler)
    return () => ipcRenderer.removeListener('update:not-available', handler)
  },
  onDownloadProgress: (cb: (progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => cb(progress)
    ipcRenderer.on('update:download-progress', handler)
    return () => ipcRenderer.removeListener('update:download-progress', handler)
  },
  onUpdateDownloaded: (cb: (info: { version: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info)
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },
  onUpdateError: (cb: (message: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, message: string) => cb(message)
    ipcRenderer.on('update:error', handler)
    return () => ipcRenderer.removeListener('update:error', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
