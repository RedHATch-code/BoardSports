import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ReportForm } from '@/components/forms/report-form'
import { PageShell } from '@/components/layout/page-shell'
import { FavoriteSpotButton } from '@/components/spots/favorite-spot-button'
import { SpotMap } from '@/components/spots/spot-map'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  getSpotDifficultyLabel,
  getSpotVisibilityLabel
} from '@/features/spots/constants'
import { getCurrentUser } from '@/features/auth/queries'
import { createSpotReportAction } from '@/features/reports/actions'
import { getSpotBySlug } from '@/features/spots/queries'

type SpotDetailPageProps = {
  params: Promise<{ slug: string }>
}

export default async function SpotDetailPage({ params }: SpotDetailPageProps) {
  const { slug } = await params
  const currentUser = await getCurrentUser()
  const spot = await getSpotBySlug(slug, currentUser?.id)

  if (!spot) {
    notFound()
  }

  return (
    <PageShell className="space-y-8">
      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {spot.sport ? <Badge>{spot.sport.name}</Badge> : null}
            <Badge className="border-white/8 bg-slate-950/62 text-white/78">
              {getSpotVisibilityLabel(spot.visibility)}
            </Badge>
            <Badge className="border-white/8 bg-slate-950/62 text-white/78">
              {getSpotDifficultyLabel(spot.difficulty)}
            </Badge>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">{spot.title}</h1>
            <p className="max-w-3xl text-sm leading-7 text-white/68">{spot.description}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Localizacao
              </p>
              <p className="text-xl font-semibold text-white">{spot.locationLabel}</p>
              <p className="text-sm text-white/56">
                {spot.hasApproximateLocation
                  ? 'Coordenadas aproximadas para proteger um spot sensivel.'
                  : 'Coordenadas detalhadas visiveis neste contexto.'}
              </p>
            </Card>

            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Comunidade
              </p>
              <p className="text-xl font-semibold text-white">
                {spot.owner?.fullName ?? spot.owner?.username ?? 'Gestao privada do spot'}
              </p>
              {spot.owner?.username ? (
                <Link
                  href={`/perfil/${spot.owner.username}`}
                  className="text-sm text-cyan-100/76 transition hover:text-cyan-100"
                >
                  @{spot.owner.username}
                </Link>
              ) : (
                <p className="text-sm text-white/56">Spot da tua area privada.</p>
              )}
            </Card>
          </div>
        </div>

        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
              Contexto do spot
            </p>
            <p className="text-sm leading-7 text-white/62">
              Melhor horario: {spot.bestTime ?? 'nao indicado'}
            </p>
            <p className="text-sm leading-7 text-white/62">
              Seguranca: {spot.safetyNotes ?? 'sem notas publicas adicionais'}
            </p>
          </div>

          <div className="grid gap-3">
            {spot.canEdit ? (
              <Link
                href={`/spots/${spot.slug}/editar`}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Editar spot
              </Link>
            ) : (
              <FavoriteSpotButton
                spotId={spot.id}
                isFavorite={spot.isFavorite}
                isAuthenticated={Boolean(currentUser)}
                path={`/spots/${spot.slug}`}
              />
            )}
          </div>
        </Card>
      </section>

      <SpotMap
        activeSpotId={spot.id}
        spots={[
          {
            id: spot.id,
            slug: spot.slug,
            title: spot.title,
            latitude: spot.latitude,
            longitude: spot.longitude,
            visibility: spot.visibility,
            locationLabel: spot.locationLabel,
            sportName: spot.sport?.name
          }
        ]}
        heightClassName="min-h-[420px]"
      />

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {spot.images.length ? (
          spot.images.map((image, index) => (
            <Card key={image.id} className="overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.publicUrl}
                alt={`${spot.title} ${index + 1}`}
                className="aspect-square h-full w-full object-cover"
              />
            </Card>
          ))
        ) : (
          <Card className="xl:col-span-3">
            <p className="text-sm text-white/56">Este spot ainda nao tem imagens publicadas.</p>
          </Card>
        )}
      </section>

      {!spot.canEdit ? (
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
              Moderacao basica
            </p>
            <h2 className="text-2xl font-semibold text-white">Denunciar spot</h2>
            <p className="max-w-2xl text-sm leading-7 text-white/62">
              Se este spot tiver informacao enganosa, localizacao abusiva ou outro problema,
              envia a denuncia para revisao.
            </p>
          </div>

          {currentUser ? (
            <ReportForm
              action={createSpotReportAction}
              hiddenFields={[{ name: 'spotId', value: spot.id }]}
            />
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/8"
            >
              Entrar para denunciar
            </Link>
          )}
        </Card>
      ) : null}
    </PageShell>
  )
}
