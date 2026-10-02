'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, Check, Clock, Calendar, Zap, Shield } from 'lucide-react'

const GREEN = '#084E4E'
const ORANGE = '#E8621A'

const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon→Sun
const DAY_NAMES: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
}
const DAY_SHORT: Record<number, string> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
}

interface Window { dayOfWeek: number; startTime: string; endTime: string }
interface Availability {
  windows: Window[]
  minNoticeHours: number
  maxSessionHours: number
  maxSessionsPerDay: number
  blockedDates: string[]
}

const DEFAULT: Availability = {
  windows: [], minNoticeHours: 24, maxSessionHours: 4,
  maxSessionsPerDay: 1, blockedDates: [],
}

export default function AvailabilityPage() {
  const [av, setAv] = useState<Availability>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [newBlockDate, setNewBlockDate] = useState('')
  const [hostUserId, setHostUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(async j => {
        if (!j.success || !j.data?.id) return
        const uid = j.data.id
        setHostUserId(uid)
        const r2 = await fetch(`/api/hosts/${uid}/availability/settings`)
        const j2 = await r2.json()
        if (j2.success && j2.data) setAv(j2.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggleDay(day: number) {
    const exists = av.windows.findIndex(w => w.dayOfWeek === day)
    if (exists >= 0) {
      setAv(p => ({ ...p, windows: p.windows.filter(w => w.dayOfWeek !== day) }))
    } else {
      setAv(p => ({
        ...p,
        windows: [...p.windows, { dayOfWeek: day, startTime: '10:00', endTime: '18:00' }],
      }))
    }
  }

  function updateWindow(day: number, field: 'startTime' | 'endTime', value: string) {
    setAv(p => ({
      ...p,
      windows: p.windows.map(w => w.dayOfWeek === day ? { ...w, [field]: value } : w),
    }))
  }

  function addBlockedDate() {
    if (!newBlockDate || av.blockedDates.includes(newBlockDate)) return
    setAv(p => ({ ...p, blockedDates: [...p.blockedDates, newBlockDate].sort() }))
    setNewBlockDate('')
  }

  async function handleSave() {
    if (!hostUserId) { setError('Not logged in — please refresh.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/hosts/${hostUserId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(av),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error?.message ?? 'Failed to save'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const activeCount = av.windows.length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F3EF' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading your schedule…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F3EF' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#0C3520,#084E4E)' }}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/host-dashboard"
              className="flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-white/10"
              style={{ border: '1.5px solid rgba(255,255,255,0.25)' }}>
              <ChevronLeft size={18} className="text-white" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                style={{ color: 'rgba(245,166,35,0.9)' }}>Host settings</p>
              <h1 className="font-serif text-2xl font-bold text-white">Availability</h1>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Active days', value: activeCount, icon: <Calendar size={14} />, color: '#34D399' },
              { label: 'Min notice', value: `${av.minNoticeHours}h`, icon: <Clock size={14} />, color: '#FBBF24' },
              { label: 'Max session', value: `${av.maxSessionHours}h`, icon: <Zap size={14} />, color: '#F87171' },
            ].map(s => (
              <div key={s.label} className="rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="flex items-center gap-1.5 mb-1" style={{ color: s.color }}>
                  {s.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wide">{s.label}</span>
                </div>
                <p className="font-serif text-xl font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Info banner ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl px-5 py-4 flex gap-3 text-sm items-start"
          style={{ background: 'linear-gradient(135deg,#1E3A5F,#1D4ED8)', border: '3px solid #1D4ED8' }}>
          <Shield size={16} className="flex-shrink-0 mt-0.5 text-white opacity-80" />
          <p className="text-white font-medium">
            Travelers only see dates that fall within your windows. Changes take effect immediately.
          </p>
        </div>

        {/* ── Weekly schedule ──────────────────────────────────────────────── */}
        <section className="rounded-2xl overflow-hidden"
          style={{ border: '3px solid #084E4E', boxShadow: '0 4px 20px rgba(8,78,78,0.15)' }}>

          {/* Section header */}
          <div className="px-6 py-5 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg,#0C3520,#084E4E)' }}>
            <div>
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Calendar size={18} style={{ color: '#34D399' }} /> Weekly schedule
              </h2>
              <p className="text-xs mt-0.5 text-white/60">Toggle days on/off and set your available hours</p>
            </div>
            <div className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                background: activeCount > 0 ? 'rgba(52,211,153,0.20)' : 'rgba(255,255,255,0.10)',
                color: activeCount > 0 ? '#34D399' : 'rgba(255,255,255,0.40)',
                border: activeCount > 0 ? '1.5px solid #34D399' : '1.5px solid rgba(255,255,255,0.15)',
              }}>
              {activeCount} day{activeCount !== 1 ? 's' : ''} active
            </div>
          </div>

          {/* Day rows */}
          <div className="bg-white divide-y-2" style={{ borderColor: '#F0FDF4' }}>
            {DAYS_ORDER.map(day => {
              const win = av.windows.find(w => w.dayOfWeek === day)
              const isActive = !!win
              return (
                <div key={day}
                  className="px-5 py-4 flex items-center gap-4 transition-all"
                  style={{ background: isActive ? 'linear-gradient(90deg,#ECFDF5,#fff)' : '#fff' }}>

                  {/* Toggle */}
                  <button onClick={() => toggleDay(day)}
                    className="relative flex-shrink-0 rounded-full"
                    style={{
                      width: 52, height: 28,
                      background: isActive ? 'linear-gradient(135deg,#059669,#10B981)' : '#D1D5DB',
                      boxShadow: isActive ? '0 3px 10px rgba(16,185,129,0.50)' : 'none',
                      border: isActive ? '2px solid #059669' : '2px solid #D1D5DB',
                      transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
                    }}
                    aria-label={`Toggle ${DAY_NAMES[day]}`}>
                    <span style={{
                      position: 'absolute',
                      top: 3,
                      left: isActive ? 26 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                      transition: 'left 0.2s ease',
                    }} />
                  </button>

                  {/* Day name */}
                  <div className="w-24 flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: isActive ? GREEN : '#9CA3AF' }}>
                      {DAY_NAMES[day]}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: isActive ? '#10B981' : '#D1D5DB' }}>
                      {DAY_SHORT[day]}
                    </p>
                  </div>

                  {/* Time pickers or Not available */}
                  {isActive && win ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" value={win.startTime}
                        onChange={e => updateWindow(day, 'startTime', e.target.value)}
                        className="rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        style={{ border: '2.5px solid #059669', color: GREEN, background: '#F0FDF4' }} />
                      <span className="text-xs font-bold" style={{ color: '#059669' }}>→</span>
                      <input type="time" value={win.endTime}
                        onChange={e => updateWindow(day, 'endTime', e.target.value)}
                        className="rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        style={{ border: '2.5px solid #059669', color: GREEN, background: '#F0FDF4' }} />
                      {(() => {
                        const [sh, sm] = win.startTime.split(':').map(Number)
                        const [eh, em] = win.endTime.split(':').map(Number)
                        const hrs = ((eh * 60 + em) - (sh * 60 + sm)) / 60
                        return hrs > 0 ? (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full ml-1"
                            style={{ background: '#DCFCE7', color: '#15803D', border: '1.5px solid #86EFAC' }}>
                            {hrs}h
                          </span>
                        ) : null
                      })()}
                    </div>
                  ) : (
                    <span className="text-sm font-medium" style={{ color: '#CBD5E1' }}>Not available</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Session rules ────────────────────────────────────────────────── */}
        <section className="rounded-2xl overflow-hidden"
          style={{ border: '3px solid #0369A1', boxShadow: '0 4px 20px rgba(3,105,161,0.15)' }}>

          <div className="px-6 py-5"
            style={{ background: 'linear-gradient(135deg,#0C4A6E,#0369A1)' }}>
            <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
              <Clock size={18} style={{ color: '#FCD34D' }} /> Session rules
            </h2>
            <p className="text-xs mt-0.5 text-white/60">Controls how travelers can book with you</p>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white">
            {[
              {
                label: 'Minimum notice',
                desc: 'Earliest a traveler can book',
                value: av.minNoticeHours,
                options: [4, 8, 12, 24, 48, 72],
                format: (v: number) => `${v}h before`,
                onChange: (v: number) => setAv(p => ({ ...p, minNoticeHours: v })),
                gradient: 'linear-gradient(135deg,#0369A1,#38BDF8)',
                border: '#38BDF8',
                icon: '⏰',
              },
              {
                label: 'Max session',
                desc: 'Longest a traveler can book',
                value: av.maxSessionHours,
                options: [1, 2, 3, 4, 5, 6, 8],
                format: (v: number) => `${v} hour${v > 1 ? 's' : ''}`,
                onChange: (v: number) => setAv(p => ({ ...p, maxSessionHours: v })),
                gradient: 'linear-gradient(135deg,#065F46,#34D399)',
                border: '#34D399',
                icon: '⚡',
              },
              {
                label: 'Sessions per day',
                desc: 'Prevents same-day overload',
                value: av.maxSessionsPerDay,
                options: [1, 2, 3],
                format: (v: number) => `${v} session${v > 1 ? 's' : ''}`,
                onChange: (v: number) => setAv(p => ({ ...p, maxSessionsPerDay: v })),
                gradient: 'linear-gradient(135deg,#0E7490,#67E8F9)',
                border: '#67E8F9',
                icon: '📅',
              },
            ].map(rule => (
              <div key={rule.label} className="rounded-2xl overflow-hidden"
                style={{ border: `3px solid ${rule.border}`, boxShadow: `0 4px 16px ${rule.border}30` }}>
                {/* Card header */}
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: rule.gradient }}>
                  <span className="text-lg">{rule.icon}</span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white">{rule.label}</p>
                    <p className="text-[10px] text-white/60">{rule.desc}</p>
                  </div>
                </div>
                {/* Select */}
                <div className="px-4 py-4 bg-white">
                  <select
                    value={rule.value}
                    onChange={e => rule.onChange(Number(e.target.value))}
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all"
                    style={{
                      border: `2.5px solid ${rule.border}`,
                      color: rule.border,
                      background: '#FAFAFA',
                    }}>
                    {rule.options.map(o => (
                      <option key={o} value={o}>{rule.format(o)}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Blocked dates ────────────────────────────────────────────────── */}
        <section className="rounded-2xl overflow-hidden"
          style={{ border: '3px solid #DC2626', boxShadow: '0 4px 20px rgba(220,38,38,0.15)' }}>

          <div className="px-6 py-5"
            style={{ background: 'linear-gradient(135deg,#7F1D1D,#DC2626)' }}>
            <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
              🚫 Blocked dates
            </h2>
            <p className="text-xs mt-0.5 text-white/60">
              Holidays, travel, or any days you&apos;re unavailable
            </p>
          </div>

          <div className="p-5 space-y-4 bg-white">
            <div className="flex items-center gap-3">
              <input type="date" value={newBlockDate} min={today}
                onChange={e => setNewBlockDate(e.target.value)}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                style={{ border: '2.5px solid #DC2626', color: '#DC2626', background: '#FFF5F5' }} />
              <button onClick={addBlockedDate} disabled={!newBlockDate}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:-translate-y-0.5 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg,#DC2626,#B91C1C)',
                  boxShadow: newBlockDate ? '0 4px 16px rgba(220,38,38,0.45)' : 'none',
                  border: '2px solid #B91C1C',
                }}>
                <Plus size={15} /> Block date
              </button>
            </div>

            {av.blockedDates.length === 0 ? (
              <div className="text-center py-8 rounded-xl"
                style={{ background: '#FFF5F5', border: '2px dashed #FECACA' }}>
                <p className="text-2xl mb-2">🗓️</p>
                <p className="text-sm font-bold" style={{ color: '#DC2626' }}>No blocked dates</p>
                <p className="text-xs mt-0.5" style={{ color: '#FCA5A5' }}>Add dates you&apos;re away or unavailable</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {av.blockedDates.map(date => (
                  <div key={date}
                    className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all hover:scale-105"
                    style={{ background: '#FEF2F2', color: '#DC2626', border: '2.5px solid #DC2626' }}>
                    <span>
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={() => setAv(p => ({ ...p, blockedDates: p.blockedDates.filter(d => d !== date) }))}
                      className="hover:text-red-900 transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="text-sm px-4 py-3 rounded-xl font-medium"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* ── Save button ──────────────────────────────────────────────────── */}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 rounded-full text-white font-bold text-[14px] disabled:opacity-60 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
          style={{
            background: saved
              ? 'linear-gradient(135deg,#16A34A,#15803D)'
              : `linear-gradient(135deg,${ORANGE},#F07830)`,
            boxShadow: saved
              ? '0 4px 24px rgba(22,163,74,0.40)'
              : '0 4px 24px rgba(232,98,26,0.40)',
          }}>
          {saved
            ? <><Check size={18} /> Availability saved!</>
            : saving
              ? 'Saving…'
              : 'Save availability settings'}
        </button>

        <p className="text-center text-xs pb-4" style={{ color: '#9CA3AF' }}>
          Changes apply immediately to your public profile calendar
        </p>

      </div>
    </div>
  )
}
