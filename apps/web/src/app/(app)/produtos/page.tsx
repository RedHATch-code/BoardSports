import { PageShell } from '@/components/layout/page-shell'
import { ProductCard } from '@/components/marketplace/product-card'
import { ProductFilters } from '@/components/marketplace/product-filters'
import { EmptyState } from '@/components/ui/empty-state'
import { getCurrentUser } from '@/features/auth/queries'
import {
  getMarketplaceSports,
  listMarketplaceProducts,
  normalizeMarketplaceFilters
} from '@/features/marketplace/queries'
import Link from 'next/link'

type ProductsExplorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductsExplorePage({ searchParams }: ProductsExplorePageProps) {
  const [currentUser, rawSearchParams, sports] = await Promise.all([
    getCurrentUser(),
    searchParams,
    getMarketplaceSports()
  ])
  const filters = normalizeMarketplaceFilters(rawSearchParams)
  const products = await listMarketplaceProducts(filters, currentUser?.id)

  return (
    <PageShell className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
            Marketplace
          </p>
          <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
            Material usado a circular dentro da comunidade.
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-white/66">
            Filtra por modalidade, categoria, localizacao e preco para encontrar pranchas,
            acessorios e equipamento com foco inicial em Portugal.
          </p>
        </div>

        {currentUser ? (
          <Link
            href="/produtos/novo"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Criar anuncio
          </Link>
        ) : null}
      </section>

      <ProductFilters sports={sports} values={filters} />

      {products.length ? (
        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              path="/produtos"
              isAuthenticated={Boolean(currentUser)}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          eyebrow="Marketplace"
          title="Nenhum anuncio encontrado com estes filtros"
          description="Ajusta modalidade, localizacao ou preco para abrir mais resultados, ou cria o primeiro anuncio nesta combinacao."
          ctaHref={currentUser ? '/produtos/novo' : '/login'}
          ctaLabel={currentUser ? 'Criar anuncio' : 'Entrar'}
        />
      )}
    </PageShell>
  )
}
