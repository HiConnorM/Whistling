'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/reports', label: 'Weekly Briefs', icon: BookOpen },
  { href: '/mentions', label: 'Mentions', icon: MessageSquare },
  { href: '/recommendations', label: 'Recommendations', icon: Zap },
  { href: '/competitors', label: 'Competitors', icon: Users },
  { href: '/sources', label: 'Sources', icon: Shield },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="border-b border-gray-100 px-5 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900">
            <span className="text-xs font-bold text-white">W</span>
          </div>
          <span className="font-semibold text-gray-900">Whistling.io</span>
        </Link>
      </div>

      {/* Business selector */}
      <div className="border-b border-gray-100 px-4 py-3">
        <button className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-xs font-medium text-blue-700">
              G
            </div>
            <span className="font-medium text-gray-900">George&apos;s Restaurant</span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-gray-100 font-medium text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-gray-700' : 'text-gray-400')} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
              U
            </div>
            <div>
              <div className="text-xs font-medium text-gray-900">User</div>
              <div className="text-xs text-gray-500">Pro plan</div>
            </div>
          </div>
          <button className="rounded p-1 text-gray-400 hover:text-gray-600">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
