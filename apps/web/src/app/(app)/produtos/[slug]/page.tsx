import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageShell } from '@/components/layout/page-shell'
import { ReportForm } from '@/components/forms/report-form'
import { MessageForm } from '@/components/messages/message-form'
import { FavoriteProductButton } from '@/components/marketplace/favorite-product-button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  getProductCategoryLabel,
  getProductConditionLabel,
  getProductStatusLabel
} from '@/features/marketplace/constants'
import { getCurrentUser } from '@/features/auth/queries'
import { getProductBySlug } from '@/features/marketplace/queries'
import { startConversationAction } from '@/features/messages/actions'
import { createProductReportAction } from '@/features/reports/actions'
import { formatCurrencyFromCents, formatDate } from '@/lib/utils'

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params
  const currentUser = await getCurrentUser()
  const product = await getProductBySlug(slug, currentUser?.id)

  if (!product) {
    notFound()
  }

  return (
    <PageShell className="space-y-8">
      <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {product.sport ? <Badge>{product.sport.name}</Badge> : null}
            <Badge className="border-white/8 bg-slate-950/62 text-white/78">
              {getProductCategoryLabel(product.category)}
            </Badge>
            <Badge className="border-white/8 bg-slate-950/62 text-white/78">
              {getProductConditionLabel(product.condition)}
            </Badge>
            {product.canEdit ? (
              <Badge className="border-white/8 bg-white/[0.04] text-white/78">
                {getProductStatusLabel(product.status)}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
              {product.title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-white/68">{product.description}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Vendedor
              </p>
              <p className="text-xl font-semibold text-white">
                {product.seller?.fullName ?? product.seller?.username ?? 'Perfil'}
              </p>
              {product.seller?.username ? (
                <Link
                  href={`/perfil/${product.seller.username}`}
                  className="text-sm text-cyan-100/76 transition hover:text-cyan-100"
                >
                  @{product.seller.username}
                </Link>
              ) : null}
            </Card>

            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Localizacao
              </p>
              <p className="text-xl font-semibold text-white">{product.locationLabel}</p>
              <p className="text-sm text-white/58">
                Publicado a {formatDate(product.createdAt)}
              </p>
            </Card>
          </div>
        </div>

        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
              Preco pedido
            </p>
            <p className="text-5xl font-semibold tracking-[-0.06em] text-white">
              {formatCurrencyFromCents(product.priceCents)}
            </p>
          </div>

          <div className="grid gap-3">
            {product.canEdit ? (
              <Link
                href={`/produtos/${product.slug}/editar`}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Editar anuncio
              </Link>
            ) : (
              <FavoriteProductButton
                productId={product.id}
                isFavorite={product.isFavorite}
                isAuthenticated={Boolean(currentUser)}
                path={`/produtos/${product.slug}`}
              />
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {product.images.length ? (
          product.images.map((image, index) => (
            <Card key={image.id} className="overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.publicUrl}
                alt={`${product.title} ${index + 1}`}
                className="aspect-square h-full w-full object-cover"
              />
            </Card>
          ))
        ) : (
          <Card className="xl:col-span-3">
            <p className="text-sm text-white/56">
              Este anuncio ainda nao tem imagens publicadas.
            </p>
          </Card>
        )}
      </section>

      {!product.canEdit ? (
        <section className="grid gap-5 xl:grid-cols-2">
          <Card className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Contactar vendedor
              </p>
              <h2 className="text-2xl font-semibold text-white">Mensagem interna simples</h2>
              <p className="text-sm leading-7 text-white/62">
                A conversa fica ligada a este anuncio e abre tambem na inbox.
              </p>
            </div>

            {currentUser ? (
              <MessageForm
                action={startConversationAction}
                hiddenFields={[{ name: 'productId', value: product.id }]}
                placeholder="Escreve uma mensagem curta para o vendedor."
                submitLabel="Enviar mensagem"
              />
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/8"
              >
                Entrar para contactar
              </Link>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/72">
                Moderacao basica
              </p>
              <h2 className="text-2xl font-semibold text-white">Denunciar anuncio</h2>
              <p className="text-sm leading-7 text-white/62">
                Usa esta opcao para sinalizar conteudo enganoso, inadequado ou suspeito.
              </p>
            </div>

            {currentUser ? (
              <ReportForm
                action={createProductReportAction}
                hiddenFields={[{ name: 'productId', value: product.id }]}
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
        </section>
      ) : null}
    </PageShell>
  )
}
