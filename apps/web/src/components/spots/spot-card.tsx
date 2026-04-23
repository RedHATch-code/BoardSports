import Link from 'next/link'
import { Compass, MapPin, PencilLine } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FavoriteSpotButton } from '@/components/spots/favorite-spot-button'
import {
  getSpotDifficultyLabel,
  getSpotVisibilityLabel
} from '@/features/spots/constants'
import type { SpotListItem } from '@/features/spots/types'
import { truncateText } from '@/lib/utils'

type SpotCardProps = {
  spot: SpotListItem
  path: string
  isAuthenticated: boolean
}

export function SpotCard({ spot, path, isAuthenticated }: SpotCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="relative aspect-[1.15/0.84] overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_top,#22d3ee40,transparent_48%),linear-gradient(160deg,#0f172a,#102039_60%,#111827)]">
        {spot.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={spot.coverImageUrl} alt={spot.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.26em] text-cyan-100/54">
            Sem imagem
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {spot.sport ? <Badge>{spot.sport.name}</Badge> : null}
          <Badge className="border-white/8 bg-slate-950/62 text-white/78">
            {getSpotVisibilityLabel(spot.visibility)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="space-y-3">
          <Link href={`/spots/${spot.slug}`} className="block">
            <h2 className="text-2xl font-semibold leading-tight text-white transition hover:text-cyan-100">
              {spot.title}
            </h2>
          </Link>

          <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.18em] text-white/46">
            <span>{getSpotDifficultyLabel(spot.difficulty)}</span>
            {spot.bestTime ? <span>{spot.bestTime}</span> : null}
          </div>

          <p className="text-sm leading-7 text-white/64">{truncateText(spot.description, 140)}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
          <div className="space-y-1 text-sm text-white/60">
            <p className="font-medium text-white/76">
              {spot.owner?.fullName ?? spot.owner?.username ?? 'Spot da comunidade'}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-100/56" />
              {spot.locationLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {spot.isOwner ? (
              <Link
                href={`/spots/${spot.slug}/editar`}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/8"
              >
                <PencilLine className="mr-2 h-4 w-4" />
                Editar
              </Link>
            ) : (
              <FavoriteSpotButton
                spotId={spot.id}
                isFavorite={spot.isFavorite}
                isAuthenticated={isAuthenticated}
                path={path}
              />
            )}

            <Link
              href={`/spots/${spot.slug}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              <Compass className="mr-2 h-4 w-4" />
              Ver spot
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}
