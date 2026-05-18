import { useState, useEffect, useMemo } from 'react'
import { Activity } from 'lucide-react'
import { ActivityCalendar, type Activity as CalendarActivity } from 'react-activity-calendar'
import { WeekChart } from './WeekChart'

interface DayCount {
  date: string
  count: number
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLevel(count: number, max: number): number {
  if (count === 0) return 0
  if (max === 0) return 1
  const ratio = count / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

export function Dashboard() {
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  const year = useMemo(() => new Date().getFullYear(), [])
  const todayStr = useMemo(() => toDateStr(new Date()), [])

  useEffect(() => {
    window.api.getContributionData(365).then((rows: DayCount[]) => {
      const map = new Map<string, number>()
      for (const r of rows) map.set(r.date, r.count)
      setCounts(map)
      setLoading(false)
    })
  }, [])

  const activities = useMemo<CalendarActivity[]>(() => {
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    let max = 0
    for (const [date, c] of counts) {
      if (date >= yearStart && date <= yearEnd && c > max) max = c
    }

    const out: CalendarActivity[] = []
    const cursor = new Date(year, 0, 1)
    const end = new Date(year, 11, 31)
    while (cursor <= end) {
      const date = toDateStr(cursor)
      const count = counts.get(date) ?? 0
      out.push({ date, count, level: getLevel(count, max) })
      cursor.setDate(cursor.getDate() + 1)
    }
    return out
  }, [counts, year])

  const { totalEntries, activeDays, daysSoFar } = useMemo(() => {
    let sum = 0
    let active = 0
    let days = 0
    for (const a of activities) {
      if (a.date > todayStr) break
      days++
      sum += a.count
      if (a.count > 0) active++
    }
    return { totalEntries: sum, activeDays: active, daysSoFar: days }
  }, [activities, todayStr])

  const quietDays = daysSoFar - activeDays

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-stats">
          <div className="stat">
            <span className="stat-value">{totalEntries}</span>
            <span className="stat-label">entries</span>
          </div>
          <div className="stat">
            <span className="stat-value">{activeDays}</span>
            <span className="stat-label">active days</span>
          </div>
          <div className="stat">
            <span className="stat-value">{quietDays}</span>
            <span className="stat-label">quiet days</span>
          </div>
        </div>
      </div>

      <WeekChart />

      <div className="contribution-map">
        <div className="contribution-header">
          <Activity size={14} />
          <span>{totalEntries} entries in {year}</span>
        </div>

        <ActivityCalendar
          data={activities}
          loading={loading}
          blockSize={12}
          blockMargin={3}
          blockRadius={2}
          fontSize={10}
          weekStart={1}
          maxLevel={4}
          showWeekdayLabels={['mon', 'wed', 'fri']}
          showTotalCount={false}
          colorScheme="light"
          theme={{ light: ['#f5f5f5', '#2563eb'] }}
          labels={{ legend: { less: 'Less', more: 'More' } }}
        />
      </div>
    </div>
  )
}
