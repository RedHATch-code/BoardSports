import { PageShell } from '@/components/layout/page-shell'
import { ProductForm } from '@/components/forms/product-form'
import { Card } from '@/components/ui/card'
import { requireCurrentUser } from '@/features/auth/queries'
import { createProductAction } from '@/features/marketplace/actions'
import { getMarketplaceSports } from '@/features/marketplace/queries'

export default async function NewProductPage() {
  await requireCurrentUser()
  const sports = await getMarketplaceSports()

  return (
    <PageShell className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
          Novo anuncio
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
          Publicar material no marketplace.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/66">
          Cria um anuncio claro, com preco, localizacao e imagens. O estado fica contigo:
          podes deixar em rascunho ou publicar logo.
        </p>
      </div>

      <Card className="max-w-5xl">
        <ProductForm
          sports={sports}
          action={createProductAction}
          submitLabel="Publicar anuncio"
          mode="create"
          defaultValues={{
            sportId: '',
            title: '',
            description: '',
            category: '',
            condition: '',
            priceEuros: '',
            locationLabel: '',
            status: 'active',
            images: []
          }}
        />
      </Card>
    </PageShell>
  )
}
