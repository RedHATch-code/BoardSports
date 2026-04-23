import Link from 'next/link'

import { primaryNav } from '@/lib/routes'
import { cn } from '@/lib/utils'

type MobileBottomNavProps = {
  pathname: string
}

export function MobileBottomNav({ pathname }: MobileBottomNavProps) {
  return (
    <nav className="fixed inset-x-3 bottom-4 z-40 lg:hidden">
      <div className="grid grid-cols-6 rounded-[28px] border border-white/10 bg-slate-950/86 p-2 shadow-[0_22px_50px_rgba(2,6,23,0.34)] backdrop-blur-xl">
        {primaryNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium text-white/52 transition',
                active && 'bg-white/10 text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
