/// <reference types="vite/client" />

interface Tag {
  id: number
  name: string
  color: string
}

interface DayCount {
  date: string
  count: number
}

interface TagDayCount {
  date: string
  tag_id: number | null
  tag_name: string | null
  tag_color: string | null
  count: number
}

interface Entry {
  id: number
  content: string
  created_at: string
  updated_at: string
  tags: Tag[]
}

interface Api {
  getTodayEntries: () => Promise<Entry[]>
  getEntriesByDate: (date: string) => Promise<Entry[]>
  createEntry: (content: string, tagIds: number[]) => Promise<Entry>
  updateEntry: (id: number, content: string) => Promise<void>
  deleteEntry: (id: number) => Promise<void>
  setEntryTags: (entryId: number, tagIds: number[]) => Promise<void>
  getAllTags: () => Promise<Tag[]>
  createTag: (name: string, color: string) => Promise<Tag>
  updateTag: (id: number, name: string, color: string) => Promise<void>
  deleteTag: (id: number) => Promise<void>
  getDateRange: () => Promise<string[]>
  getContributionData: (days?: number) => Promise<DayCount[]>
  getTagBreakdown: (start: string, end: string) => Promise<TagDayCount[]>
  hideWindow: () => Promise<void>
  minimizeWindow: () => Promise<void>
  setAlwaysOnTop: (value: boolean) => Promise<void>
  setAutoHideOnBlur: (value: boolean) => Promise<void>
  getDbPath: () => Promise<{ dir: string; file: string }>
  selectDbPath: () => Promise<string | null>
  setDbPath: (dir: string) => Promise<{ dir: string; file: string } | null>
  onWindowShown: (cb: () => void) => () => void
}

declare global {
  interface Window {
    api: Api
  }
}

export type { Entry, Tag, Api }
