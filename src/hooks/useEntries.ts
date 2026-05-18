import { useState, useEffect, useCallback } from 'react'

interface Tag {
  id: number
  name: string
  color: string
}

interface Entry {
  id: number
  content: string
  created_at: string
  updated_at: string
  tags: Tag[]
}

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  const loadToday = useCallback(async () => {
    const [todayEntries, allTags] = await Promise.all([
      window.api.getTodayEntries(),
      window.api.getAllTags()
    ])
    setEntries(todayEntries)
    setTags(allTags)
    setLoading(false)
  }, [])

  const loadByDate = useCallback(async (date: string) => {
    setLoading(true)
    const [dayEntries, allTags] = await Promise.all([
      window.api.getEntriesByDate(date),
      window.api.getAllTags()
    ])
    setEntries(dayEntries)
    setTags(allTags)
    setLoading(false)
  }, [])

  const addEntry = useCallback(async (content: string, tagIds: number[]) => {
    await window.api.createEntry(content, tagIds)
    await loadToday()
  }, [loadToday])

  const editEntry = useCallback(async (id: number, content: string) => {
    await window.api.updateEntry(id, content)
    await loadToday()
  }, [loadToday])

  const removeEntry = useCallback(async (id: number) => {
    await window.api.deleteEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const updateEntryTags = useCallback(async (id: number, tagIds: number[]) => {
    await window.api.setEntryTags(id, tagIds)
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e
      return { ...e, tags: tags.filter(t => tagIds.includes(t.id)) }
    }))
  }, [tags])

  const addTag = useCallback(async (name: string, color: string) => {
    const tag = await window.api.createTag(name, color)
    setTags(prev => [...prev.filter(t => t.id !== tag.id), tag])
    return tag
  }, [])

  const editTag = useCallback(async (id: number, name: string, color: string) => {
    await window.api.updateTag(id, name, color)
    setTags(prev => prev.map(t => t.id === id ? { ...t, name, color } : t))
  }, [])

  const removeTag = useCallback(async (id: number) => {
    await window.api.deleteTag(id)
    setTags(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    entries,
    tags,
    loading,
    loadToday,
    loadByDate,
    addEntry,
    editEntry,
    removeEntry,
    updateEntryTags,
    addTag,
    editTag,
    removeTag
  }
}
