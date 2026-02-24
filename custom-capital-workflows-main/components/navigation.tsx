'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, BarChart3, Search, FolderOpen, GitBranch, Settings } from 'lucide-react'
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
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-3wiKJEklf4OsaYyPsYX22HXVNLZ0TW.jpg"
                alt="Custom Capital"
                width={180}
                height={60}
                className="h-12 w-auto"
              />
            </Link>
            
            <div className="flex gap-1">
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
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{tab.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight">
                {isLoadingUser ? 'Loading...' : user?.full_name || 'Unknown user'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.role || (isLoadingUser ? '' : 'Role unavailable')}
              </p>
            </div>
            <LogoutButton size="sm" />
          </div>
        </div>
      </div>
    </nav>
  )
}
