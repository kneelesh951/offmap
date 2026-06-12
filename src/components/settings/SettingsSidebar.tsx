'use client'

import Link from 'next/link'

const TABS = [
  { key: 'profile',      label: 'Profile',      href: '/settings/profile',  icon: '👤' },
  { key: 'account',      label: 'Account',      href: '/settings/account',  icon: '⚙️' },
  { key: 'subscription', label: 'Subscription', href: '/pricing',           icon: '💳' },
  { key: 'privacy',      label: 'Privacy',      href: '/settings/privacy',  icon: '🔒' },
] as const

interface SettingsSidebarProps {
  active: 'profile' | 'account' | 'subscription' | 'privacy'
}

export function SettingsSidebar({ active }: SettingsSidebarProps) {
  return (
    <aside className="hidden md:flex flex-col gap-1 w-52 flex-shrink-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3 px-3"
        style={{ color: 'rgba(8,78,78,0.45)' }}>
        Settings
      </p>
      {TABS.map(tab => {
        const isActive = tab.key === active
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all"
            style={
              isActive
                ? { background: '#084E4E', color: '#fff', boxShadow: '0 2px 8px rgba(8,78,78,0.25)' }
                : { color: 'rgba(8,78,78,0.70)' }
            }
          >
            <span className="text-[15px]">{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </aside>
  )
}
