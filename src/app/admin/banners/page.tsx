'use client'

import { useEffect, useState } from 'react'
import type { MockBanner } from '@/lib/mock/db'

type Banner = MockBanner

const VARIANT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  info:    { bg: '#DBEAFE', text: '#1E3A8A', dot: '#3B82F6' },
  promo:   { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  warning: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  urgent:  { bg: '#FFE4E6', text: '#9F1239', dot: '#F43F5E' },
}

const TARGET_LABELS: Record<string, string> = {
  all: 'Everyone', travelers: 'Travelers', hosts: 'Hosts',
  unsubscribed: 'Unsubscribed', subscribed: 'Subscribed',
}

const EMPTY_FORM = {
  key: '', variant: 'info' as Banner['variant'], text: '', ctaLabel: '', ctaHref: '',
  target: 'all' as Banner['target'], priority: 0, startsAt: '', endsAt: '', dismissible: true,
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/banners')
    const data = await res.json()
    if (data.success) setBanners(data.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleEnabled(banner: Banner) {
    await fetch(`/api/admin/banners/${banner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !banner.enabled }),
    })
    load()
  }

  async function deleteBanner(id: string) {
    if (!confirm('Delete this banner? This cannot be undone.')) return
    await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' })
    load()
  }

  function openEdit(banner: Banner) {
    setEditingId(banner.id)
    setForm({
      key: banner.key,
      variant: banner.variant,
      text: banner.text,
      ctaLabel: banner.ctaLabel ?? '',
      ctaHref: banner.ctaHref ?? '',
      target: banner.target,
      priority: banner.priority,
      startsAt: banner.startsAt ? banner.startsAt.slice(0, 16) : '',
      endsAt: banner.endsAt ? banner.endsAt.slice(0, 16) : '',
      dismissible: banner.dismissible,
    })
    setShowForm(true)
    setError(null)
  }

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
    setError(null)
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      ...form,
      priority: Number(form.priority),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      ctaLabel: form.ctaLabel || null,
      ctaHref: form.ctaHref || null,
    }
    const url = editingId ? `/api/admin/banners/${editingId}` : '/api/admin/banners'
    const method = editingId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    setSaving(false)
    if (!data.success) { setError(data.error?.message ?? 'Something went wrong'); return }
    setShowForm(false)
    load()
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
  }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }
  const input: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1.5px solid #E2E8F0', borderRadius: 8,
    fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box',
    background: '#F8FAFC',
  }
  const select: React.CSSProperties = { ...input, cursor: 'pointer' }

  return (
    <div style={{ padding: '36px 44px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <p style={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Content</p>
          <h1 style={{ color: '#0F172A', fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.8px' }}>Banners</h1>
          <p style={{ color: '#64748B', fontSize: 13, margin: '6px 0 0' }}>Manage sitewide promotional and informational banners.</p>
        </div>
        <button
          onClick={openCreate}
          style={{ background: '#0F172A', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          + New banner
        </button>
      </div>

      {/* Banner list */}
      <div style={card}>
        {loading && (
          <p style={{ padding: '32px 24px', color: '#94A3B8', fontSize: 14 }}>Loading…</p>
        )}
        {!loading && banners.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📢</div>
            <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>No banners yet. Create one to show announcements sitewide.</p>
          </div>
        )}
        {!loading && banners.map((b, i) => {
          const vc = VARIANT_COLORS[b.variant] ?? VARIANT_COLORS.info
          return (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px',
              borderBottom: i < banners.length - 1 ? '1px solid #F1F5F9' : 'none',
            }}>
              {/* Enabled toggle */}
              <button
                onClick={() => toggleEnabled(b)}
                title={b.enabled ? 'Click to disable' : 'Click to enable'}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: b.enabled ? '#10B981' : '#CBD5E1',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: b.enabled ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>

              {/* Variant badge */}
              <span style={{
                background: vc.bg, color: vc.text,
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
              }}>
                {b.variant}
              </span>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748B', background: '#F1F5F9', padding: '1px 6px', borderRadius: 4 }}>{b.key}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>→ {TARGET_LABELS[b.target]}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>· priority {b.priority}</span>
                </div>
                <p style={{ fontSize: 14, color: '#0F172A', margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.text}
                  {b.ctaLabel && <span style={{ color: '#6366F1', marginLeft: 8 }}>[{b.ctaLabel}]</span>}
                </p>
                {(b.startsAt || b.endsAt) && (
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '3px 0 0' }}>
                    {b.startsAt ? `from ${new Date(b.startsAt).toLocaleDateString('en-GB')}` : ''}
                    {b.startsAt && b.endsAt ? ' · ' : ''}
                    {b.endsAt ? `until ${new Date(b.endsAt).toLocaleDateString('en-GB')}` : ''}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => openEdit(b)}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteBanner(b.id)}
                  style={{ background: '#FFE4E6', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#9F1239', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '32px 36px',
            width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 24px', letterSpacing: '-0.5px' }}>
              {editingId ? 'Edit banner' : 'Create banner'}
            </h2>

            <form onSubmit={submitForm}>
              <div style={{ display: 'grid', gap: 16 }}>

                {/* Key */}
                <div>
                  <label style={label}>Key <span style={{ color: '#94A3B8', fontWeight: 400 }}>(unique slug)</span></label>
                  <input style={input} value={form.key} required disabled={!!editingId}
                    placeholder="launch_week_2026"
                    onChange={e => setForm(f => ({ ...f, key: e.target.value }))} />
                </div>

                {/* Text */}
                <div>
                  <label style={label}>Banner text</label>
                  <textarea style={{ ...input, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }}
                    value={form.text} required maxLength={300}
                    placeholder="Your announcement text here…"
                    onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{form.text.length}/300</span>
                </div>

                {/* Variant + Target */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>Variant</label>
                    <select style={select} value={form.variant}
                      onChange={e => setForm(f => ({ ...f, variant: e.target.value as Banner['variant'] }))}>
                      <option value="info">Info (blue)</option>
                      <option value="promo">Promo (green)</option>
                      <option value="warning">Warning (amber)</option>
                      <option value="urgent">Urgent (red)</option>
                    </select>
                  </div>
                  <div>
                    <label style={label}>Show to</label>
                    <select style={select} value={form.target}
                      onChange={e => setForm(f => ({ ...f, target: e.target.value as Banner['target'] }))}>
                      <option value="all">Everyone</option>
                      <option value="unsubscribed">Unsubscribed</option>
                      <option value="subscribed">Subscribed</option>
                      <option value="travelers">Travelers only</option>
                      <option value="hosts">Hosts only</option>
                    </select>
                  </div>
                </div>

                {/* CTA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>CTA label <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span></label>
                    <input style={input} value={form.ctaLabel} placeholder="Subscribe now"
                      onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))} />
                  </div>
                  <div>
                    <label style={label}>CTA URL <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span></label>
                    <input style={input} value={form.ctaHref} placeholder="/subscribe"
                      onChange={e => setForm(f => ({ ...f, ctaHref: e.target.value }))} />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label style={label}>Priority <span style={{ color: '#94A3B8', fontWeight: 400 }}>(higher = shown first, 0–100)</span></label>
                  <input style={{ ...input, width: 120 }} type="number" min={0} max={100} value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} />
                </div>

                {/* Schedule */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>Start date/time <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span></label>
                    <input style={input} type="datetime-local" value={form.startsAt}
                      onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
                  </div>
                  <div>
                    <label style={label}>End date/time <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span></label>
                    <input style={input} type="datetime-local" value={form.endsAt}
                      onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} />
                  </div>
                </div>

                {/* Dismissible */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.dismissible}
                    onChange={e => setForm(f => ({ ...f, dismissible: e.target.checked }))} />
                  <span style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>Allow users to dismiss this banner</span>
                </label>

              </div>

              {error && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#FFE4E6', borderRadius: 8, color: '#9F1239', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ background: '#0F172A', border: 'none', borderRadius: 9, padding: '10px 24px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
