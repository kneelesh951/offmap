'use client'

import { useRef } from 'react'

interface DateInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  required?: boolean
  error?: string
}

export function DateInput({ label, value, onChange, min, max, required, error }: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const formatted = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <div>
      <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#0F3D22', fontSize: '14px', letterSpacing: '-0.01em' }}>
        {label}
        {required && <span style={{ color: '#E8621A', marginLeft: '3px' }}>*</span>}
      </label>
      <div
        onClick={() => inputRef.current?.showPicker?.()}
        style={{
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        {/* Visible display */}
        <div style={{
          width: '100%',
          padding: '13px 44px 13px 16px',
          borderRadius: '12px',
          border: error ? '2px solid #dc2626' : value ? '2px solid #0F3D22' : '2px solid #d1d5db',
          fontSize: '15px',
          fontWeight: 600,
          color: value ? '#0F3D22' : '#9ca3af',
          backgroundColor: '#fff',
          transition: 'all 0.2s',
          minHeight: '48px',
          display: 'flex',
          alignItems: 'center',
          letterSpacing: '-0.01em',
        }}>
          {formatted || 'Select date'}
        </div>

        {/* Calendar icon */}
        <div style={{
          position: 'absolute',
          right: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: value ? '#0F3D22' : '#9ca3af',
          display: 'flex',
          alignItems: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="4" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M2 8.5H18" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M6.5 2V5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M13.5 2V5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="7" cy="12.5" r="1" fill="currentColor"/>
            <circle cx="10" cy="12.5" r="1" fill="currentColor"/>
            <circle cx="13" cy="12.5" r="1" fill="currentColor"/>
          </svg>
        </div>

        {/* Hidden native input */}
        <input
          ref={inputRef}
          type="date"
          value={value}
          min={min}
          max={max}
          required={required}
          onChange={e => onChange(e.target.value)}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
        />
      </div>
      {error && (
        <p style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '6px' }}>{error}</p>
      )}
    </div>
  )
}
