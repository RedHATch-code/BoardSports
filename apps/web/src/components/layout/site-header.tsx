import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { primaryNav } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { CurrentUser } from '@/features/auth/queries'
import { signOutAction } from '@/features/auth/actions'

type SiteHeaderProps = {
  pathname: string
  user: CurrentUser | null
}

export function SiteHeader({ pathname, user }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-slate-950/74 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_top,#67e8f9,transparent_55%),linear-gradient(135deg,#f59e0b_0%,#0f172a_85%)] text-sm font-bold tracking-[0.28em] text-white">
            BS
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100/80">
              BoardSports
            </p>
            <p className="text-xs text-white/45">Portugal MVP</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {primaryNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium text-white/62 transition hover:bg-white/8 hover:text-white',
                  active && 'bg-white/10 text-white'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Badge className="hidden sm:inline-flex">MVP comunidade + spots</Badge>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href={user.profile?.username ? `/perfil/${user.profile.username}` : '/conta'}
                className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-white/72 transition hover:bg-white/8 sm:inline-flex"
              >
                {user.profile?.username ?? user.email ?? 'Conta'}
              </Link>
              <form action={signOutAction}>
                <Button type="submit" variant="secondary">
                  Sair
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/78 transition hover:bg-white/8"
              >
                Entrar
              </Link>
              <Link
                href="/registo"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-slate-950 shadow-[0_12px_35px_rgba(245,158,11,0.22)] transition hover:bg-amber-300"
              >
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
