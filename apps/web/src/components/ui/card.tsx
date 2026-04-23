import type { HTMLAttributes, PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'

export function Card({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.32)] backdrop-blur',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
