'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, BarChart3, Search, GitBranch, Settings } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import type { SessionUser } from '@/types/user'
import { LogoutButton } from '@/components/logout-button'

const tabs = [
  {
    name: 'Workflows',
    href: '/workflows',
    icon: GitBranch,
  },
  {
    name: 'Upload & Extract',
    href: '/upload-and-extract',
    icon: FileText,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    name: 'Search',
    href: '/search',
    icon: Search,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    adminOnly: true,
  },
]

export function Navigation() {
  const pathname = usePathname()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadUser = async () => {
      try {
        const response = await fetch('/api/me')
        if (!response.ok) throw new Error('Failed to load user')
        const data = await response.json()
        if (isMounted) {
          setUser(data.user || null)
        }
      } catch {
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoadingUser(false)
        }
      }
    }
    loadUser()
    return () => {
      isMounted = false
    }
  }, [pathname])

  if (pathname === '/login') {
    return null
  }

  return (
    <aside className="w-72 border-r border-[#123047] bg-[#011524] flex flex-col h-screen sticky top-0 z-50 overflow-y-auto">
      {/* Sidebar Header */}
      <div className="px-3 pt-3 pb-2">
        <Link href="/" className="flex w-full items-center justify-center rounded-2xl bg-white/5 px-1 py-1 ring-1 ring-white/10 min-h-[140px]">
          <Image
            src="/images/PCG_MindRift_Co_Logo-09.png"
            alt="Custom Capital"
            width={340}
            height={160}
            className="h-28 w-full object-contain"
          />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 pb-6 pt-2">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8fb5cf]">
          Workspace
        </p>
        <div className="space-y-1.5">
        {tabs.map((tab) => {
          // Filter admin-only tabs
          if (tab.adminOnly) {
            const isAdmin = user?.role.toLowerCase().includes('admin')
              || user?.role.toLowerCase().includes('all access')
            if (!isAdmin) return null
          }

          const isActive = pathname === tab.href
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'group flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-[#0e3854] text-white shadow-md ring-1 ring-[#2a5675]'
                  : 'text-[#d5e6f3] hover:text-white hover:bg-white/10 hover:translate-x-1 hover:shadow-sm'
              )}
            >
              <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-white" : "text-[#b9d4e6] group-hover:text-white")} />
              <span>{tab.name}</span>
            </Link>
          )
        })}
        </div>
      </nav>

      {/* User Footer */}
      <div className="border-t border-white/10 bg-gradient-to-b from-white/[0.02] to-white/[0.05] p-4">
        <div className="mb-3 rounded-xl bg-white/[0.05] px-3 py-3 ring-1 ring-white/10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0e3854] text-sm font-bold text-white ring-1 ring-white/20">
              {(isLoadingUser ? 'U' : user?.full_name?.trim()?.charAt(0)?.toUpperCase()) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-white">
                {isLoadingUser ? 'Loading...' : user?.full_name || 'Unknown user'}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-wider text-[#9cc3db]">
                {user?.role || (isLoadingUser ? '' : 'Role unavailable')}
              </p>
            </div>
          </div>
        </div>
        <LogoutButton
          variant="outline"
          size="default"
          className="w-full justify-center rounded-xl border-white/25 bg-white/[0.04] font-medium text-[#e2eff8] hover:border-red-300/60 hover:bg-red-500/15 hover:text-[#ffd9d9] transition-colors"
        />
      </div>
    </aside>
  )
}
