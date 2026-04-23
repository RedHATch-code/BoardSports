import type { Metadata } from 'next'

import { AppChrome } from '@/components/layout/app-chrome'
import { getCurrentUser } from '@/features/auth/queries'

import 'leaflet/dist/leaflet.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'BoardSports Portugal',
  description: 'Marketplace e mapa de spots para a comunidade de desportos de prancha em Portugal.'
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentUser()

  return (
    <html lang="pt">
      <body>
        <AppChrome user={user}>{children}</AppChrome>
      </body>
    </html>
  )
}
