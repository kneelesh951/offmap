'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type DayStatus = 'available' | 'pending' | 'booked'

interface Props {
  hostUserId: string
  selectedDate: string | null   // YYYY-MM-DD
  onSelect: (date: string) => void
}

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

export default function AvailabilityCalendar({ hostUserId, selectedDate, onSelect }: Props) {
  const today = isoToday()
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1) // 1-indexed
  const [statuses, setStatuses] = useState<Record<string, DayStatus>>({})
  const [loading, setLoading] = useState(false)

  const monthKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}`

  const fetchMonth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/hosts/${hostUserId}/availability?month=${monthKey}`)
      const json = await res.json()
      if (json.success) setStatuses(prev => ({ ...prev, ...json.data }))
    } catch {
      // silent — leave previous state
    } finally {
      setLoading(false)
    }
  }, [hostUserId, monthKey])

  useEffect(() => {
    fetchMonth()
  }, [fetchMonth])

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const cells: Array<{ date: string | null; status: DayStatus | null; past: boolean }> = []
  for (let i = 0; i < firstDay; i++) cells.push({ date: null, status: null, past: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const past = date < today
    cells.push({ date, status: statuses[date] ?? null, past })
  }

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // prevent navigating to past months
  const atMinMonth = viewYear === new Date().getFullYear() && viewMonth <= new Date().getMonth() + 1

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          disabled={atMinMonth}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-gray-100"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`grid grid-cols-7 gap-y-1 transition-opacity ${loading ? 'opacity-40' : ''}`}>
        {cells.map((cell, i) => {
          if (!cell.date) return <div key={i} />

          const isSelected = cell.date === selectedDate
          const isToday = cell.date === today
          const clickable = !cell.past && cell.status === 'available'

          let bg = ''
          let ring = ''
          let cursor = 'cursor-default'
          let title = ''

          if (cell.past || cell.status === null) {
            bg = ''
          } else if (cell.status === 'available') {
            bg = isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            cursor = 'cursor-pointer'
            title = 'Available'
          } else if (cell.status === 'pending') {
            bg = 'bg-amber-50 text-amber-600'
            title = 'Pending booking'
          } else {
            bg = 'bg-gray-100 text-gray-300'
            title = 'Unavailable'
          }

          if (isSelected) ring = 'ring-2 ring-emerald-500'
          if (isToday && !isSelected) ring = 'ring-1 ring-emerald-400'

          return (
            <button
              key={cell.date}
              disabled={!clickable}
              onClick={() => clickable && onSelect(cell.date!)}
              title={title}
              className={`
                relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium
                transition-colors
                ${bg} ${ring} ${cursor}
                ${cell.past || !cell.status ? 'text-gray-300' : ''}
                disabled:pointer-events-none
              `}
            >
              {new Date(cell.date + 'T12:00:00').getDate()}
              {cell.status === 'pending' && !cell.past && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-200 inline-block" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-200 inline-block" /> Pending</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" /> Unavailable</span>
      </div>
    </div>
  )
}
