import type { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'

type PageShellProps = PropsWithChildren<{
  className?: string
}>

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}
