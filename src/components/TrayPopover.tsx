import { useState, useEffect, useRef } from 'react'
import { Minus, X, ScrollText, Settings } from 'lucide-react'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { Toggle } from '@base-ui/react/toggle'
import { EntryCard } from './EntryCard'
import { playLogSound, playErrorSound } from '../utils/sounds'

const PLACEHOLDERS = [
  'What did you get done today?',
  'What made today count?',
  'One thing you accomplished?',
  'Any wins to note?',
  'Progress, however small?',
  'What moved forward today?',
  'A decision worth remembering?',
  'Meeting that mattered?',
  'Something you learned?',
  'Read something interesting?',
  'Listened to a good podcast?',
  'Watched something inspiring?',
  'A conversation that stood out?',
  'Someone you helped today?',
  'Did you unblock anyone?',
  'Helped a colleague?',
  'A problem you solved?',
  'Fixed something tricky?',
  'Solved a puzzle today?',
  'What landed today?',
  'Shipped something today?',
  'Wrote a PR? Fixed a bug?',
  'Code reviewed? Docs updated?',
  'Designed something new?',
  'Wrote or edited something?',
  'Created something today?',
  'Planned or organized?',
  'Cleaned or decluttered?',
  'Worked on a side project?',
  'Tried something new?',
  'Practiced a skill?',
  'Exercise or movement?',
  'Cooked something good?',
  'Ate something memorable?',
  'Got outside today?',
  'Connected with someone?',
  'What made you think?',
  'What surprised you?',
  'What are you grateful for?',
  'Anything you want to remember?'
]

function randomPlaceholder(): string {
  return PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]
}

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

interface TrayPopoverProps {
  entries: Entry[]
  tags: Tag[]
  loading: boolean
  onAddEntry: (content: string, tagIds: number[]) => Promise<void>
  onEditEntry: (id: number, content: string) => void
  onDeleteEntry: (id: number) => void
  onSetEntryTags: (entryId: number, tagIds: number[]) => void
  onOpenFull: () => void
  onOpenDashboard: () => void
  onOpenSettings: () => void
}

function SkeletonList() {
  return (
    <div className="entries-list" aria-label="Loading entries">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton skeleton-time" />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-tag" />
        </div>
      ))}
    </div>
  )
}

export function TrayPopover({ entries, tags, loading, onAddEntry, onEditEntry, onDeleteEntry, onSetEntryTags, onOpenFull, onOpenDashboard, onOpenSettings }: TrayPopoverProps) {
  const [text, setText] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [placeholder, setPlaceholder] = useState(randomPlaceholder)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const cleanup = window.api.onWindowShown(() => {
      setPlaceholder(randomPlaceholder())
    })
    return cleanup
  }, [])

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    try {
      await onAddEntry(trimmed, selectedTagIds)
      playLogSound()
      setText('')
      setSelectedTagIds([])
      inputRef.current?.focus()
    } catch {
      playErrorSound()
    }
  }

  const handleTagChange = (value: string[]) => {
    setSelectedTagIds(value.map(Number))
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="popover">
      <div className="popover-header">
        <div className="popover-header-left">
          <h2 className="popover-title">What did you do?</h2>
          <span className="popover-date">{today}</span>
        </div>
        <div className="window-controls">
          <button className="win-btn" onClick={() => window.api.minimizeWindow()} title="Minimize"><Minus size={14} /></button>
          <button className="win-btn win-close" onClick={() => window.api.hideWindow()} title="Close"><X size={14} /></button>
        </div>
      </div>

      <div className="input-area">
        <input
          ref={inputRef}
          className="main-input"
          placeholder={placeholder}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
            if (e.key === 'Escape') {
              window.api.hideWindow()
            }
          }}
        />
        <button className="btn-save" onClick={handleSubmit} disabled={!text.trim()}>
          Log
        </button>
      </div>

      {tags.length > 0 && (
        <ToggleGroup
          multiple
          value={selectedTagIds.map(String)}
          onValueChange={handleTagChange}
          className="tag-selector"
        >
          {tags.map(tag => (
            <Toggle
              key={tag.id}
              value={String(tag.id)}
              className="tag-chip"
              style={(state) => ({
                backgroundColor: state.pressed ? tag.color : tag.color + '20',
                color: state.pressed ? '#fff' : tag.color,
                borderColor: tag.color
              } as React.CSSProperties)}
            >
              {tag.name}
            </Toggle>
          ))}
        </ToggleGroup>
      )}

      <div className="entries-section">
        <div className="entries-header">
          <h3>Today</h3>
          <span className="entry-count">{entries.length}</span>
        </div>

        {loading ? (
          <SkeletonList />
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <ScrollText size={24} className="empty-state-icon" />
            <span>No entries yet — start typing above!</span>
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

      <div className="popover-footer">
        <button className="btn-text" onClick={onOpenFull}>History & Tags</button>
        <button className="btn-text" onClick={onOpenDashboard}>Dashboard</button>
        <button className="btn-text" onClick={onOpenSettings}><Settings size={12} /> Settings</button>
        <span className="shortcut-hint">Esc to close</span>
      </div>
    </div>
  )
}
