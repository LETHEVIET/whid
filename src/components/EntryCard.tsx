import { useState, useRef, useEffect } from 'react'
import { Trash2, MoreHorizontal, Copy, Tag, Check } from 'lucide-react'
import { Menu } from '@base-ui/react/menu'
import { playDeleteSound } from '../utils/sounds'

interface Tag {
  id: number
  name: string
  color: string
}

interface EntryCardProps {
  entry: {
    id: number
    content: string
    created_at: string
    tags: Tag[]
  }
  allTags: Tag[]
  index?: number
  onEdit: (id: number, content: string) => void
  onDelete: (id: number) => void
  onSetEntryTags: (entryId: number, tagIds: number[]) => void
}

const entryMenu = Menu.createHandle()

export function EntryCard({ entry, allTags, index = 0, onEdit, onDelete, onSetEntryTags }: EntryCardProps) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(entry.content)
  const [showTagEditor, setShowTagEditor] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(entry.tags.map(t => t.id))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const time = entry.created_at.split(' ')[1]?.slice(0, 5) || ''

  const handleSave = () => {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== entry.content) {
      onEdit(entry.id, trimmed)
    }
    setEditing(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(entry.content)
  }

  const handleDelete = () => {
    playDeleteSound()
    onDelete(entry.id)
  }

  const handleOpenTagEditor = () => {
    setSelectedTagIds(entry.tags.map(t => t.id))
    setShowTagEditor(true)
  }

  const handleSaveTags = () => {
    onSetEntryTags(entry.id, selectedTagIds)
    setShowTagEditor(false)
  }

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const cardRef = useRef<HTMLDivElement>(null)

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (editing || showTagEditor) return
    if (e.key === 'Enter') {
      e.preventDefault()
      setEditText(entry.content)
      setEditing(true)
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      handleDelete()
    }
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault()
      const btn = cardRef.current?.querySelector('.icon-btn') as HTMLButtonElement
      btn?.click()
    }
  }

  return (
    <div
      className="entry-card entry-card-entrance"
      style={{ animationDelay: `${index * 30}ms` }}
      tabIndex={0}
      ref={cardRef}
      onKeyDown={handleCardKeyDown}
      role="listitem"
      aria-label={`Entry at ${time}: ${entry.content}`}
    >
      <span className="entry-time">{time}</span>
      {editing ? (
        <input
          ref={inputRef}
          className="entry-edit-input"
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <span
          className="entry-text"
          title="Double-click or press Enter to edit"
          onDoubleClick={() => {
            setEditText(entry.content)
            setEditing(true)
          }}
        >
          {entry.content}
        </span>
      )}
      {showTagEditor ? (
        <div className="entry-tag-editor">
          {allTags.map(tag => (
            <button
              key={tag.id}
              className="tag-chip"
              style={{
                backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : tag.color + '20',
                color: selectedTagIds.includes(tag.id) ? '#fff' : tag.color,
                borderColor: tag.color
              }}
              onClick={() => toggleTag(tag.id)}
            >
              {tag.name}
            </button>
          ))}
          <button className="icon-btn tag-editor-done" onClick={handleSaveTags} title="Done">
            <Check size={12} />
          </button>
        </div>
      ) : (
        <div className="entry-tags">
          {entry.tags.map(tag => (
            <span key={tag.id} className="tag-chip" style={{ backgroundColor: tag.color + '30', color: tag.color, borderColor: tag.color }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="entry-actions">
        <Menu.Trigger className="icon-btn" handle={entryMenu} aria-label="More actions">
          <MoreHorizontal size={12} />
        </Menu.Trigger>
        <Menu.Root handle={entryMenu}>
          <Menu.Portal>
            <Menu.Positioner side="top" align="end" sideOffset={4} collisionPadding={8}>
              <Menu.Popup className="entry-menu-dropdown">
                <Menu.Item className="menu-item" onClick={handleCopy} onFocusCapture={undefined}>
                  <Copy size={12} /> Copy
                </Menu.Item>
                <Menu.Item className="menu-item" onClick={handleOpenTagEditor} onFocusCapture={undefined}>
                  <Tag size={12} /> Edit Tags
                </Menu.Item>
                <Menu.Separator className="menu-divider" />
                <Menu.Item className="menu-item menu-item-danger" onClick={handleDelete} onFocusCapture={undefined}>
                  <Trash2 size={12} /> Delete
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </div>
  )
}
