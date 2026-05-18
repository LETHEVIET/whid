import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: Database.Database

const CONFIG_FILE = path.join(app.getPath('userData'), 'db-path.json')

function defaultDir(): string {
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'data')
    : path.join(process.cwd(), 'data')
}

function loadCustomDir(): string | null {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed.dir && fs.existsSync(parsed.dir)) return parsed.dir
  } catch { /* ignore */ }
  return null
}

function saveCustomDir(dir: string) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true })
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ dir }))
  } catch { /* best effort */ }
}

const dbDir = loadCustomDir() || defaultDir()

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'entries.db')
db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366f1'
  );

  CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
  );
`)

export interface Entry {
  id: number
  content: string
  created_at: string
  updated_at: string
  tags: Tag[]
}

export interface Tag {
  id: number
  name: string
  color: string
}

function getEntryTags(entryId: number): Tag[] {
  return db.prepare(
    `SELECT t.* FROM tags t
     JOIN entry_tags et ON t.id = et.tag_id
     WHERE et.entry_id = ?
     ORDER BY t.name`
  ).all(entryId) as Tag[]
}

export function createEntry(content: string, tagIds: number[] = []): Entry {
  const stmt = db.prepare('INSERT INTO entries (content) VALUES (?)')
  const result = stmt.run(content)
  const entryId = result.lastInsertRowid as number

  if (tagIds.length > 0) {
    const tagStmt = db.prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)')
    for (const tagId of tagIds) {
      tagStmt.run(entryId, tagId)
    }
  }

  return getEntry(entryId)!
}

export function getEntry(id: number): Entry | undefined {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!entry) return undefined
  return { ...entry, tags: getEntryTags(id) } as unknown as Entry
}

export function getEntriesByDate(date: string): Entry[] {
  const entries = db.prepare(
    'SELECT * FROM entries WHERE date(created_at) = date(?) ORDER BY created_at DESC'
  ).all(date) as Array<Record<string, unknown>>
  return entries.map(e => ({ ...e, tags: getEntryTags(e.id as number) })) as unknown as Entry[]
}

export function getTodayEntries(): Entry[] {
  const today = new Date().toISOString().split('T')[0]
  return getEntriesByDate(today)
}

export function updateEntry(id: number, content: string): void {
  db.prepare(
    "UPDATE entries SET content = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
  ).run(content, id)
}

export function deleteEntry(id: number): void {
  db.prepare('DELETE FROM entries WHERE id = ?').run(id)
}

export function setEntryTags(entryId: number, tagIds: number[]): void {
  db.prepare('DELETE FROM entry_tags WHERE entry_id = ?').run(entryId)
  if (tagIds.length > 0) {
    const stmt = db.prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)')
    for (const tagId of tagIds) {
      stmt.run(entryId, tagId)
    }
  }
}

export function getAllTags(): Tag[] {
  return db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[]
}

export function createTag(name: string, color: string = '#6366f1'): Tag {
  const result = db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)').run(name, color)
  const tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as Tag
  return tag
}

export function updateTag(id: number, name: string, color: string): void {
  db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, id)
}

export function deleteTag(id: number): void {
  db.prepare('DELETE FROM tags WHERE id = ?').run(id)
}

export function getDateRange(): string[] {
  return db.prepare(
    'SELECT DISTINCT date(created_at) as date FROM entries ORDER BY date DESC'
  ).all().map((r: Record<string, unknown>) => r.date as string)
}

export interface DayCount {
  date: string
  count: number
}

export function getContributionData(days: number = 365): DayCount[] {
  return db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM entries
    WHERE created_at >= datetime('now', ? || ' days', 'localtime')
    GROUP BY date(created_at)
    ORDER BY date
  `).all(-days) as DayCount[]
}

export interface TagDayCount {
  date: string
  tag_id: number | null
  tag_name: string | null
  tag_color: string | null
  count: number
}

export function getTagBreakdown(startDate: string, endDate: string): TagDayCount[] {
  // Each entry contributes once per attached tag, or once as "untagged" if none.
  return db.prepare(`
    SELECT
      date(e.created_at) as date,
      t.id as tag_id,
      t.name as tag_name,
      t.color as tag_color,
      COUNT(*) as count
    FROM entries e
    LEFT JOIN entry_tags et ON et.entry_id = e.id
    LEFT JOIN tags t ON t.id = et.tag_id
    WHERE date(e.created_at) >= date(?) AND date(e.created_at) <= date(?)
    GROUP BY date(e.created_at), t.id
    ORDER BY date(e.created_at)
  `).all(startDate, endDate) as TagDayCount[]
}

export function getDbInfo(): { dir: string; file: string } {
  return { dir: dbDir, file: dbPath }
}

export function setDbDir(newDir: string): { dir: string; file: string } | null {
  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true })
  }
  const newPath = path.join(newDir, 'entries.db')

  const oldPath = dbPath
  if (oldPath !== newPath && fs.existsSync(oldPath)) {
    fs.copyFileSync(oldPath, newPath)
  }

  db.close()
  db = new Database(newPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      content     TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE TABLE IF NOT EXISTS tags (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366f1'
    );
    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (entry_id, tag_id)
    );
  `)

  saveCustomDir(newDir)

  return { dir: newDir, file: newPath }
}
