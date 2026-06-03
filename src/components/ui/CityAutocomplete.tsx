'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown } from 'lucide-react'

export interface CityOption {
  id: string
  name: string
  country: string
  countryCode: string
  flagEmoji: string
  hostCount: number
}

interface Props {
  cities: CityOption[]
  value: string
  onChange: (id: string) => void
}

const GREEN = '#0F3D22'
const TERRA = '#E8621A'

function FlagImg({ countryCode, size = 20 }: { countryCode: string; size?: number }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      alt=""
      width={size}
      height={size}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        border: '1.5px solid rgba(0,0,0,0.10)',
      }}
    />
  )
}

export function CityAutocomplete({ cities, value, onChange }: Props) {
  const selected = cities.find(c => c.id === value) ?? null
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const suggestions = query.trim() === ''
    ? cities.slice(0, 10)
    : cities.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.country.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return
      setIsOpen(false)
      setQuery('')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const selectCity = useCallback((city: CityOption | null) => {
    onChange(city?.id ?? '')
    setQuery('')
    setIsOpen(false)
    setActiveIndex(-1)
  }, [onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0 && suggestions[activeIndex]) selectCity(suggestions[activeIndex]) }
    else if (e.key === 'Escape') { setIsOpen(false); setQuery('') }
  }

  // Compute dropdown position
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  useEffect(() => {
    if (!isOpen || !wrapperRef.current) return
    const r = wrapperRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: Math.max(r.width, 300) })
  }, [isOpen])

  const displayValue = isOpen ? query : (selected ? selected.name : '')

  return (
    <>
      <div ref={wrapperRef} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        {/* Flag or chevron icon */}
        <div style={{ flexShrink: 0 }}>
          {selected
            ? <FlagImg countryCode={selected.countryCode} size={22} />
            : <ChevronDown size={14} style={{ color: TERRA }} />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              ref={inputRef}
              type="text"
              value={displayValue}
              placeholder={selected ? selected.name : 'Any city…'}
              autoComplete="off"
              onChange={e => {
                setQuery(e.target.value)
                setIsOpen(true)
                setActiveIndex(-1)
                if (e.target.value === '') onChange('')
              }}
              onFocus={() => { setIsOpen(true); setQuery('') }}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600,
                outline: 'none', border: 'none', background: 'transparent',
                color: displayValue ? GREEN : '#9CAD9E',
              }}
            />
            {selected && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); selectCity(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9CAD9E', display: 'flex', flexShrink: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Portal dropdown — renders into document.body, escapes all overflow:hidden parents */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top - window.scrollY,
            left: pos.left - window.scrollX,
            width: pos.width,
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 16px 48px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.10)',
            border: '1px solid rgba(15,61,34,0.10)',
            overflow: 'hidden',
            zIndex: 9999,
            maxHeight: 340,
            overflowY: 'auto',
          }}
        >
          {suggestions.length === 0 ? (
            <div style={{ padding: '16px', fontSize: 13, color: '#9CAD9E', textAlign: 'center' }}>
              No cities found — we&apos;re expanding soon!
            </div>
          ) : suggestions.map((city, i) => {
            const isActive = i === activeIndex
            const isSelected = city.id === value
            return (
              <div
                key={city.id}
                onClick={() => selectCity(city)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', cursor: 'pointer',
                  background: isActive ? 'rgba(232,98,26,0.08)' : isSelected ? 'rgba(232,98,26,0.05)' : '#fff',
                  borderBottom: i < suggestions.length - 1 ? '1px solid rgba(15,61,34,0.04)' : 'none',
                }}
                onMouseEnter={e => { setActiveIndex(i); e.currentTarget.style.background = 'rgba(232,98,26,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(232,98,26,0.05)' : '#fff' }}
              >
                <FlagImg countryCode={city.countryCode} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isActive || isSelected ? TERRA : GREEN }}>
                    {city.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CAD9E' }}>
                    {city.country}
                  </div>
                </div>
                {isSelected && <span style={{ fontSize: 11, fontWeight: 700, color: TERRA, flexShrink: 0 }}>✓</span>}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
