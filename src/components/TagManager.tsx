import { useState } from 'react'
import { Plus, Pencil, X } from 'lucide-react'

interface Tag {
  id: number
  name: string
  color: string
}

interface TagManagerProps {
  tags: Tag[]
  onAdd: (name: string, color: string) => Promise<Tag>
  onEdit: (id: number, name: string, color: string) => void
  onDelete: (id: number) => void
}

const COLORS = ['#2563eb', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6']

export function TagManager({ tags, onAdd, onEdit, onDelete }: TagManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (editingId !== null) {
      onEdit(editingId, trimmed, color)
      setEditingId(null)
    } else {
      await onAdd(trimmed, color)
    }
    setName('')
    setColor(COLORS[0])
    setShowForm(false)
  }

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id)
    setName(tag.name)
    setColor(tag.color)
    setShowForm(true)
  }

  return (
    <div className="tag-manager">
      <div className="tag-manager-header">
        <h3>Tags</h3>
            <button className="btn-small" onClick={() => { setShowForm(true); setEditingId(null); setName(''); setColor(COLORS[0]) }}>
          <Plus size={12} /> Add
        </button>
      </div>

      {showForm && (
        <div className="tag-form">
          <input
            className="tag-input"
            placeholder="Tag name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          <div className="color-picker">
            {COLORS.map(c => (
              <button
                key={c}
                className={`color-swatch ${c === color ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="tag-form-actions">
            <button className="btn-small" onClick={handleSubmit}>
              {editingId !== null ? 'Save Tag' : 'Add Tag'}
            </button>
            <button className="btn-small btn-secondary" onClick={() => { setShowForm(false); setEditingId(null) }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="tag-list" role="list">
        {tags.map(tag => (
          <div
            key={tag.id}
            className="tag-item"
            tabIndex={0}
            role="listitem"
            aria-label={`Tag: ${tag.name}`}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); startEdit(tag) }
              if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onDelete(tag.id) }
            }}
          >
            <span className="tag-chip" style={{ backgroundColor: tag.color + '30', color: tag.color, borderColor: tag.color }}>
              {tag.name}
            </span>
            <div className="tag-item-actions">
              <button className="icon-btn sm" onClick={() => startEdit(tag)} title="Edit" tabIndex={-1}><Pencil size={11} /></button>
              <button className="icon-btn sm" onClick={() => onDelete(tag.id)} title="Delete" tabIndex={-1}><X size={11} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
