import { PageShell } from '@/components/layout/page-shell'
import { SpotCard } from '@/components/spots/spot-card'
import { SpotFilters } from '@/components/spots/spot-filters'
import { SpotMap } from '@/components/spots/spot-map'
import { EmptyState } from '@/components/ui/empty-state'
import { getCurrentUser } from '@/features/auth/queries'
import {
  getSpotSports,
  listExploreSpots,
  normalizeSpotFilters
} from '@/features/spots/queries'
import Link from 'next/link'

type SpotsExplorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SpotsExplorePage({ searchParams }: SpotsExplorePageProps) {
  const [currentUser, rawSearchParams, sports] = await Promise.all([
    getCurrentUser(),
    searchParams,
    getSpotSports()
  ])
  const filters = normalizeSpotFilters(rawSearchParams)
  const spots = await listExploreSpots(filters, currentUser?.id)

  return (
    <PageShell className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
            Spots
          </p>
          <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
            Mapa comunitario com foco inicial em Portugal.
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-white/66">
            Explora spots publicos e sensiveis, guarda os teus favoritos e gere tambem os spots
            privados que so tu deves ver.
          </p>
        </div>

        {currentUser ? (
          <Link
            href="/spots/novo"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Adicionar spot
          </Link>
        ) : null}
      </section>

      <SpotFilters sports={sports} values={filters} />

      <SpotMap
        spots={spots.map((spot) => ({
          id: spot.id,
          slug: spot.slug,
          title: spot.title,
          latitude: spot.latitude,
          longitude: spot.longitude,
          visibility: spot.visibility,
          locationLabel: spot.locationLabel,
          sportName: spot.sport?.name
        }))}
      />

      {spots.length ? (
        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {spots.map((spot) => (
            <SpotCard
              key={spot.id}
              spot={spot}
              path="/spots"
              isAuthenticated={Boolean(currentUser)}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          eyebrow="Mapa"
          title="Nenhum spot encontrado com este filtro"
          description="Limpa o filtro atual ou adiciona o primeiro spot desta modalidade."
          ctaHref={currentUser ? '/spots/novo' : '/login'}
          ctaLabel={currentUser ? 'Adicionar spot' : 'Entrar'}
        />
      )}
    </PageShell>
  )
}
