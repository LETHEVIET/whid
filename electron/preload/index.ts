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
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
