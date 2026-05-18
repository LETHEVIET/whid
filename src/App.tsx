import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, X, Calendar, Settings as SettingsIcon } from 'lucide-react'
import { TrayPopover } from './components/TrayPopover'
import { EntryCard } from './components/EntryCard'
import { TagManager } from './components/TagManager'
import { Dashboard } from './components/Dashboard'
import { Settings } from './components/Settings'
import { useEntries } from './hooks/useEntries'
import { playDeleteSound, setSoundEnabled } from './utils/sounds'

type View = 'popover' | 'history' | 'tags' | 'dashboard' | 'settings'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Tag {
  id: number
  name: string
  color: string
}

export function FullView({
  entries,
  tags,
  loading,
  date,
  onDateChange,
  onEditEntry,
  onDeleteEntry,
  onSetEntryTags,
  onBack
}: {
  entries: { id: number; content: string; created_at: string; tags: Tag[] }[]
  tags: Tag[]
  loading: boolean
  date: string
  onDateChange: (date: string) => void
  onEditEntry: (id: number, content: string) => void
  onDeleteEntry: (id: number) => void
  onSetEntryTags: (entryId: number, tagIds: number[]) => void
  onBack: () => void
}) {
  const today = toDateStr(new Date())

  const goPrev = () => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    onDateChange(toDateStr(d))
  }

  const goNext = () => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    onDateChange(toDateStr(d))
  }

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="full-view">
      <div className="full-view-header">
        <button className="btn-text" onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <h2>History</h2>
        <div className="window-controls">
          <button className="win-btn" onClick={() => window.api.minimizeWindow()} title="Minimize"><Minus size={14} /></button>
          <button className="win-btn win-close" onClick={() => window.api.hideWindow()} title="Close"><X size={14} /></button>
        </div>
      </div>

      <div className="date-nav">
        <button className="btn-small btn-icon" onClick={goPrev} title="Previous day"><ChevronLeft size={14} /></button>
        <span className="date-label">{displayDate}</span>
        <button className="btn-small btn-icon" onClick={goNext} disabled={date >= today} title="Next day"><ChevronRight size={14} /></button>
      </div>

      <div className="entries-section">
        {loading ? (
          <div className="empty-state">Loading entries...</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <Calendar size={24} className="empty-state-icon" />
            <span>Nothing logged for this day.</span>
          </div>
        ) : (
          <div className="entries-list">
            {entries.map((entry, i) => (
              <EntryCard
                key={entry.id}
                index={i}
                entry={entry}
                allTags={tags}
                onEdit={onEditEntry}
                onDelete={onDeleteEntry}
                onSetEntryTags={onSetEntryTags}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function App() {
  const {
    entries,
    tags,
    loading,
    loadToday,
    addEntry,
    editEntry,
    removeEntry,
    updateEntryTags,
    addTag,
    editTag,
    removeTag
  } = useEntries()

  const [view, setView] = useState<View>('popover')

  useEffect(() => {
    loadToday()
    const cleanup = window.api.onWindowShown(() => {
      loadToday()
    })
    try {
      const raw = localStorage.getItem('whid_settings')
      if (raw) {
        const s = JSON.parse(raw)
        if (typeof s.alwaysOnTop === 'boolean') window.api.setAlwaysOnTop(s.alwaysOnTop)
        if (typeof s.autoHideOnBlur === 'boolean') window.api.setAutoHideOnBlur(s.autoHideOnBlur)
        if (typeof s.soundEnabled === 'boolean') setSoundEnabled(s.soundEnabled)
      }
    } catch { /* ignore */ }
    return cleanup
  }, [loadToday])
  const [historyDate, setHistoryDate] = useState(toDateStr(new Date()))
  const [historyEntries, setHistoryEntries] = useState(entries)

  const handleOpenDashboard = () => setView('dashboard')

  const handleOpenSettings = () => setView('settings')

  const handleOpenFull = () => {
    setView('history')
    const today = toDateStr(new Date())
    setHistoryDate(today)
    window.api.getEntriesByDate(today).then(setHistoryEntries)
  }

  const handleDateChange = async (date: string) => {
    setHistoryDate(date)
    const dayEntries = await window.api.getEntriesByDate(date)
    setHistoryEntries(dayEntries)
  }

  const handleDeleteInHistory = async (id: number) => {
    playDeleteSound()
    await window.api.deleteEntry(id)
    setHistoryEntries(prev => prev.filter(e => e.id !== id))
    loadToday()
  }

  const handleEditInHistory = async (id: number, content: string) => {
    await window.api.updateEntry(id, content)
    setHistoryEntries(prev => prev.map(e => e.id === id ? { ...e, content } : e))
  }

  const handleSetEntryTagsInHistory = async (entryId: number, tagIds: number[]) => {
    await window.api.setEntryTags(entryId, tagIds)
    const updated = await window.api.getEntriesByDate(historyDate)
    setHistoryEntries(updated)
  }

  if (view === 'dashboard') {
    return (
      <div className="popover">
        <div className="full-view-header">
          <button className="btn-text" onClick={() => setView('popover')}><ArrowLeft size={14} /> Back</button>
          <h2>Dashboard</h2>
          <div className="window-controls">
            <button className="win-btn" onClick={() => window.api.minimizeWindow()} title="Minimize"><Minus size={14} /></button>
            <button className="win-btn win-close" onClick={() => window.api.hideWindow()} title="Close"><X size={14} /></button>
          </div>
        </div>
        <Dashboard />
      </div>
    )
  }

  if (view === 'tags') {
    return (
      <div className="popover">
        <div className="full-view-header">
          <button className="btn-text" onClick={() => setView('popover')}><ArrowLeft size={14} /> Back</button>
          <div className="window-controls">
            <button className="win-btn" onClick={() => window.api.minimizeWindow()} title="Minimize"><Minus size={14} /></button>
            <button className="win-btn win-close" onClick={() => window.api.hideWindow()} title="Close"><X size={14} /></button>
          </div>
        </div>
        <TagManager tags={tags} onAdd={addTag} onEdit={editTag} onDelete={removeTag} />
      </div>
    )
  }

  if (view === 'settings') {
    return (
      <div className="popover">
        <div className="full-view-header">
          <button className="btn-text" onClick={() => setView('popover')}><ArrowLeft size={14} /> Back</button>
          <h2>Settings</h2>
          <div className="window-controls">
            <button className="win-btn" onClick={() => window.api.minimizeWindow()} title="Minimize"><Minus size={14} /></button>
            <button className="win-btn win-close" onClick={() => window.api.hideWindow()} title="Close"><X size={14} /></button>
          </div>
        </div>
        <Settings />
      </div>
    )
  }

  if (view === 'history') {
    return (
      <div className="popover">
        <FullView
          entries={historyEntries}
          tags={tags}
          loading={loading}
          date={historyDate}
          onDateChange={handleDateChange}
          onEditEntry={handleEditInHistory}
          onDeleteEntry={handleDeleteInHistory}
          onSetEntryTags={handleSetEntryTagsInHistory}
          onBack={() => setView('popover')}
        />
        <div className="popover-footer">
          <button className="btn-text" onClick={() => setView('tags')}>Manage Tags</button>
          <button className="btn-text" onClick={() => setView('dashboard')}>Dashboard</button>
          <button className="btn-text" onClick={handleOpenSettings}><SettingsIcon size={12} /> Settings</button>
        </div>
      </div>
    )
  }

  return (
    <TrayPopover
      entries={entries}
      tags={tags}
      loading={loading}
      onAddEntry={addEntry}
      onEditEntry={editEntry}
      onDeleteEntry={removeEntry}
      onSetEntryTags={updateEntryTags}
      onOpenFull={handleOpenFull}
      onOpenDashboard={handleOpenDashboard}
      onOpenSettings={handleOpenSettings}
    />
  )
}
