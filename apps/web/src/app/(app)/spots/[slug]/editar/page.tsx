import { notFound } from 'next/navigation'

import { SpotForm } from '@/components/forms/spot-form'
import { PageShell } from '@/components/layout/page-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { requireCurrentUser } from '@/features/auth/queries'
import { deleteSpotAction, updateSpotAction } from '@/features/spots/actions'
import { getEditableSpotBySlug, getSpotSports } from '@/features/spots/queries'

type EditSpotPageProps = {
  params: Promise<{ slug: string }>
}

export default async function EditSpotPage({ params }: EditSpotPageProps) {
  const user = await requireCurrentUser()
  const { slug } = await params
  const [spot, sports] = await Promise.all([
    getEditableSpotBySlug(slug, user.id),
    getSpotSports()
  ])

  if (!spot) {
    notFound()
  }

  return (
    <PageShell className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/72">
          Editar spot
        </p>
        <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white">
          Ajustar localizacao e contexto.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-white/66">
          Podes corrigir coordenadas, alterar a visibilidade e atualizar a galeria do spot.
        </p>
      </div>

      <Card className="max-w-6xl">
        <SpotForm
          sports={sports}
          action={updateSpotAction}
          submitLabel="Guardar alteracoes"
          mode="edit"
          defaultValues={spot}
        />
      </Card>

      <Card className="max-w-6xl space-y-4 border-rose-400/18">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-100/74">
            Remover spot
          </p>
          <p className="text-sm leading-7 text-white/62">
            Esta acao apaga o spot, os favoritos associados e a respetiva galeria do storage.
          </p>
        </div>

        <form action={deleteSpotAction}>
          <input type="hidden" name="spotId" value={spot.spotId} />
          <Button type="submit" variant="danger">
            Apagar spot
          </Button>
        </form>
      </Card>
    </PageShell>
  )
}
