import Link from 'next/link'

import { ProductCard } from '@/components/marketplace/product-card'
import { SpotCard } from '@/components/spots/spot-card'
import { PageShell } from '@/components/layout/page-shell'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { requireCurrentUser } from '@/features/auth/queries'
import { listOwnedProducts } from '@/features/marketplace/queries'
import { listOwnedSpots } from '@/features/spots/queries'

const quickLinks = [
  { href: '/produtos/novo', label: 'Criar anuncio', description: 'Novo produto para venda' },
  { href: '/spots/novo', label: 'Adicionar spot', description: 'Novo spot no mapa' },
  { href: '/favoritos', label: 'Ver favoritos', description: 'Produtos e spots guardados' },
  { href: '/inbox', label: 'Abrir inbox', description: 'Mensagens ligadas aos teus anuncios' }
] as const

export default async function DashboardPage() {
  const user = await requireCurrentUser()
  const [ownProducts, ownSpots] = await Promise.all([
    listOwnedProducts(user.id),
    listOwnedSpots(user.id)
  ])
  const counts = {
    total: ownProducts.length,
    active: ownProducts.filter((product) => product.status === 'active').length,
    draft: ownProducts.filter((product) => product.status === 'draft').length,
    sold: ownProducts.filter((product) => product.status === 'sold').length,
    spots: ownSpots.length
  }

  return (
    <PageShell className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-5">
          <Badge>Area autenticada</Badge>
          <div className="space-y-3">
            <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
              {user.profile?.full_name ?? user.email ?? 'Bem-vindo'}.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/66">
              Esta e a base do teu workspace no MVP. A partir daqui vais gerir conta, anuncios, spots, favoritos e inbox.
            </p>
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">Conta</p>
          <div className="space-y-2 text-sm text-white/66">
            <p>Email: {user.email}</p>
            <p>Username: {user.profile?.username ?? 'por definir'}</p>
            <p>Perfil publico: {user.profile?.username ? `/perfil/${user.profile.username}` : 'ainda nao publicado'}</p>
          </div>
          <Link
            href="/conta"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/8"
          >
            Editar conta
          </Link>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total de anuncios', value: counts.total },
          { label: 'Ativos', value: counts.active },
          { label: 'Rascunhos', value: counts.draft },
          { label: 'Vendidos', value: counts.sold },
          { label: 'Spots teus', value: counts.spots }
        ].map((item) => (
          <Card key={item.label} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/68">
              Marketplace
            </p>
            <p className="text-4xl font-semibold tracking-[-0.05em] text-white">{item.value}</p>
            <p className="text-sm text-white/60">{item.label}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full space-y-2 transition hover:-translate-y-0.5 hover:border-cyan-200/20">
              <h2 className="text-lg font-semibold text-white">{item.label}</h2>
              <p className="text-sm leading-7 text-white/62">{item.description}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
              Teus anuncios
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
              Gestao simples do proprio catalogo.
            </h2>
          </div>

          <Link
            href="/produtos/novo"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Novo anuncio
          </Link>
        </div>

        {ownProducts.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {ownProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                path="/painel"
                isAuthenticated
                showStatus
              />
            ))}
          </div>
        ) : (
          <Card className="space-y-3">
            <h3 className="text-2xl font-semibold text-white">Ainda nao publicaste material.</h3>
            <p className="max-w-2xl text-sm leading-7 text-white/62">
              Cria o primeiro anuncio para testares o fluxo completo do marketplace: publicacao,
              detalhe, edicao, favoritos e gestao no painel.
            </p>
          </Card>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
              Teus spots
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
              Mapa privado e spots publicados.
            </h2>
          </div>

          <Link
            href="/spots/novo"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Novo spot
          </Link>
        </div>

        {ownSpots.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {ownSpots.map((spot) => (
              <SpotCard key={spot.id} spot={spot} path="/painel" isAuthenticated />
            ))}
          </div>
        ) : (
          <Card className="space-y-3">
            <h3 className="text-2xl font-semibold text-white">Ainda nao adicionaste spots.</h3>
            <p className="max-w-2xl text-sm leading-7 text-white/62">
              Adiciona spots publicos, sensiveis ou privados e usa o painel como base de gestao do
              teu mapa.
            </p>
          </Card>
        )}
      </section>
    </PageShell>
  )
}
