import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number | null | undefined): string {
  if (!cents) return 'Negotiable'
  return `€${(cents / 100).toFixed(0)}/hr`
}

export function formatRating(rating: string | null | undefined): string {
  if (!rating) return 'New'
  return parseFloat(rating).toFixed(1)
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max).trimEnd() + '…'
}
