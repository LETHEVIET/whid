import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, X, Calendar, Settings as SettingsIcon, RotateCw } from 'lucide-react'
import { TrayPopover } from './components/TrayPopover'
import { EntryCard } from './components/EntryCard'
import { TagManager } from './components/TagManager'
import { Dashboard } from './components/Dashboard'
import { Settings, type UpdateStatus } from './components/Settings'
import { useEntries } from './hooks/useEntries'
import { playDeleteSound, setSoundEnabled } from './utils/sounds'

type View = 'popover' | 'history' | 'tags' | 'dashboard' | 'settings' | 'help'

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { goPrev(); e.preventDefault() }
    if (e.key === 'ArrowRight') { goNext(); e.preventDefault() }
    if (e.key === 'Escape') { onBack(); e.preventDefault() }
  }

  return (
    <div className="full-view" onKeyDown={handleKeyDown}>
      <div className="full-view-header">
        <button className="btn-text" onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <h2>History</h2>
        <div className="window-controls">
          <button className="win-btn" onClick={() => window.api.minimizeWindow()} title="Minimize"><Minus size={14} /></button>
          <button className="win-btn win-close" onClick={() => window.api.hideWindow()} title="Close"><X size={14} /></button>
        </div>
      </div>

      <div className="date-nav">
        <button className="btn-small btn-icon" onClick={goPrev} title="Previous day (←)"><ChevronLeft size={14} /></button>
        <span className="date-label">{displayDate}</span>
        <button className="btn-small btn-icon" onClick={goNext} disabled={date >= today} title="Next day (→)"><ChevronRight size={14} /></button>
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
          <div className="entries-list" role="list">
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
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ type: 'idle' })

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    if (isInput) return

    if (e.key === 'Escape') {
      setView(prev => prev !== 'popover' ? 'popover' : prev)
      e.preventDefault()
      return
    }

    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); setView('history'); const t = toDateStr(new Date()); setHistoryDate(t); window.api.getEntriesByDate(t).then(setHistoryEntries); return }
    if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setView('dashboard'); return }
    if (e.key === 's' || e.key === 'S') { e.preventDefault(); setView('settings'); return }
    if (e.key === 't' || e.key === 'T') { e.preventDefault(); setView('tags'); return }
    if (e.key === '?' || e.key === '/') { e.preventDefault(); setView('help'); return }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleGlobalKeyDown])

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
        if (s.theme === 'light' || s.theme === 'dark' || s.theme === 'system') {
          const isDark = s.theme === 'dark' || (s.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
          document.documentElement.classList.toggle('dark', isDark)
        } else if (typeof s.darkMode === 'boolean') {
          document.documentElement.classList.toggle('dark', s.darkMode)
        }
      }
    } catch { /* ignore */ }

    const cleanChecking = window.api.onUpdateChecking(() => setUpdateStatus({ type: 'checking' }))
    const cleanAvailable = window.api.onUpdateAvailable((info) => setUpdateStatus({ type: 'available', version: info.version }))
    const cleanNotAvailable = window.api.onUpdateNotAvailable(() => setUpdateStatus({ type: 'not-available' }))
    const cleanProgress = window.api.onDownloadProgress((p) => setUpdateStatus({ type: 'downloading', percent: p.percent }))
    const cleanDownloaded = window.api.onUpdateDownloaded((info) => setUpdateStatus({ type: 'downloaded', version: info.version }))
    const cleanError = window.api.onUpdateError((message) => setUpdateStatus({ type: 'error', message }))

    return () => {
      cleanup()
      cleanChecking()
      cleanAvailable()
      cleanNotAvailable()
      cleanProgress()
      cleanDownloaded()
      cleanError()
    }
  }, [loadToday])

  const handleCheckForUpdates = useCallback(() => {
    setUpdateStatus({ type: 'checking' })
    window.api.checkForUpdates()
  }, [])

  const handleDownloadUpdate = useCallback(() => {
    window.api.downloadUpdate()
  }, [])

  const handleInstallUpdate = useCallback(() => {
    window.api.installUpdate()
  }, [])

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
        <div className="popover-footer">
          <button className="btn-text" onClick={() => setView('popover')}>Home <kbd>H</kbd></button>
          <button className="btn-text" onClick={() => setView('tags')}>Tags <kbd>T</kbd></button>
          <button className="btn-text" onClick={handleOpenSettings}><SettingsIcon size={12} /> Settings <kbd>S</kbd></button>
        </div>
      </div>
    )
  }

  if (view === 'tags') {
    return (
      <div className="popover">
        <div className="full-view-header">
          <button className="btn-text" onClick={() => setView('popover')}><ArrowLeft size={14} /> Back</button>
          <h2>Tags</h2>
          <div className="window-controls">
            <button className="win-btn" onClick={() => window.api.minimizeWindow()} title="Minimize"><Minus size={14} /></button>
            <button className="win-btn win-close" onClick={() => window.api.hideWindow()} title="Close"><X size={14} /></button>
          </div>
        </div>
        <TagManager tags={tags} onAdd={addTag} onEdit={editTag} onDelete={removeTag} />
        <div className="popover-footer">
          <button className="btn-text" onClick={() => setView('popover')}>Home <kbd>H</kbd></button>
          <button className="btn-text" onClick={() => setView('dashboard')}>Dashboard <kbd>D</kbd></button>
          <button className="btn-text" onClick={handleOpenSettings}><SettingsIcon size={12} /> Settings <kbd>S</kbd></button>
        </div>
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
        <Settings
          updateStatus={updateStatus}
          onCheckForUpdates={handleCheckForUpdates}
          onDownloadUpdate={handleDownloadUpdate}
          onInstallUpdate={handleInstallUpdate}
        />
        <div className="popover-footer">
          <button className="btn-text" onClick={() => setView('popover')}>Home <kbd>H</kbd></button>
          <button className="btn-text" onClick={() => setView('dashboard')}>Dashboard <kbd>D</kbd></button>
          <button className="btn-text" onClick={() => setView('tags')}>Tags <kbd>T</kbd></button>
        </div>
      </div>
    )
  }

  if (view === 'help') {
    return (
      <div className="popover">
        <div className="full-view-header">
          <button className="btn-text" onClick={() => setView('popover')}><ArrowLeft size={14} /> Back</button>
          <h2>Keyboard Shortcuts</h2>
          <div className="window-controls">
            <button className="win-btn" onClick={() => window.api.minimizeWindow()} title="Minimize"><Minus size={14} /></button>
            <button className="win-btn win-close" onClick={() => window.api.hideWindow()} title="Close"><X size={14} /></button>
          </div>
        </div>
        <div className="help-screen">
          <div className="help-section">
            <span className="help-section-title">Navigation</span>
            <div className="help-rows">
              <div className="help-row"><kbd>H</kbd> Home / Popover view</div>
              <div className="help-row"><kbd>D</kbd> Dashboard</div>
              <div className="help-row"><kbd>T</kbd> Tags</div>
              <div className="help-row"><kbd>S</kbd> Settings</div>
              <div className="help-row"><kbd>?</kbd> This help screen</div>
              <div className="help-row"><kbd>Esc</kbd> Back to previous view / Close window</div>
            </div>
          </div>
          <div className="help-section">
            <span className="help-section-title">Main Popover</span>
            <div className="help-rows">
              <div className="help-row"><kbd>Enter</kbd> Log entry</div>
              <div className="help-row"><kbd>Tab</kbd> Move through tags & entries</div>
              <div className="help-row"><kbd>←</kbd> <kbd>→</kbd> Navigate between tag chips</div>
            </div>
          </div>
          <div className="help-section">
            <span className="help-section-title">Entry Cards</span>
            <div className="help-rows">
              <div className="help-row"><kbd>Tab</kbd> Focus next entry</div>
              <div className="help-row"><kbd>Enter</kbd> Edit entry text</div>
              <div className="help-row"><kbd>Del</kbd> / <kbd>Backspace</kbd> Delete entry</div>
              <div className="help-row"><kbd>M</kbd> Open context menu (copy, tags, delete)</div>
              <div className="help-row"><kbd>Esc</kbd> Cancel editing</div>
            </div>
          </div>
          <div className="help-section">
            <span className="help-section-title">History</span>
            <div className="help-rows">
              <div className="help-row"><kbd>←</kbd> <kbd>→</kbd> Previous / Next day</div>
              <div className="help-row"><kbd>Enter</kbd> Edit entry (on focused card)</div>
            </div>
          </div>
          <div className="help-section">
            <span className="help-section-title">Tag Manager</span>
            <div className="help-rows">
              <div className="help-row"><kbd>Tab</kbd> Focus next tag</div>
              <div className="help-row"><kbd>Enter</kbd> Edit tag name</div>
              <div className="help-row"><kbd>Del</kbd> / <kbd>Backspace</kbd> Delete tag</div>
            </div>
          </div>
          <div className="help-section">
            <span className="help-section-title">Settings</span>
            <div className="help-rows">
              <div className="help-row"><kbd>Tab</kbd> Move through toggles and buttons</div>
              <div className="help-row"><kbd>Space</kbd> Toggle switch on/off</div>
            </div>
          </div>
          <div className="help-section">
            <span className="help-section-title">General</span>
            <div className="help-rows">
              <div className="help-row"><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>L</kbd> Toggle Whid window (global)</div>
              <div className="help-row"><kbd>Tab</kbd> Move focus to next interactive element</div>
            </div>
          </div>
        </div>
        <div className="popover-footer">
          <button className="btn-text" onClick={() => setView('popover')}>Home <kbd>H</kbd></button>
          <span className="shortcut-hint-mini"><kbd>Esc</kbd> back</span>
        </div>
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
          <button className="btn-text" onClick={() => setView('tags')}>Tags <kbd>T</kbd></button>
          <button className="btn-text" onClick={() => setView('dashboard')}>Dashboard <kbd>D</kbd></button>
          <button className="btn-text" onClick={handleOpenSettings}><SettingsIcon size={12} /> Settings <kbd>S</kbd></button>
          <span className="shortcut-hint-mini"><kbd>←</kbd><kbd>→</kbd> day · <kbd>Esc</kbd> back</span>
        </div>
      </div>
    )
  }

  return (
    <div className="popover-shell">
      {updateStatus.type === 'downloaded' && (
        <div className="update-banner">
          <span>Update v{updateStatus.version} ready to install</span>
          <button className="update-banner-btn" onClick={handleInstallUpdate}>
            <RotateCw size={12} /> Restart & Update
          </button>
        </div>
      )}
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
    </div>
  )
}
