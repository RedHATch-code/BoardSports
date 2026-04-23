import Link from 'next/link'
import { MapPin, PencilLine } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FavoriteProductButton } from '@/components/marketplace/favorite-product-button'
import {
  getProductCategoryLabel,
  getProductConditionLabel,
  getProductStatusLabel
} from '@/features/marketplace/constants'
import type { ProductListItem } from '@/features/marketplace/types'
import { formatCurrencyFromCents, truncateText } from '@/lib/utils'

type ProductCardProps = {
  product: ProductListItem
  path: string
  isAuthenticated: boolean
  showStatus?: boolean
}

export function ProductCard({
  product,
  path,
  isAuthenticated,
  showStatus = false
}: ProductCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="relative aspect-[1.1/0.86] overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_top,#67e8f950,transparent_55%),linear-gradient(160deg,#132235,#0f172a_60%,#111827)]">
        {product.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverImageUrl}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.26em] text-cyan-100/54">
            Sem imagem
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.sport ? <Badge>{product.sport.name}</Badge> : null}
          {showStatus ? (
            <Badge className="border-white/8 bg-slate-950/62 text-white/78">
              {getProductStatusLabel(product.status)}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Link href={`/produtos/${product.slug}`} className="block">
                <h2 className="text-2xl font-semibold leading-tight text-white transition hover:text-cyan-100">
                  {product.title}
                </h2>
              </Link>
              <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.18em] text-white/46">
                <span>{getProductCategoryLabel(product.category)}</span>
                <span>{getProductConditionLabel(product.condition)}</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-semibold text-white">
                {formatCurrencyFromCents(product.priceCents)}
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-white/42">{product.currency}</p>
            </div>
          </div>

          <p className="text-sm leading-7 text-white/64">{truncateText(product.description, 140)}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
          <div className="space-y-1 text-sm text-white/60">
            <p className="font-medium text-white/76">
              {product.seller?.fullName ?? product.seller?.username ?? 'Vendedor'}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-100/56" />
              {product.locationLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {product.isOwner ? (
              <Link
                href={`/produtos/${product.slug}/editar`}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/8"
              >
                <PencilLine className="mr-2 h-4 w-4" />
                Editar
              </Link>
            ) : (
              <FavoriteProductButton
                productId={product.id}
                isFavorite={product.isFavorite}
                isAuthenticated={isAuthenticated}
                path={path}
              />
            )}

            <Link
              href={`/produtos/${product.slug}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Ver detalhe
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}
