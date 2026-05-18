import { useState, useEffect, useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface TagDayCount {
  date: string
  tag_id: number | null
  tag_name: string | null
  tag_color: string | null
  count: number
}

const UNTAGGED_KEY = '__untagged'
const UNTAGGED_LABEL = 'Untagged'
const UNTAGGED_COLOR = '#a3a3a3'
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekRange(): { start: string; end: string; days: string[] } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monday = new Date(today)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const days: string[] = []
  const cursor = new Date(monday)
  for (let i = 0; i < 7; i++) {
    days.push(toDateStr(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  const end = new Date(monday)
  end.setDate(end.getDate() + 6)
  return { start: toDateStr(monday), end: toDateStr(end), days }
}

export function WeekChart() {
  const [rows, setRows] = useState<TagDayCount[]>([])
  const [loading, setLoading] = useState(true)

  const { start, end, days } = useMemo(() => getWeekRange(), [])

  useEffect(() => {
    window.api.getTagBreakdown(start, end).then((data: TagDayCount[]) => {
      setRows(data)
      setLoading(false)
    })
  }, [start, end])

  const { chartData, tagKeys } = useMemo(() => {
    const keyByTag = new Map<string, { key: string; label: string; color: string }>()
    const perDay = new Map<string, Record<string, number>>()

    for (const d of days) perDay.set(d, {})

    for (const r of rows) {
      const key = r.tag_id == null ? UNTAGGED_KEY : `tag-${r.tag_id}`
      const label = r.tag_name ?? UNTAGGED_LABEL
      const color = r.tag_color ?? UNTAGGED_COLOR
      if (!keyByTag.has(key)) keyByTag.set(key, { key, label, color })

      const bucket = perDay.get(r.date)
      if (bucket) bucket[key] = (bucket[key] ?? 0) + r.count
    }

    const chartData = days.map((date, i) => {
      const bucket = perDay.get(date) ?? {}
      return {
        date,
        label: DAY_LABELS[i],
        ...bucket
      }
    })

    return { chartData, tagKeys: Array.from(keyByTag.values()) }
  }, [rows, days])

  const totalThisWeek = useMemo(
    () => rows.reduce((s, r) => s + r.count, 0),
    [rows]
  )

  return (
    <div className="week-chart">
      <div className="contribution-header">
        <CalendarDays size={14} />
        <span>{totalThisWeek} entries this week</span>
      </div>

      {loading ? (
        <div className="week-chart-skeleton">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton week-chart-skeleton-bar" />
          ))}
        </div>
      ) : (
        <div className="week-chart-body">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-hover)' }}
                contentStyle={{
                  background: 'var(--surface-bg)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  padding: 'var(--space-2) var(--space-4)'
                }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
              />
              {tagKeys.length > 1 && (
                <Legend
                  wrapperStyle={{ fontSize: 'var(--text-xs)', paddingTop: 4 }}
                  iconType="square"
                  iconSize={8}
                />
              )}
              {tagKeys.map(t => (
                <Bar
                  key={t.key}
                  dataKey={t.key}
                  name={t.label}
                  stackId="a"
                  fill={t.color}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
