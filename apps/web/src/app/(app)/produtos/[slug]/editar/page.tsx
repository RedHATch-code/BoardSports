import { notFound } from 'next/navigation'

import { ProductForm } from '@/components/forms/product-form'
import { PageShell } from '@/components/layout/page-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { requireCurrentUser } from '@/features/auth/queries'
import {
  deleteProductAction,
  updateProductAction
} from '@/features/marketplace/actions'
import {
  getEditableProductBySlug,
  getMarketplaceSports
} from '@/features/marketplace/queries'

type EditProductPageProps = {
  params: Promise<{ slug: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const user = await requireCurrentUser()
  const { slug } = await params
  const [product, sports] = await Promise.all([
    getEditableProductBySlug(slug, user.id),
    getMarketplaceSports()
  ])

  if (!product) {
    notFound()
  }

  return (
    <PageShell className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
          Editar anuncio
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
          Atualizar material publicado.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/66">
          Mantem o anuncio atualizado, ajusta o estado do material e troca a galeria quando
          precisares.
        </p>
      </div>

      <Card className="max-w-5xl">
        <ProductForm
          sports={sports}
          action={updateProductAction}
          submitLabel="Guardar alteracoes"
          mode="edit"
          defaultValues={product}
        />
      </Card>

      <Card className="max-w-5xl space-y-4 border-rose-400/18">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-100/74">
            Remover anuncio
          </p>
          <p className="text-sm leading-7 text-white/62">
            Esta acao apaga o anuncio e a respetiva galeria do storage. Usa apenas quando
            quiseres remover o conteudo de forma permanente.
          </p>
        </div>

        <form action={deleteProductAction}>
          <input type="hidden" name="productId" value={product.productId} />
          <Button type="submit" variant="danger">
            Apagar anuncio
          </Button>
        </form>
      </Card>
    </PageShell>
  )
}
