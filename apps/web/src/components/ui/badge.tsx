import type { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'

export function Badge({
  children,
  className
}: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100',
        className
      )}
    >
      {children}
    </span>
  )
}
