'use client'

import type { PropsWithChildren } from 'react'
import { usePathname } from 'next/navigation'

import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { SiteHeader } from '@/components/layout/site-header'
import type { CurrentUser } from '@/features/auth/queries'

type AppChromeProps = PropsWithChildren<{
  user: CurrentUser | null
}>

export function AppChrome({ children, user }: AppChromeProps) {
  const pathname = usePathname()

  return (
    <>
      <SiteHeader pathname={pathname} user={user} />
      <main className="min-h-[calc(100vh-73px)] pb-24 lg:pb-10">{children}</main>
      <MobileBottomNav pathname={pathname} />
    </>
  )
}
