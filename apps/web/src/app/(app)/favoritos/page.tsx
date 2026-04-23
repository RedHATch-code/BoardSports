import { PageShell } from '@/components/layout/page-shell'
import { ProductCard } from '@/components/marketplace/product-card'
import { SpotCard } from '@/components/spots/spot-card'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { requireCurrentUser } from '@/features/auth/queries'
import { listFavoriteProducts } from '@/features/marketplace/queries'
import { listFavoriteSpots } from '@/features/spots/queries'

export default async function FavoritesPage() {
  const user = await requireCurrentUser()
  const [favoriteProducts, favoriteSpots] = await Promise.all([
    listFavoriteProducts(user.id),
    listFavoriteSpots(user.id)
  ])

  return (
    <PageShell className="space-y-8">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
          Favoritos
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
          O teu radar pessoal de material e spots.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/66">
          Guardas anuncios e spots no mesmo sitio para manteres o que queres seguir de perto.
        </p>
      </section>

      {favoriteProducts.length || favoriteSpots.length ? (
        <>
          <section className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Produtos guardados
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                Marketplace em observacao.
              </h2>
            </div>

            {favoriteProducts.length ? (
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {favoriteProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    path="/favoritos"
                    isAuthenticated
                  />
                ))}
              </div>
            ) : (
              <Card>
                <p className="text-sm text-white/60">Ainda nao tens produtos guardados.</p>
              </Card>
            )}
          </section>

          <section className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Spots guardados
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                Locais para voltar mais tarde.
              </h2>
            </div>

            {favoriteSpots.length ? (
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {favoriteSpots.map((spot) => (
                  <SpotCard
                    key={spot.id}
                    spot={spot}
                    path="/favoritos"
                    isAuthenticated
                  />
                ))}
              </div>
            ) : (
              <Card>
                <p className="text-sm text-white/60">Ainda nao tens spots guardados.</p>
              </Card>
            )}
          </section>
        </>
      ) : (
        <EmptyState
          eyebrow="Favoritos"
          title="Ainda nao guardaste produtos nem spots"
          description="Explora o marketplace e o mapa para ires construindo a tua shortlist."
          ctaHref="/produtos"
          ctaLabel="Explorar marketplace"
        />
      )}
    </PageShell>
  )
}
